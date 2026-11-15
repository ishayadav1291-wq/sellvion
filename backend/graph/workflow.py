from __future__ import annotations

import json
import secrets
from typing import Any, Optional

from langgraph.graph import END, START, StateGraph
from langgraph.types import Command

from backend.agents.analytics_roi import run_analytics_roi_agent
from backend.agents.autonomy_policy import run_autonomy_policy_agent
from backend.agents.cod_risk import run_cod_risk_intelligence_agent
from backend.agents.customer_intelligence import run_customer_intelligence_agent
from backend.agents.marketing_retention import run_marketing_retention_agent
from backend.agents.supervisor import run_supervisor_router
from backend.agents.udhaar_management import run_udhaar_management_agent
from backend.agents.whatsapp_communication import run_whatsapp_communication_agent
from backend.config.settings import get_settings
from backend.db.connection import (
    ensure_agentic_auxiliary_tables,
    get_langgraph_checkpointer,
    get_sqlite_conn,
)
from backend.schemas.models import SellvionAgentState


def _gen_id(prefix: str) -> str:
    return f"{prefix}-{secrets.token_hex(4).upper()}"


def _route_next(state: SellvionAgentState) -> str:
    target = state.get("next_agent", "complete")
    if target in (
        "customer_intelligence",
        "cod_risk_intelligence",
        "udhaar_management",
        "marketing_retention",
        "whatsapp_communication",
        "autonomy_policy",
        "analytics_roi",
    ):
        return target
    return END


def build_sellvion_graph(checkpointer: Any = None):
    """Assemble and compile the typed LangGraph multi-agent workflow with conditional routing."""
    builder = StateGraph(SellvionAgentState)

    builder.add_node("supervisor", run_supervisor_router)
    builder.add_node("customer_intelligence", run_customer_intelligence_agent)
    builder.add_node("cod_risk_intelligence", run_cod_risk_intelligence_agent)
    builder.add_node("udhaar_management", run_udhaar_management_agent)
    builder.add_node("marketing_retention", run_marketing_retention_agent)
    builder.add_node("whatsapp_communication", run_whatsapp_communication_agent)
    builder.add_node("autonomy_policy", run_autonomy_policy_agent)
    builder.add_node("analytics_roi", run_analytics_roi_agent)

    builder.add_edge(START, "supervisor")

    route_map = {
        "customer_intelligence": "customer_intelligence",
        "cod_risk_intelligence": "cod_risk_intelligence",
        "udhaar_management": "udhaar_management",
        "marketing_retention": "marketing_retention",
        "whatsapp_communication": "whatsapp_communication",
        "autonomy_policy": "autonomy_policy",
        "analytics_roi": "analytics_roi",
        END: END,
    }

    builder.add_conditional_edges("supervisor", _route_next, route_map)
    builder.add_conditional_edges("customer_intelligence", _route_next, route_map)
    builder.add_conditional_edges("cod_risk_intelligence", _route_next, route_map)
    builder.add_conditional_edges("udhaar_management", _route_next, route_map)
    builder.add_conditional_edges("marketing_retention", _route_next, route_map)
    builder.add_conditional_edges("whatsapp_communication", _route_next, route_map)
    builder.add_conditional_edges("autonomy_policy", _route_next, route_map)
    builder.add_edge("analytics_roi", END)

    return builder.compile(checkpointer=checkpointer)


def _find_dedup_target(
    *,
    business_id: str,
    workflow_type: str,
    target_customer_id: Optional[str],
    target_order_id: Optional[str],
    db_path: Optional[str] = None,
) -> Optional[str]:
    with get_sqlite_conn(db_path) as conn:
        if target_order_id:
            return target_order_id
        if target_customer_id:
            return target_customer_id
        if workflow_type == "cod_protection":
            row = conn.execute(
                """
                SELECT id FROM orders
                WHERE business_id = ? AND payment_mode = 'COD' AND status = 'Pending_Verification'
                ORDER BY cod_risk_score DESC LIMIT 1
                """,
                (business_id,),
            ).fetchone()
            return str(row["id"]) if row else None
        if workflow_type == "udhaar_collection":
            row = conn.execute(
                """
                SELECT id FROM customers
                WHERE business_id = ? AND outstanding_udhaar > 0
                ORDER BY outstanding_udhaar DESC LIMIT 1
                """,
                (business_id,),
            ).fetchone()
            return str(row["id"]) if row else None
        row = conn.execute(
            """
            SELECT id FROM customers
            WHERE business_id = ?
              AND (segment IN ('reorder_due', 'inactive', 'at_risk') OR days_since_last_order >= average_cadence_days)
            ORDER BY days_since_last_order DESC LIMIT 1
            """,
            (business_id,),
        ).fetchone()
        return str(row["id"]) if row else None


def _check_deduplicated_workflow(
    *,
    business_id: str,
    workflow_type: str,
    target_id: Optional[str],
    db_path: Optional[str] = None,
) -> Optional[dict[str, Any]]:
    if not target_id:
        return None
    with get_sqlite_conn(db_path) as conn:
        existing = conn.execute(
            """
            SELECT w.id AS workflow_id, a.id AS approval_id, a.title
            FROM agent_workflows w
            JOIN approvals a ON a.workflow_id = w.id
            WHERE w.business_id = ? AND w.workflow_type = ? AND w.target_id = ?
              AND w.status = 'awaiting_approval' AND a.status = 'pending_approval'
              AND w.created_at >= datetime('now', '-15 minutes')
            ORDER BY w.created_at DESC LIMIT 1
            """,
            (business_id, workflow_type, target_id),
        ).fetchone()
        if not existing:
            return None
        tasks = conn.execute(
            "SELECT agent_name, status, reason FROM agent_tasks WHERE workflow_id = ? ORDER BY step_order ASC",
            (existing["workflow_id"],),
        ).fetchall()
        thread_row = conn.execute(
            "SELECT thread_id FROM langgraph_threads WHERE workflow_id = ? LIMIT 1",
            (existing["workflow_id"],),
        ).fetchone()

    return {
        "workflowId": existing["workflow_id"],
        "threadId": thread_row["thread_id"] if thread_row else f"thread-{existing['workflow_id']}",
        "status": "awaiting_approval",
        "approvalId": existing["approval_id"],
        "deduplicated": True,
        "tasks": [
            {"agentName": t["agent_name"], "status": t["status"], "reason": t["reason"]}
            for t in tasks
        ],
        "message": f'"{existing["title"]}" is already queued in your Approval Inbox.',
    }


async def invoke_workflow(
    *,
    business_id: str,
    user_id: Optional[str],
    workflow_type: str = "reactivation",
    target_customer_id: Optional[str] = None,
    target_order_id: Optional[str] = None,
    mode: str = "demo",
    language: Optional[str] = None,
    trigger_source: str = "merchant_console",
    user_query: Optional[str] = None,
    checkpoint_path: Optional[str] = None,
    db_path: Optional[str] = None,
) -> dict[str, Any]:
    """Execute a checkpointed LangGraph multi-agent workflow (with HITL interrupt support)."""
    ensure_agentic_auxiliary_tables(db_path)

    if trigger_source != "retry" and workflow_type not in ("copilot_qa", "analytics_roi"):
        target_id = _find_dedup_target(
            business_id=business_id,
            workflow_type=workflow_type,
            target_customer_id=target_customer_id,
            target_order_id=target_order_id,
            db_path=db_path,
        )
        dedup = _check_deduplicated_workflow(
            business_id=business_id,
            workflow_type=workflow_type,
            target_id=target_id,
            db_path=db_path,
        )
        if dedup:
            return dedup

    workflow_id = _gen_id("WF")
    thread_id = f"thread-{workflow_id}"

    initial_state: SellvionAgentState = {
        "workflow_id": workflow_id,
        "thread_id": thread_id,
        "business_id": business_id,
        "user_id": user_id,
        "mode": "demo" if mode == "demo" else "live",
        "language": language or "hinglish",
        "trigger_source": trigger_source,
        "workflow_type": workflow_type,  # type: ignore[typeddict-item]
        "user_query": user_query,
        "target_customer_id": target_customer_id,
        "target_order_id": target_order_id,
        "completed_agents": [],
        "traces": [],
    }

    settings = get_settings()
    run_config: dict[str, Any] = {
        "configurable": {"thread_id": thread_id},
        "metadata": {
            "business_id": business_id,
            "workflow_type": workflow_type,
            "mode": mode,
            "environment": settings.environment,
        },
        "tags": ["sellvion", workflow_type, f"mode:{mode}"],
    }

    async with get_langgraph_checkpointer(checkpoint_path) as checkpointer:
        graph = build_sellvion_graph(checkpointer=checkpointer)
        result_state = await graph.ainvoke(initial_state, config=run_config)
        snapshot = await graph.aget_state(run_config)

    paused_for_hitl = bool(snapshot and snapshot.next)
    values = dict(snapshot.values) if snapshot and snapshot.values else dict(result_state or {})
    traces = list(values.get("traces") or [])

    if paused_for_hitl:
        approval_id = values.get("approval_id")
        title = values.get("action_title") or "Customer Workflow Action"

        # LangGraph interrupt() suspends autonomy_policy before returning state dict;
        # pull approval_id/title from interrupt payload and persisted thread mapping.
        interrupt_list = (result_state or {}).get("__interrupt__") if isinstance(result_state, dict) else None
        if interrupt_list:
            first_intr = interrupt_list[0]
            intr_val = getattr(first_intr, "value", first_intr)
            if isinstance(intr_val, dict):
                approval_id = approval_id or intr_val.get("approval_id")
                title = intr_val.get("title") or title

        with get_sqlite_conn(db_path) as conn:
            if not approval_id:
                row = conn.execute(
                    "SELECT approval_id FROM langgraph_threads WHERE thread_id = ? LIMIT 1",
                    (thread_id,),
                ).fetchone()
                if row:
                    approval_id = row.get("approval_id")
            db_tasks = conn.execute(
                "SELECT agent_name, status, reason, confidence, duration_ms FROM agent_tasks WHERE workflow_id = ? ORDER BY step_order ASC",
                (workflow_id,),
            ).fetchall()
        tasks_out = (
            [
                {"agentName": t["agent_name"], "status": t["status"], "reason": t["reason"]}
                for t in db_tasks
            ]
            if db_tasks
            else [
                {"agentName": t.get("agent_name", ""), "status": t.get("status", "completed"), "reason": t.get("reason", "")}
                for t in traces
            ]
        )
        return {
            "workflowId": workflow_id,
            "threadId": thread_id,
            "status": "awaiting_approval",
            "approvalId": approval_id,
            "tasks": tasks_out,
            "traces": traces,
            "interrupted": True,
            "message": f'Prepared "{title}" and placed it in your Approval Inbox.',
        }

    tasks_out = [
        {"agentName": t.get("agent_name", ""), "status": t.get("status", "completed"), "reason": t.get("reason", "")}
        for t in traces
    ]

    return {
        "workflowId": workflow_id,
        "threadId": thread_id,
        "status": values.get("status", "completed"),
        "approvalId": values.get("approval_id"),
        "tasks": tasks_out,
        "traces": traces,
        "roi": values.get("roi_result"),
        "copilotReply": values.get("copilot_reply"),
        "message": values.get("final_message") or "Workflow completed.",
    }


async def resume_workflow_approval(
    *,
    thread_id: str,
    decision_payload: dict[str, Any],
    checkpoint_path: Optional[str] = None,
) -> dict[str, Any]:
    """Resume a paused LangGraph HITL checkpoint with merchant approval/rejection decision."""
    run_config = {"configurable": {"thread_id": thread_id}}
    async with get_langgraph_checkpointer(checkpoint_path) as checkpointer:
        graph = build_sellvion_graph(checkpointer=checkpointer)
        snapshot_before = await graph.aget_state(run_config)
        if not snapshot_before or not snapshot_before.values:
            return {"ok": False, "status": "not_found", "message": "Checkpoint thread not found."}
        if not snapshot_before.next:
            return {
                "ok": True,
                "status": snapshot_before.values.get("status", "completed"),
                "alreadyResumed": True,
                "message": snapshot_before.values.get("final_message") or "Workflow already completed.",
            }
        result_state = await graph.ainvoke(Command(resume=decision_payload), config=run_config)
        snapshot_after = await graph.aget_state(run_config)

    values = dict(snapshot_after.values) if snapshot_after and snapshot_after.values else dict(result_state or {})
    exec_res = values.get("execution_result") or {}
    return {
        "ok": bool(exec_res.get("ok", True)),
        "status": exec_res.get("status", values.get("status", "completed")),
        "threadId": thread_id,
        "workflowId": values.get("workflow_id"),
        "approvalId": values.get("approval_id"),
        "message": exec_res.get("message") or values.get("final_message") or "Decision processed.",
        "traces": values.get("traces") or [],
    }


async def get_thread_state(
    *,
    thread_id: str,
    checkpoint_path: Optional[str] = None,
) -> Optional[dict[str, Any]]:
    run_config = {"configurable": {"thread_id": thread_id}}
    async with get_langgraph_checkpointer(checkpoint_path) as checkpointer:
        graph = build_sellvion_graph(checkpointer=checkpointer)
        snapshot = await graph.aget_state(run_config)
        if not snapshot or not snapshot.values:
            return None
        return {
            "threadId": thread_id,
            "nextNodes": list(snapshot.next or []),
            "interrupted": bool(snapshot.next),
            "values": {
                "workflow_id": snapshot.values.get("workflow_id"),
                "workflow_type": snapshot.values.get("workflow_type"),
                "status": snapshot.values.get("status"),
                "current_step": snapshot.values.get("current_step"),
                "approval_id": snapshot.values.get("approval_id"),
                "completed_agents": snapshot.values.get("completed_agents", []),
                "traces": snapshot.values.get("traces", []),
            },
        }
