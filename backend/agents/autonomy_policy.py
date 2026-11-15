from __future__ import annotations

from datetime import datetime
import json
import secrets
import time
from typing import Any, Optional
from zoneinfo import ZoneInfo

from langgraph.types import interrupt

from backend.db.connection import ensure_agentic_auxiliary_tables, get_sqlite_conn, write_audit_log
from backend.schemas.models import SellvionAgentState


def generate_id(prefix: str) -> str:
    return f"{prefix}-{secrets.token_hex(4).upper()}"


def get_ist_hour() -> int:
    return datetime.now(ZoneInfo("Asia/Kolkata")).hour


def is_time_in_quiet_hours(start_hhmm: str, end_hhmm: str, current_hour: Optional[int] = None) -> bool:
    hour = current_hour if current_hour is not None else get_ist_hour()
    start_h = int((start_hhmm or "21:00").split(":")[0])
    end_h = int((end_hhmm or "09:00").split(":")[0])
    if start_h > end_h:
        return hour >= start_h or hour < end_h
    return start_h <= hour < end_h


def evaluate_policy_guard(
    *,
    business_id: str,
    customer_id: str,
    action_type: str,
    confidence: int,
    override_quiet_hours: bool = False,
    current_ist_hour: Optional[int] = None,
    db_path: Optional[str] = None,
) -> dict[str, Any]:
    """Enforce consent, opt-outs, emergency pause, 48h cap, quiet hours (9 PM-9 AM IST), and bounded autonomy."""
    with get_sqlite_conn(db_path) as conn:
        settings = conn.execute(
            "SELECT * FROM business_settings WHERE business_id = ?",
            (business_id,),
        ).fetchone()
        customer = conn.execute(
            "SELECT consent_whatsapp, opted_out FROM customers WHERE id = ? AND business_id = ?",
            (customer_id, business_id),
        ).fetchone()
        recent_row = conn.execute(
            """
            SELECT COUNT(*) AS cnt FROM message_history
            WHERE business_id = ? AND customer_id = ? AND direction = 'outbound'
              AND status IN ('sent', 'delivered', 'read', 'simulated')
              AND created_at >= datetime('now', '-48 hours')
            """,
            (business_id, customer_id),
        ).fetchone()

    blocked_reasons: list[str] = []
    consent_ok = bool(customer and customer["consent_whatsapp"] == 1)
    not_opted_out = bool(customer and customer["opted_out"] == 0)
    not_emergency_paused = not bool((settings or {}).get("emergency_pause_all"))
    max_msgs = int((settings or {}).get("max_daily_messages", 1))
    recent_count = int((recent_row or {}).get("cnt", 0))
    within_freq_cap = recent_count < max_msgs

    q_start = str((settings or {}).get("quiet_hours_start", "21:00"))
    q_end = str((settings or {}).get("quiet_hours_end", "09:00"))
    in_quiet = False if override_quiet_hours else is_time_in_quiet_hours(q_start, q_end, current_ist_hour)
    within_quiet_hours = not in_quiet

    if not consent_ok:
        blocked_reasons.append("Customer has not granted WhatsApp consent.")
    if not not_opted_out:
        blocked_reasons.append("Customer has opted out of messages.")
    if not not_emergency_paused:
        blocked_reasons.append("Emergency Pause All automation is active.")
    if not within_freq_cap:
        blocked_reasons.append(f"48-hour frequency cap ({max_msgs}) already reached for this customer.")
    if not within_quiet_hours:
        blocked_reasons.append(f"Currently in quiet hours ({q_start}–{q_end} IST).")

    autonomy_mode = "approval_required"
    if settings:
        if action_type == "reorder_reminder":
            autonomy_mode = str(settings["reorder_mode"])
        elif action_type in ("cod_prepay", "cod_verify"):
            autonomy_mode = str(settings["cod_prepay_mode"])
        elif action_type == "udhaar_reminder":
            autonomy_mode = str(settings["udhaar_mode"])
        elif action_type == "winback_offer":
            autonomy_mode = str(settings["winback_mode"])

    min_conf = int((settings or {}).get("min_confidence", 85))
    can_auto_execute = (
        autonomy_mode == "bounded_autonomous"
        and confidence >= min_conf
        and len(blocked_reasons) == 0
    )

    return {
        "allowed": consent_ok and not_opted_out and not_emergency_paused,
        "requiresApproval": not can_auto_execute,
        "blockedReasons": blocked_reasons,
        "checks": {
            "consentOk": consent_ok,
            "notOptedOut": not_opted_out,
            "notEmergencyPaused": not_emergency_paused,
            "withinFrequencyCap": within_freq_cap,
            "withinQuietHours": within_quiet_hours,
            "autonomyMode": autonomy_mode,
        },
    }


async def run_autonomy_policy_agent(state: SellvionAgentState) -> dict[str, Any]:
    """
    Agent 6: Enforces merchant safety rules, persists workflow & approval state,
    and invokes LangGraph interrupt() for Human-in-the-Loop authorization when required.
    """
    started = time.perf_counter()
    ensure_agentic_auxiliary_tables()

    business_id = state["business_id"]
    user_id = state.get("user_id")
    workflow_id = state["workflow_id"]
    thread_id = state.get("thread_id", workflow_id)
    mode = state.get("mode", "demo")
    is_demo = 1 if mode == "demo" else 0
    wf_type = state.get("workflow_type", "reactivation")
    customer = state.get("customer") or {}
    order = state.get("order")
    customer_id = str(customer["id"])
    action_type = state.get("action_type", "reorder_reminder")
    confidence = int(state.get("confidence", 88))
    title = state.get("action_title", f"Action for {customer.get('name', 'Customer')}")
    impact = state.get("potential_impact", "")
    draft_res = state.get("draft_result") or {}
    draft_text = str(draft_res.get("draft", ""))

    target_type = "order" if order else "customer"
    target_id = str(order["id"] if order else customer_id)

    policy = evaluate_policy_guard(
        business_id=business_id,
        customer_id=customer_id,
        action_type=action_type,
        confidence=confidence,
    )

    duration_ms = max(10, int((time.perf_counter() - started) * 1000))
    completed = list(state.get("completed_agents") or [])
    completed.append("autonomy_policy")
    traces = list(state.get("traces") or [])

    if not policy["allowed"]:
        fail_reason = f"Policy blocked execution: {' '.join(policy['blockedReasons'])}"
        traces.append(
            {
                "agent_id": "autonomy_policy",
                "agent_name": "Autonomy & Policy Agent",
                "step_order": len(traces) + 1,
                "status": "escalated",
                "reason": fail_reason,
                "confidence": 100,
                "duration_ms": duration_ms,
                "output": policy,
            }
        )
        with get_sqlite_conn() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO agent_workflows
                  (id, business_id, workflow_type, trigger_source, target_type, target_id, status, current_step, input_json, error_message, is_demo)
                VALUES (?, ?, ?, ?, ?, ?, 'escalated', 'policy_blocked', ?, ?, ?)
                """,
                (
                    workflow_id,
                    business_id,
                    wf_type,
                    state.get("trigger_source", "manual"),
                    target_type,
                    target_id,
                    json.dumps({"customerId": customer_id, "orderId": order["id"] if order else None}),
                    fail_reason,
                    is_demo,
                ),
            )
            for idx, tr_item in enumerate(traces, start=1):
                conn.execute(
                    """
                    INSERT INTO agent_tasks (id, workflow_id, business_id, agent_name, step_order, status, input_json, output_json, reason, confidence, duration_ms, completed_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                    """,
                    (
                        generate_id("TSK"),
                        workflow_id,
                        business_id,
                        tr_item["agent_name"],
                        idx,
                        tr_item["status"],
                        json.dumps({"customerId": customer_id}),
                        json.dumps(tr_item.get("output", {})),
                        tr_item["reason"],
                        tr_item.get("confidence"),
                        tr_item.get("duration_ms", 12),
                    ),
                )
        return {
            "policy_result": policy,
            "requires_approval": True,
            "status": "escalated",
            "current_step": "policy_blocked",
            "error_message": fail_reason,
            "final_message": fail_reason,
            "completed_agents": completed,
            "traces": traces,
            "next_agent": "complete",
        }

    requires_approval = bool(policy["requiresApproval"])
    guard_reason = (
        f"Consent verified. Queued for merchant approval ({policy['checks']['autonomyMode']})."
        + (f" Note: {' '.join(policy['blockedReasons'])}" if policy["blockedReasons"] else "")
        if requires_approval
        else "Consent, quiet hours, frequency cap, and confidence checks passed for bounded autonomy."
    )

    traces.append(
        {
            "agent_id": "autonomy_policy",
            "agent_name": "Autonomy & Policy Agent",
            "step_order": len(traces) + 1,
            "status": "completed",
            "reason": guard_reason,
            "confidence": 100,
            "duration_ms": duration_ms,
            "output": policy,
        }
    )

    with get_sqlite_conn() as conn:
        existing_thread = conn.execute(
            "SELECT approval_id FROM langgraph_threads WHERE thread_id = ? AND workflow_id = ?",
            (thread_id, workflow_id),
        ).fetchone()
        existing_wf = conn.execute(
            "SELECT id FROM agent_workflows WHERE id = ?",
            (workflow_id,),
        ).fetchone()

    if existing_thread and existing_thread.get("approval_id"):
        approval_id = str(existing_thread["approval_id"])
    else:
        approval_id = generate_id("ACT")
        if wf_type == "cod_protection" and state.get("cod_risk_result"):
            pred_reason = f"COD risk score {state['cod_risk_result']['score']}/100"
        elif wf_type == "udhaar_collection":
            pred_reason = f"Pending udhaar of ₹{int(round(float(customer.get('outstanding_udhaar', 0) or 0))):,}"
        else:
            pred_reason = (state.get("retention_strategy") or {}).get("rationale", "Customer workflow opportunity")

        with get_sqlite_conn() as conn:
            if not existing_wf:
                conn.execute(
                    """
                    INSERT INTO agent_workflows
                      (id, business_id, workflow_type, trigger_source, target_type, target_id, status, current_step, input_json, result_json, is_demo)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        workflow_id,
                        business_id,
                        wf_type,
                        state.get("trigger_source", "manual"),
                        target_type,
                        target_id,
                        "awaiting_approval" if requires_approval else "running",
                        "approval_checkpoint" if requires_approval else "act",
                        json.dumps({"customerId": customer_id, "orderId": order["id"] if order else None}),
                        json.dumps({"approvalId": approval_id, "threadId": thread_id}),
                        is_demo,
                    ),
                )
            for idx, tr_item in enumerate(traces, start=1):
                conn.execute(
                    """
                    INSERT INTO agent_tasks (id, workflow_id, business_id, agent_name, step_order, status, input_json, output_json, reason, confidence, duration_ms, completed_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                    """,
                    (
                        generate_id("TSK"),
                        workflow_id,
                        business_id,
                        tr_item["agent_name"],
                        idx,
                        tr_item["status"],
                        json.dumps({"actionType": action_type}),
                        json.dumps(tr_item.get("output", {})),
                        tr_item["reason"],
                        tr_item.get("confidence"),
                        tr_item.get("duration_ms", 12),
                    ),
                )
            conn.execute(
                """
                INSERT INTO approvals (
                  id, business_id, workflow_id, customer_id, order_id, action_type, title, reason,
                  agent_name, required_permission, confidence, potential_impact, suggested_message,
                  channel, status, metadata_json, is_demo
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'whatsapp_send', ?, ?, ?, 'WhatsApp', ?, ?, ?)
                """,
                (
                    approval_id,
                    business_id,
                    workflow_id,
                    customer_id,
                    order["id"] if order else None,
                    action_type,
                    title,
                    pred_reason,
                    "WhatsApp Communication Agent",
                    confidence,
                    impact,
                    draft_text,
                    "pending_approval" if requires_approval else "approved",
                    json.dumps(
                        {
                            "orderId": order["id"] if order else None,
                            "orderAmount": order.get("total_amount") if order else None,
                            "udhaarAmount": customer.get("outstanding_udhaar", 0),
                            "productName": customer.get("last_product_ordered", ""),
                            "langgraphThreadId": thread_id,
                        }
                    ),
                    is_demo,
                ),
            )
            conn.execute(
                """
                INSERT OR REPLACE INTO langgraph_threads (thread_id, workflow_id, business_id, approval_id, status)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    thread_id,
                    workflow_id,
                    business_id,
                    approval_id,
                    "awaiting_approval" if requires_approval else "running",
                ),
            )
            if requires_approval:
                write_audit_log(
                    conn,
                    audit_id=generate_id("AUD"),
                    business_id=business_id,
                    user_id=user_id,
                    actor_type="agent",
                    action="workflow_awaiting_approval",
                    entity_type="workflow",
                    entity_id=workflow_id,
                    details={"approvalId": approval_id, "actionType": action_type, "customerId": customer_id, "threadId": thread_id},
                )

    if requires_approval:
        # Genuine LangGraph Human-in-the-Loop interrupt checkpoint!
        human_decision = interrupt(
            {
                "approval_id": approval_id,
                "workflow_id": workflow_id,
                "action_type": action_type,
                "title": title,
                "customer_name": customer.get("name"),
                "suggested_message": draft_text,
            }
        )
        return {
            "policy_result": policy,
            "approval_id": approval_id,
            "requires_approval": True,
            "human_decision": human_decision if isinstance(human_decision, dict) else {"decision": str(human_decision)},
            "completed_agents": completed,
            "traces": traces,
            "next_agent": "analytics_roi",
        }

    return {
        "policy_result": policy,
        "approval_id": approval_id,
        "requires_approval": False,
        "human_decision": {"decision": "approve", "overrideQuietHours": False},
        "completed_agents": completed,
        "traces": traces,
        "next_agent": "analytics_roi",
    }
