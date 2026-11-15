from __future__ import annotations

import json
import secrets
import time
from typing import Any, Optional

from backend.agents.autonomy_policy import evaluate_policy_guard
from backend.db.connection import get_sqlite_conn, write_audit_log
from backend.llm.provider import llm_provider
from backend.prompts.templates import COPILOT_ANALYSIS_PROMPT
from backend.schemas.models import SellvionAgentState


def _gen_id(prefix: str) -> str:
    return f"{prefix}-{secrets.token_hex(4).upper()}"


def _decrypt_express_credentials(ciphertext: str) -> Optional[dict[str, Any]]:
    if not ciphertext:
        return None
    try:
        import base64
        import hashlib
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        from backend.config.settings import get_settings

        parts = ciphertext.split(".")
        if len(parts) != 3:
            return None
        iv = base64.b64decode(parts[0])
        auth_tag = base64.b64decode(parts[1])
        encrypted = base64.b64decode(parts[2])
        secret = get_settings().session_secret
        key = hashlib.sha256(secret.encode("utf-8")).digest()
        decrypted = AESGCM(key).decrypt(iv, encrypted + auth_tag, None)
        return json.loads(decrypted.decode("utf-8"))
    except Exception:
        return None


def compute_analytics_summary(
    *,
    business_id: str,
    mode: str = "demo",
    range_key: str = "30d",
    db_path: Optional[str] = None,
) -> dict[str, Any]:
    """Exact DB-backed ROI, Holdout Cohort A/B comparison, and Funnel summary (1:1 frontend schema compatibility)."""
    days = 7 if range_key == "7d" else 90 if range_key == "90d" else 3650 if range_key == "all" else 30
    cutoff_clause = "" if range_key == "all" else f"AND ordered_at >= date('now', '-{days} days')"

    with get_sqlite_conn(db_path) as conn:
        customer_count = int(
            (conn.execute("SELECT COUNT(*) AS cnt FROM customers WHERE business_id = ?", (business_id,)).fetchone() or {}).get("cnt", 0)
        )
        due_reorder_count = int(
            (
                conn.execute(
                    """
                    SELECT COUNT(*) AS cnt FROM customers
                    WHERE business_id = ?
                      AND (segment IN ('reorder_due', 'inactive') OR days_since_last_order >= average_cadence_days)
                    """,
                    (business_id,),
                ).fetchone()
                or {}
            ).get("cnt", 0)
        )
        order_agg = (
            conn.execute(
                f"""
                SELECT COUNT(*) AS total_orders,
                       COALESCE(SUM(total_amount), 0) AS gross_revenue,
                       COALESCE(SUM(CASE WHEN status = 'Delivered' THEN total_amount ELSE 0 END), 0) AS delivered_revenue,
                       SUM(CASE WHEN payment_mode = 'COD' THEN 1 ELSE 0 END) AS cod_orders,
                       SUM(CASE WHEN payment_mode = 'COD' AND status = 'Pending_Verification' THEN 1 ELSE 0 END) AS flagged_cod_orders,
                       COALESCE(SUM(CASE WHEN payment_mode = 'COD' AND status = 'Pending_Verification' THEN total_amount ELSE 0 END), 0) AS flagged_cod_value,
                       SUM(CASE WHEN payment_mode = 'COD' AND status = 'RTO_Returned' THEN 1 ELSE 0 END) AS rto_orders
                FROM orders WHERE business_id = ? {cutoff_clause}
                """,
                (business_id,),
            ).fetchone()
            or {}
        )
        udhaar_agg = (
            conn.execute(
                """
                SELECT COALESCE(SUM(outstanding_udhaar), 0) AS pending_udhaar,
                       COUNT(CASE WHEN outstanding_udhaar > 0 THEN 1 END) AS pending_accounts
                FROM customers WHERE business_id = ?
                """,
                (business_id,),
            ).fetchone()
            or {}
        )
        collected_agg = (
            conn.execute(
                "SELECT COALESCE(SUM(amount), 0) AS total_collected, COUNT(*) AS payment_count FROM payments WHERE business_id = ? AND status = 'captured'",
                (business_id,),
            ).fetchone()
            or {}
        )
        approval_agg = (
            conn.execute(
                """
                SELECT COUNT(CASE WHEN status = 'pending_approval' THEN 1 END) AS pending_approvals,
                       COUNT(CASE WHEN status = 'executed' THEN 1 END) AS executed_approvals,
                       COUNT(CASE WHEN status = 'failed' THEN 1 END) AS failed_approvals
                FROM approvals WHERE business_id = ?
                """,
                (business_id,),
            ).fetchone()
            or {}
        )
        engaged_cohort = (
            conn.execute(
                """
                SELECT COUNT(DISTINCT c.id) AS customers,
                       COALESCE(SUM(CASE WHEN e.event_type = 'repeat_order_observed' THEN e.amount ELSE 0 END), 0) AS revenue
                FROM customers c
                LEFT JOIN analytics_events e ON e.customer_id = c.id AND e.business_id = c.business_id
                WHERE c.business_id = ? AND c.holdout_group = 0
                """,
                (business_id,),
            ).fetchone()
            or {}
        )
        holdout_cohort = (
            conn.execute(
                """
                SELECT COUNT(DISTINCT c.id) AS customers,
                       COALESCE(SUM(CASE WHEN e.event_type = 'holdout_order_observed' THEN e.amount ELSE 0 END), 0) AS revenue
                FROM customers c
                LEFT JOIN analytics_events e ON e.customer_id = c.id AND e.business_id = c.business_id
                WHERE c.business_id = ? AND c.holdout_group = 1
                """,
                (business_id,),
            ).fetchone()
            or {}
        )
        order_trend = conn.execute(
            f"""
            SELECT date, orders, revenue FROM (
              SELECT ordered_at AS date, COUNT(*) AS orders, COALESCE(SUM(total_amount), 0) AS revenue
              FROM orders WHERE business_id = ? {cutoff_clause}
              GROUP BY ordered_at ORDER BY ordered_at DESC LIMIT 14
            ) ORDER BY date ASC
            """,
            (business_id,),
        ).fetchall()
        payment_rows = conn.execute(
            f"SELECT payment_mode, COUNT(*) AS cnt FROM orders WHERE business_id = ? {cutoff_clause} GROUP BY payment_mode",
            (business_id,),
        ).fetchall()
        status_rows = conn.execute(
            f"SELECT status, COUNT(*) AS cnt FROM orders WHERE business_id = ? {cutoff_clause} GROUP BY status",
            (business_id,),
        ).fetchall()
        app_status_rows = conn.execute(
            "SELECT status, COUNT(*) AS cnt FROM approvals WHERE business_id = ? GROUP BY status",
            (business_id,),
        ).fetchall()
        seg_rows = conn.execute(
            "SELECT segment, COUNT(*) AS cnt FROM customers WHERE business_id = ? GROUP BY segment",
            (business_id,),
        ).fetchall()
        msg_counts = (
            conn.execute(
                """
                SELECT COUNT(CASE WHEN direction = 'outbound' AND status IN ('sent', 'delivered', 'read', 'simulated') THEN 1 END) AS outbound_sent,
                       COUNT(CASE WHEN direction = 'inbound' THEN 1 END) AS inbound_replies
                FROM message_history WHERE business_id = ?
                """,
                (business_id,),
            ).fetchone()
            or {}
        )
        drafts_prepared = int(
            (conn.execute("SELECT COUNT(*) AS cnt FROM approvals WHERE business_id = ?", (business_id,)).fetchone() or {}).get("cnt", 0)
        )
        recovery_agg = (
            conn.execute(
                """
                SELECT COUNT(DISTINCT CASE WHEN event_type = 'repeat_order_observed' THEN customer_id END) AS customers_recovered,
                       COUNT(CASE WHEN event_type = 'repeat_order_observed' THEN 1 END) AS repeat_purchases,
                       COALESCE(SUM(CASE WHEN event_type = 'repeat_order_observed' THEN amount ELSE 0 END), 0) AS repeat_purchase_revenue,
                       COUNT(CASE WHEN event_type IN ('repeat_order_observed', 'udhaar_collected') THEN 1 END) AS conversions_observed
                FROM analytics_events WHERE business_id = ?
                """,
                (business_id,),
            ).fetchone()
            or {}
        )
        wf_health = (
            conn.execute(
                """
                SELECT COUNT(CASE WHEN status = 'escalated' THEN 1 END) AS escalated_workflows,
                       ROUND(AVG(CASE WHEN status = 'completed' THEN MAX(0, (julianday(updated_at) - julianday(created_at)) * 1440) END), 1) AS avg_resolution_minutes
                FROM agent_workflows WHERE business_id = ?
                """,
                (business_id,),
            ).fetchone()
            or {}
        )

    pay_map = {str(r["payment_mode"]): int(r["cnt"] or 0) for r in payment_rows}
    st_map = {str(r["status"]): int(r["cnt"] or 0) for r in status_rows}
    app_map = {str(r["status"]): int(r["cnt"] or 0) for r in app_status_rows}
    seg_map = {str(r["segment"]): int(r["cnt"] or 0) for r in seg_rows}
    human_escalations = int(wf_health.get("escalated_workflows") or 0) + int(app_map.get("escalated") or 0)

    return {
        "mode": mode,
        "range": range_key,
        "actualObserved": {
            "totalCustomers": customer_count,
            "totalOrders": int(order_agg.get("total_orders") or 0),
            "grossRevenue": float(order_agg.get("gross_revenue") or 0),
            "deliveredRevenue": float(order_agg.get("delivered_revenue") or 0),
            "codOrders": int(order_agg.get("cod_orders") or 0),
            "codDeliveredCount": int(st_map.get("Delivered") or 0),
            "rtoOrders": int(order_agg.get("rto_orders") or 0),
            "collectedPayments": float(collected_agg.get("total_collected") or 0),
            "collectedPaymentCount": int(collected_agg.get("payment_count") or 0),
            "executedActions": int(approval_agg.get("executed_approvals") or 0),
            "failedActions": int(approval_agg.get("failed_approvals") or 0),
            "customersRecovered": int(recovery_agg.get("customers_recovered") or 0),
            "repeatPurchases": int(recovery_agg.get("repeat_purchases") or 0),
            "repeatPurchaseRevenue": float(recovery_agg.get("repeat_purchase_revenue") or 0),
            "messagesDelivered": int(msg_counts.get("outbound_sent") or 0),
            "humanEscalations": human_escalations,
            "avgResolutionMinutes": float(wf_health.get("avg_resolution_minutes") or 0),
        },
        "opportunities": {
            "dueForReorderCount": due_reorder_count,
            "flaggedCodOrders": int(order_agg.get("flagged_cod_orders") or 0),
            "flaggedCodExposureInr": float(order_agg.get("flagged_cod_value") or 0),
            "pendingUdhaarInr": float(udhaar_agg.get("pending_udhaar") or 0),
            "pendingUdhaarAccounts": int(udhaar_agg.get("pending_accounts") or 0),
            "pendingApprovals": int(approval_agg.get("pending_approvals") or 0),
        },
        "cohorts": {
            "engagedCustomers": int(engaged_cohort.get("customers") or 0),
            "engagedObservedRevenue": float(engaged_cohort.get("revenue") or 0),
            "holdoutCustomers": int(holdout_cohort.get("customers") or 0),
            "holdoutObservedRevenue": float(holdout_cohort.get("revenue") or 0),
        },
        "funnel": {
            "customersTracked": customer_count,
            "dueForFollowUp": due_reorder_count + int(udhaar_agg.get("pending_accounts") or 0),
            "draftsPrepared": drafts_prepared,
            "messagesDispatched": int(msg_counts.get("outbound_sent") or 0),
            "repliesReceived": int(msg_counts.get("inbound_replies") or 0),
            "conversionsObserved": int(recovery_agg.get("conversions_observed") or 0),
        },
        "paymentBreakdown": {
            "cod": int(pay_map.get("COD") or 0),
            "prepaidUpi": int(pay_map.get("Prepaid_UPI") or 0),
            "prepaidCard": int(pay_map.get("Prepaid_Card") or 0),
            "udhaar": int(pay_map.get("Udhaar") or 0),
        },
        "orderStatusBreakdown": {
            "pendingVerification": int(st_map.get("Pending_Verification") or 0),
            "inTransit": int(st_map.get("In_Transit") or 0),
            "delivered": int(st_map.get("Delivered") or 0),
            "rtoReturned": int(st_map.get("RTO_Returned") or 0),
        },
        "approvalBreakdown": {
            "needsApproval": int(app_map.get("pending_approval") or 0),
            "completed": int(app_map.get("executed") or 0) + int(app_map.get("approved") or 0),
            "scheduled": int(app_map.get("scheduled") or 0) + int(app_map.get("snoozed") or 0),
            "issues": int(app_map.get("failed") or 0) + int(app_map.get("escalated") or 0) + int(app_map.get("rejected") or 0),
        },
        "customerSegments": seg_map,
        "orderTrend": order_trend,
    }


async def execute_approved_action_db(
    *,
    business_id: str,
    approval_id: str,
    user_id: Optional[str],
    mode: str,
    override_quiet_hours: bool = True,
    db_path: Optional[str] = None,
) -> dict[str, Any]:
    """Execute an approved action (WhatsApp simulated in Demo Mode or real provider dispatch when configured) & log analytics."""
    with get_sqlite_conn(db_path) as conn:
        approval = conn.execute(
            """
            SELECT a.*, c.phone, c.name AS customer_name, c.holdout_group
            FROM approvals a
            JOIN customers c ON c.id = a.customer_id
            WHERE a.id = ? AND a.business_id = ?
            """,
            (approval_id, business_id),
        ).fetchone()

    if not approval:
        return {"ok": False, "status": "failed", "message": "Approval record not found."}

    if approval["status"] == "executed":
        return {
            "ok": True,
            "status": "executed",
            "alreadyExecuted": True,
            "message": f"Action for {approval['customer_name']} was already executed.",
        }

    policy = evaluate_policy_guard(
        business_id=business_id,
        customer_id=str(approval["customer_id"]),
        action_type=str(approval["action_type"]),
        confidence=int(approval.get("confidence") or 80),
        override_quiet_hours=override_quiet_hours,
        db_path=db_path,
    )

    if not policy["allowed"]:
        with get_sqlite_conn(db_path) as conn:
            conn.execute(
                "UPDATE approvals SET status = 'escalated', updated_at = datetime('now') WHERE id = ?",
                (approval["id"],),
            )
        return {
            "ok": False,
            "status": "escalated",
            "message": f"Policy guard blocked dispatch: {' '.join(policy['blockedReasons'])}",
        }

    is_demo = 1 if mode == "demo" else 0
    provider_msg_id = ""
    send_status = "simulated"
    send_error = ""
    send_ok = True

    if mode == "demo":
        provider_msg_id = _gen_id("SIM-WA")
        send_status = "simulated"
    else:
        with get_sqlite_conn(db_path) as conn:
            acc = conn.execute(
                "SELECT status, encrypted_credentials FROM integration_accounts WHERE business_id = ? AND provider = 'whatsapp'",
                (business_id,),
            ).fetchone()
        if not acc or acc.get("status") != "connected" or not acc.get("encrypted_credentials"):
            send_ok = False
            send_status = "failed"
            send_error = "WhatsApp Cloud API is not connected. Configure and verify WhatsApp credentials in Integrations first."
        else:
            creds = _decrypt_express_credentials(str(acc["encrypted_credentials"]))
            if not creds or not creds.get("phoneNumberId") or not creds.get("accessToken"):
                send_ok = False
                send_status = "failed"
                send_error = "Stored WhatsApp credentials could not be decrypted."
            else:
                import re
                import httpx

                normalized_phone = re.sub(r"[^\d]", "", str(approval.get("phone") or ""))
                try:
                    async with httpx.AsyncClient(timeout=7.0) as client:
                        resp = await client.post(
                            f"https://graph.facebook.com/v20.0/{creds['phoneNumberId']}/messages",
                            headers={
                                "Authorization": f"Bearer {creds['accessToken']}",
                                "Content-Type": "application/json",
                            },
                            json={
                                "messaging_product": "whatsapp",
                                "to": normalized_phone,
                                "type": "text",
                                "text": {"body": str(approval["suggested_message"])},
                            },
                        )
                        data = resp.json()
                    if resp.is_success:
                        send_ok = True
                        send_status = "sent"
                        msgs = data.get("messages") or [{}]
                        provider_msg_id = str((msgs[0] or {}).get("id") or _gen_id("WAMID"))
                    else:
                        send_ok = False
                        send_status = "failed"
                        send_error = str((data.get("error") or {}).get("message") or f"WhatsApp Cloud API returned HTTP {resp.status_code}")
                except Exception as exc:
                    send_ok = False
                    send_status = "failed"
                    send_error = str(exc)

    with get_sqlite_conn(db_path) as conn:
        conn.execute(
            """
            INSERT INTO message_history (id, business_id, customer_id, approval_id, channel, direction, body, status, provider_message_id, error_message, is_demo)
            VALUES (?, ?, ?, ?, 'WhatsApp', 'outbound', ?, ?, ?, ?, ?)
            """,
            (
                _gen_id("MSG"),
                business_id,
                approval["customer_id"],
                approval["id"],
                approval["suggested_message"],
                send_status,
                provider_msg_id,
                send_error,
                is_demo,
            ),
        )

        if approval.get("workflow_id"):
            conn.execute(
                """
                INSERT INTO agent_tasks (id, workflow_id, business_id, agent_name, step_order, status, input_json, output_json, reason, duration_ms, error_message, completed_at)
                VALUES (?, ?, ?, 'Analytics & ROI Agent', 6, ?, ?, ?, ?, 42, ?, datetime('now'))
                """,
                (
                    _gen_id("TSK"),
                    approval["workflow_id"],
                    business_id,
                    "completed" if send_ok else "failed",
                    json.dumps({"approvalId": approval["id"], "channel": "WhatsApp"}),
                    json.dumps({"ok": send_ok, "status": send_status, "providerMessageId": provider_msg_id, "error": send_error}),
                    f"Dispatched ({send_status}) & recorded ROI attribution telemetry." if send_ok else (send_error or "Dispatch failed"),
                    send_error,
                ),
            )
            conn.execute(
                "UPDATE agent_workflows SET status = ?, current_step = ?, error_message = ?, updated_at = datetime('now') WHERE id = ?",
                (
                    "completed" if send_ok else "failed",
                    "measure" if send_ok else "execution_failed",
                    send_error,
                    approval["workflow_id"],
                ),
            )

        if not send_ok:
            conn.execute(
                "UPDATE approvals SET status = 'failed', updated_at = datetime('now') WHERE id = ?",
                (approval["id"],),
            )
            conn.execute(
                "UPDATE langgraph_threads SET status = 'failed', updated_at = datetime('now') WHERE approval_id = ?",
                (approval["id"],),
            )
            write_audit_log(
                conn,
                audit_id=_gen_id("AUD"),
                business_id=business_id,
                user_id=user_id,
                actor_type="agent",
                action="action_execution_failed",
                entity_type="approval",
                entity_id=str(approval["id"]),
                details={"error": send_error},
            )
            return {"ok": False, "status": "failed", "message": send_error or "Provider execution failed."}

        conn.execute(
            "UPDATE approvals SET status = 'executed', updated_at = datetime('now') WHERE id = ?",
            (approval["id"],),
        )
        conn.execute(
            "UPDATE langgraph_threads SET status = 'completed', updated_at = datetime('now') WHERE approval_id = ?",
            (approval["id"],),
        )
        conn.execute(
            """
            INSERT INTO analytics_events (id, business_id, event_type, customer_id, order_id, amount, holdout_group, metadata_json, is_demo)
            VALUES (?, ?, 'action_executed', ?, ?, 0, ?, ?, ?)
            """,
            (
                _gen_id("EVT"),
                business_id,
                approval["customer_id"],
                approval.get("order_id"),
                int(approval.get("holdout_group") or 0),
                json.dumps({"actionType": approval["action_type"], "mode": mode}),
                is_demo,
            ),
        )
        write_audit_log(
            conn,
            audit_id=_gen_id("AUD"),
            business_id=business_id,
            user_id=user_id,
            actor_type="merchant",
            action="action_approved_and_executed",
            entity_type="approval",
            entity_id=str(approval["id"]),
            details={"messageStatus": send_status, "providerMessageId": provider_msg_id},
        )

    msg_out = (
        f"Demo Mode: Simulated WhatsApp dispatch to {approval['customer_name']} recorded."
        if mode == "demo"
        else f"Sent WhatsApp message to {approval['customer_name']} ({provider_msg_id})."
    )
    return {"ok": True, "status": "executed", "message": msg_out}


async def generate_copilot_reply(
    *,
    business_id: str,
    query: str,
    context: dict[str, Any],
    language: str = "en",
) -> dict[str, Any]:
    """Generate store-grounded Q&A via LangChain + Gemini Flash with deterministic fallback."""
    due_reorders = context.get("dueForReorder", [])
    high_risk = context.get("highRiskOrders", [])
    overdue_udhaar = context.get("overdueUdhaar", [])
    total_udhaar = sum(float(item.get("amount", 0) or 0) for item in overdue_udhaar)
    cust_count = int(context.get("totalCustomers", 0))

    q_lower = query.lower()
    if "udhaar" in q_lower or "overdue" in q_lower:
        fallback = (
            f"You have {len(overdue_udhaar)} customer(s) with pending udhaar totalling ₹{int(round(total_udhaar)):,}. You can review or prepare polite reminders in Udhaar & Collections."
            if overdue_udhaar
            else "There are currently zero overdue udhaar balances in your store records."
        )
    elif "cod" in q_lower or "risk" in q_lower:
        fallback = (
            f"{len(high_risk)} COD order(s) are currently flagged for verification before dispatch. Open COD RTO Protection to inspect the reasons and verify addresses."
            if high_risk
            else "No high-risk COD orders are currently flagged."
        )
    else:
        fallback = f"Store Summary ({cust_count} customers): {len(due_reorders)} customer(s) are in their reorder window, {len(high_risk)} COD order(s) need verification, and {len(overdue_udhaar)} udhaar account(s) have ₹{int(round(total_udhaar)):,} pending."

    if not llm_provider.is_configured:
        return {"reply": fallback, "model": "rule-summary", "isAiGenerated": False}

    text, model_used = await llm_provider.invoke_prompt_text(
        COPILOT_ANALYSIS_PROMPT,
        {
            "language_name": "Hindi" if language == "hi" else "simple everyday English",
            "store_context": json.dumps(context, default=str),
            "query": query,
        },
    )
    if text:
        return {"reply": text, "model": model_used, "isAiGenerated": True}
    return {"reply": fallback, "model": "rule-summary", "isAiGenerated": False}


async def run_analytics_roi_agent(state: SellvionAgentState) -> dict[str, Any]:
    """Agent 7: Executes approved decisions, analyzes cohort ROI lift, or answers store Q&A."""
    started = time.perf_counter()
    business_id = state["business_id"]
    wf_type = state.get("workflow_type", "reactivation")
    completed = list(state.get("completed_agents") or [])
    completed.append("analytics_roi")
    traces = list(state.get("traces") or [])

    if wf_type in ("copilot_qa", "analytics_roi"):
        summary = compute_analytics_summary(business_id=business_id, mode=state.get("mode", "demo"))
        reply = None
        if state.get("user_query"):
            with get_sqlite_conn() as conn:
                custs = conn.execute(
                    "SELECT name, city, segment, last_product_ordered, days_since_last_order, average_cadence_days, outstanding_udhaar "
                    "FROM customers WHERE business_id = ? LIMIT 30",
                    (business_id,),
                ).fetchall()
                risky = conn.execute(
                    "SELECT order_number, total_amount, cod_risk_score, status FROM orders "
                    "WHERE business_id = ? AND payment_mode = 'COD' AND cod_risk_score >= 50",
                    (business_id,),
                ).fetchall()
            ctx = {
                "mode": state.get("mode", "demo"),
                "totalCustomers": len(custs),
                "dueForReorder": [c for c in custs if c["segment"] == "reorder_due" or c["days_since_last_order"] >= c["average_cadence_days"]],
                "overdueUdhaar": [{"name": c["name"], "city": c["city"], "amount": c["outstanding_udhaar"]} for c in custs if float(c["outstanding_udhaar"] or 0) > 0],
                "highRiskOrders": risky,
                "semanticMatches": (state.get("customer_360_insight") or {}).get("similar_profiles", []),
            }
            q_res = await generate_copilot_reply(
                business_id=business_id,
                query=str(state["user_query"]),
                context=ctx,
                language=state.get("language", "en"),
            )
            reply = q_res["reply"]

        duration_ms = max(8, int((time.perf_counter() - started) * 1000))
        traces.append(
            {
                "agent_id": "analytics_roi",
                "agent_name": "Analytics & ROI Agent",
                "step_order": len(traces) + 1,
                "status": "completed",
                "reason": "Computed store ROI, holdout A/B cohort lift, and verified metrics.",
                "confidence": 96,
                "duration_ms": duration_ms,
                "output": summary["actualObserved"],
            }
        )
        return {
            "roi_result": summary,
            "copilot_reply": reply,
            "status": "completed",
            "current_step": "measure",
            "final_message": reply or "Analytics and holdout ROI comparison completed.",
            "completed_agents": completed,
            "traces": traces,
            "next_agent": "complete",
        }

    # Workflow execution after approval or bounded autonomy
    approval_id = state.get("approval_id")
    human_decision = state.get("human_decision") or {"decision": "approve"}
    decision = str(human_decision.get("decision", "approve"))

    if not approval_id:
        return {
            "status": "completed",
            "current_step": "measure",
            "completed_agents": completed,
            "traces": traces,
            "next_agent": "complete",
        }

    if decision == "reject":
        reason = str(human_decision.get("reason") or "Dismissed by merchant")
        with get_sqlite_conn() as conn:
            conn.execute(
                "UPDATE approvals SET status = 'rejected', updated_at = datetime('now') WHERE id = ?",
                (approval_id,),
            )
            conn.execute(
                "UPDATE agent_workflows SET status = 'completed', current_step = 'rejected_by_merchant', updated_at = datetime('now') WHERE id = ?",
                (state["workflow_id"],),
            )
            conn.execute(
                "UPDATE langgraph_threads SET status = 'completed', updated_at = datetime('now') WHERE approval_id = ?",
                (approval_id,),
            )
            write_audit_log(
                conn,
                audit_id=_gen_id("AUD"),
                business_id=business_id,
                user_id=state.get("user_id"),
                actor_type="merchant",
                action="approval_rejected",
                entity_type="approval",
                entity_id=approval_id,
                details={"reason": reason},
            )
        return {
            "execution_result": {"ok": True, "status": "rejected", "message": "Action rejected and logged."},
            "status": "completed",
            "current_step": "rejected_by_merchant",
            "final_message": "Action rejected and logged.",
            "completed_agents": completed,
            "traces": traces,
            "next_agent": "complete",
        }

    exec_res = await execute_approved_action_db(
        business_id=business_id,
        approval_id=approval_id,
        user_id=state.get("user_id"),
        mode=state.get("mode", "demo"),
        override_quiet_hours=bool(human_decision.get("overrideQuietHours", True)),
    )
    roi_snap = compute_analytics_summary(business_id=business_id, mode=state.get("mode", "demo"))
    traces.append(
        {
            "agent_id": "analytics_roi",
            "agent_name": "Analytics & ROI Agent",
            "step_order": len(traces) + 1,
            "status": "completed" if exec_res["ok"] else "failed",
            "reason": exec_res["message"],
            "confidence": 100,
            "duration_ms": max(8, int((time.perf_counter() - started) * 1000)),
            "output": {"execution": exec_res, "executedActions": roi_snap["actualObserved"]["executedActions"]},
        }
    )

    return {
        "execution_result": exec_res,
        "roi_result": roi_snap,
        "status": "completed" if exec_res["ok"] else "failed",
        "current_step": "measure" if exec_res["ok"] else "execution_failed",
        "final_message": exec_res["message"],
        "completed_agents": completed,
        "traces": traces,
        "next_agent": "complete",
    }
