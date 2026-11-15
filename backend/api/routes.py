from __future__ import annotations

from datetime import datetime, timedelta, timezone
import json
import secrets
from typing import Any, Optional

from fastapi import APIRouter, Depends, Header, Query, Request
from fastapi.responses import JSONResponse

from backend.agents import SPECIALIZED_AGENT_CATALOG
from backend.agents.analytics_roi import (
    compute_analytics_summary,
    execute_approved_action_db,
    generate_copilot_reply,
)
from backend.agents.supervisor import parse_voice_command_agentic
from backend.agents.whatsapp_communication import generate_whatsapp_message
from backend.cache.redis_cache import cache_backend
from backend.config.settings import get_settings
from backend.db.connection import (
    ensure_agentic_auxiliary_tables,
    get_sqlite_conn,
    resolve_auth_from_headers,
    write_audit_log,
)
from backend.db.vector_store import index_business_customers
from backend.graph.workflow import (
    get_thread_state,
    invoke_workflow,
    resume_workflow_approval,
)
from backend.llm.provider import llm_provider
from backend.schemas.models import (
    AgenticAnalyzeRequest,
    ApprovalDecisionRequest,
    ApprovalEditRequest,
    BulkApproveRequest,
    CodScoreRequest,
    CopilotRequest,
    DraftMessageRequest,
    RunWorkflowRequest,
    VoiceCommandRequest,
)
from backend.tools.merchant_tools import score_cod_order_risk_logic

router = APIRouter(prefix="/api")

# Legacy 5-key UI agent roster preserved 1:1 alongside the 7 LangGraph agents
UI_COMPAT_AGENTS = [
    {
        "name": "Customer Intelligence Agent",
        "role": "Builds customer profiles and purchase memory from orders, payment history, and preferences.",
        "permissionScope": "Read business customers, orders, payments",
    },
    {
        "name": "Behaviour & Prediction Agent",
        "role": "Identifies reorder windows, inactive buyers, and explainable COD delivery risks.",
        "permissionScope": "Score orders and classify customer cadence",
    },
    {
        "name": "Engagement & Copy Agent",
        "role": "Prepares polite customer messages in simple English, Hinglish, or Hindi.",
        "permissionScope": "Draft messages only (cannot send directly)",
    },
    {
        "name": "Policy & Safety Guard",
        "role": "Checks customer consent, opt-outs, quiet hours, frequency caps, and autonomy limits.",
        "permissionScope": "Enforce safety policy and block non-compliant sends",
    },
    {
        "name": "Execution & Measurement Agent",
        "role": "Dispatches approved messages via verified providers and tracks replies and order outcomes.",
        "permissionScope": "Execute permitted provider actions and record telemetry",
    },
]

_UI_STAT_ALIAS = {
    "Customer Intelligence Agent": ["Customer Intelligence Agent"],
    "Behaviour & Prediction Agent": [
        "Behaviour & Prediction Agent",
        "COD Risk Intelligence Agent",
        "Udhaar Management Agent",
        "Marketing & Retention Agent",
    ],
    "Engagement & Copy Agent": ["Engagement & Copy Agent", "WhatsApp Communication Agent"],
    "Policy & Safety Guard": ["Policy & Safety Guard", "Autonomy & Policy Agent"],
    "Execution & Measurement Agent": ["Execution & Measurement Agent", "Analytics & ROI Agent"],
}


def _gen_id(prefix: str) -> str:
    return f"{prefix}-{secrets.token_hex(4).upper()}"


async def get_auth_context(
    authorization: Optional[str] = Header(default=None),
    cookie: Optional[str] = Header(default=None),
    x_sellvion_mode: Optional[str] = Header(default=None, alias="x-sellvion-mode"),
) -> dict[str, Any]:
    return resolve_auth_from_headers(
        authorization=authorization,
        cookie_header=cookie,
        requested_mode=x_sellvion_mode,
    )


@router.get("/health")
async def health_check() -> dict[str, Any]:
    settings = get_settings()
    return {
        "status": "ok",
        "service": "sellvion-agentic-fastapi",
        "engine": "langgraph+langchain+gemini",
        "model": settings.gemini_model,
        "geminiConfigured": llm_provider.is_configured,
        "langsmithTracing": settings.is_langsmith_configured,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ---------------------------------------------------------------------------
# 1. AGENTS & LANGGRAPH WORKFLOWS
# ---------------------------------------------------------------------------

@router.get("/agents")
async def list_agents_compat(auth: dict[str, Any] = Depends(get_auth_context)) -> dict[str, Any]:
    """Preserve exact frontend /api/agents contract while reflecting live 7-agent telemetry."""
    business_id = auth["businessId"]
    with get_sqlite_conn() as conn:
        stats_rows = conn.execute(
            """
            SELECT agent_name,
                   COUNT(*) AS total_runs,
                   SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_runs,
                   SUM(CASE WHEN status IN ('failed', 'escalated') THEN 1 ELSE 0 END) AS attention_runs,
                   ROUND(AVG(COALESCE(duration_ms, 0))) AS avg_duration_ms
            FROM agent_tasks
            WHERE business_id = ?
            GROUP BY agent_name
            """,
            (business_id,),
        ).fetchall()
        recent_tasks = conn.execute(
            """
            SELECT id, workflow_id, agent_name, status, reason, duration_ms, created_at
            FROM agent_tasks
            WHERE business_id = ?
            ORDER BY created_at DESC LIMIT 15
            """,
            (business_id,),
        ).fetchall()

    stats_map = {str(r["agent_name"]): r for r in stats_rows}

    agents_out = []
    for base in UI_COMPAT_AGENTS:
        aliases = _UI_STAT_ALIAS.get(base["name"], [base["name"]])
        total = sum(int((stats_map.get(a) or {}).get("total_runs") or 0) for a in aliases)
        completed = sum(int((stats_map.get(a) or {}).get("completed_runs") or 0) for a in aliases)
        attention = sum(int((stats_map.get(a) or {}).get("attention_runs") or 0) for a in aliases)
        durations = [float((stats_map.get(a) or {}).get("avg_duration_ms") or 0) for a in aliases if stats_map.get(a)]
        avg_dur = round(sum(durations) / len(durations)) if durations else 0
        agents_out.append(
            {
                **base,
                "totalRuns": total,
                "completedRuns": completed,
                "attentionRuns": attention,
                "avgDurationMs": avg_dur,
            }
        )

    return {"agents": agents_out, "recentTasks": recent_tasks}


@router.get("/agentic/agents")
async def list_seven_agentic_agents(auth: dict[str, Any] = Depends(get_auth_context)) -> dict[str, Any]:
    """Expose full Supervisor + 7 Specialized Agents registry & live stats."""
    business_id = auth["businessId"]
    with get_sqlite_conn() as conn:
        stats_rows = conn.execute(
            """
            SELECT agent_name,
                   COUNT(*) AS total_runs,
                   SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_runs,
                   SUM(CASE WHEN status IN ('failed', 'escalated') THEN 1 ELSE 0 END) AS attention_runs,
                   ROUND(AVG(COALESCE(duration_ms, 0))) AS avg_duration_ms
            FROM agent_tasks
            WHERE business_id = ?
            GROUP BY agent_name
            """,
            (business_id,),
        ).fetchall()

    stats_map = {str(r["agent_name"]): r for r in stats_rows}
    specialized = []
    for spec in SPECIALIZED_AGENT_CATALOG:
        s = stats_map.get(spec["name"]) or {}
        specialized.append(
            {
                **spec,
                "totalRuns": int(s.get("total_runs") or 0),
                "completedRuns": int(s.get("completed_runs") or 0),
                "attentionRuns": int(s.get("attention_runs") or 0),
                "avgDurationMs": float(s.get("avg_duration_ms") or 0),
            }
        )
    return {
        "orchestrator": {
            "id": "supervisor",
            "name": "Central Supervisor Router",
            "framework": "LangGraph StateGraph",
        },
        "agents": specialized,
    }


@router.get("/workflows")
async def list_workflows(auth: dict[str, Any] = Depends(get_auth_context)) -> dict[str, Any]:
    business_id = auth["businessId"]
    with get_sqlite_conn() as conn:
        workflows = conn.execute(
            "SELECT * FROM agent_workflows WHERE business_id = ? ORDER BY created_at DESC LIMIT 30",
            (business_id,),
        ).fetchall()
        tasks = conn.execute(
            "SELECT * FROM agent_tasks WHERE business_id = ? ORDER BY step_order ASC",
            (business_id,),
        ).fetchall()

    tasks_by_wf: dict[str, list[dict[str, Any]]] = {}
    for t in tasks:
        wf_id = str(t["workflow_id"])
        tasks_by_wf.setdefault(wf_id, []).append(t)

    return {
        "workflows": [
            {**wf, "tasks": tasks_by_wf.get(str(wf["id"]), [])}
            for wf in workflows
        ]
    }


@router.post("/workflows/run", status_code=201)
async def run_workflow(
    payload: RunWorkflowRequest,
    auth: dict[str, Any] = Depends(get_auth_context),
) -> dict[str, Any]:
    result = await invoke_workflow(
        business_id=auth["businessId"],
        user_id=auth.get("userId"),
        workflow_type=payload.workflowType,
        target_customer_id=payload.targetCustomerId,
        target_order_id=payload.targetOrderId,
        mode=auth["mode"],
        language=payload.language,
        trigger_source="merchant_console",
    )
    await cache_backend.invalidate_prefix(f"analytics:{auth['businessId']}")
    return result


@router.post("/workflows/{workflow_id}/retry")
async def retry_workflow(
    workflow_id: str,
    auth: dict[str, Any] = Depends(get_auth_context),
) -> Any:
    business_id = auth["businessId"]
    with get_sqlite_conn() as conn:
        wf = conn.execute(
            "SELECT * FROM agent_workflows WHERE id = ? AND business_id = ?",
            (workflow_id, business_id),
        ).fetchone()
    if not wf:
        return JSONResponse(status_code=404, content={"error": "Workflow not found."})

    try:
        wf_input = json.loads(str(wf.get("input_json") or "{}"))
    except ValueError:
        wf_input = {}

    retried = await invoke_workflow(
        business_id=business_id,
        user_id=auth.get("userId"),
        workflow_type=str(wf["workflow_type"]),
        target_customer_id=wf_input.get("customerId"),
        target_order_id=wf_input.get("orderId"),
        mode=auth["mode"],
        trigger_source="retry",
    )
    await cache_backend.invalidate_prefix(f"analytics:{business_id}")
    return retried


@router.post("/workflows/{workflow_id}/escalate")
async def escalate_workflow(
    workflow_id: str,
    request: Request,
    auth: dict[str, Any] = Depends(get_auth_context),
) -> Any:
    business_id = auth["businessId"]
    try:
        body = await request.json()
    except Exception:
        body = {}
    reason = str((body or {}).get("reason") or "Escalated for human review by merchant.")

    with get_sqlite_conn() as conn:
        wf = conn.execute(
            "SELECT id FROM agent_workflows WHERE id = ? AND business_id = ?",
            (workflow_id, business_id),
        ).fetchone()
        if not wf:
            return JSONResponse(status_code=404, content={"error": "Workflow not found."})
        conn.execute(
            "UPDATE agent_workflows SET status = 'escalated', current_step = 'human_review', error_message = ?, updated_at = datetime('now') WHERE id = ?",
            (reason, workflow_id),
        )
        write_audit_log(
            conn,
            audit_id=_gen_id("AUD"),
            business_id=business_id,
            user_id=auth.get("userId"),
            actor_type="merchant",
            action="workflow_escalated",
            entity_type="workflow",
            entity_id=workflow_id,
            details={"reason": reason},
        )
    await cache_backend.invalidate_prefix(f"analytics:{business_id}")
    return {"ok": True}


# ---------------------------------------------------------------------------
# 2. APPROVAL INBOX & HUMAN-IN-THE-LOOP RESUME
# ---------------------------------------------------------------------------

@router.get("/approvals")
async def list_approvals(
    status: str = Query(default="all"),
    auth: dict[str, Any] = Depends(get_auth_context),
) -> dict[str, Any]:
    business_id = auth["businessId"]
    where = ["a.business_id = ?"]
    params: list[Any] = [business_id]
    if status != "all":
        where.append("a.status = ?")
        params.append(status)

    query_sql = f"""
        SELECT a.*,
               c.name AS customer_name,
               c.phone AS customer_phone,
               c.city AS customer_city,
               c.last_product_ordered AS customer_last_product,
               c.consent_whatsapp,
               c.opted_out,
               w.status AS workflow_status,
               w.current_step AS workflow_current_step,
               (SELECT m.status FROM message_history m WHERE m.approval_id = a.id ORDER BY m.created_at DESC LIMIT 1) AS execution_status,
               (SELECT m.provider_message_id FROM message_history m WHERE m.approval_id = a.id ORDER BY m.created_at DESC LIMIT 1) AS provider_message_id,
               (SELECT m.error_message FROM message_history m WHERE m.approval_id = a.id ORDER BY m.created_at DESC LIMIT 1) AS execution_error,
               (SELECT m.created_at FROM message_history m WHERE m.approval_id = a.id ORDER BY m.created_at DESC LIMIT 1) AS executed_at
        FROM approvals a
        JOIN customers c ON c.id = a.customer_id
        LEFT JOIN agent_workflows w ON w.id = a.workflow_id
        WHERE {' AND '.join(where)}
        ORDER BY CASE WHEN a.status = 'pending_approval' THEN 0 ELSE 1 END, a.created_at DESC
    """
    with get_sqlite_conn() as conn:
        approvals = conn.execute(query_sql, tuple(params)).fetchall()
    return {"approvals": approvals}


@router.patch("/approvals/{approval_id}")
async def edit_approval_draft(
    approval_id: str,
    payload: ApprovalEditRequest,
    auth: dict[str, Any] = Depends(get_auth_context),
) -> Any:
    business_id = auth["businessId"]
    trimmed = payload.suggestedMessage.strip()
    if not trimmed:
        return JSONResponse(status_code=400, content={"error": "Message text cannot be empty."})

    with get_sqlite_conn() as conn:
        existing = conn.execute(
            "SELECT id FROM approvals WHERE id = ? AND business_id = ?",
            (approval_id, business_id),
        ).fetchone()
        if not existing:
            return JSONResponse(status_code=404, content={"error": "Approval item not found."})

        conn.execute(
            "UPDATE approvals SET suggested_message = ?, updated_at = datetime('now') WHERE id = ?",
            (trimmed, approval_id),
        )
        write_audit_log(
            conn,
            audit_id=_gen_id("AUD"),
            business_id=business_id,
            user_id=auth.get("userId"),
            actor_type="merchant",
            action="approval_draft_edited",
            entity_type="approval",
            entity_id=approval_id,
        )
        updated = conn.execute("SELECT * FROM approvals WHERE id = ?", (approval_id,)).fetchone()
    return {"ok": True, "approval": updated}


@router.post("/approvals/{approval_id}/decision")
async def decide_approval(
    approval_id: str,
    payload: ApprovalDecisionRequest,
    auth: dict[str, Any] = Depends(get_auth_context),
) -> Any:
    ensure_agentic_auxiliary_tables()
    business_id = auth["businessId"]

    with get_sqlite_conn() as conn:
        existing = conn.execute(
            "SELECT * FROM approvals WHERE id = ? AND business_id = ?",
            (approval_id, business_id),
        ).fetchone()
        if not existing:
            return JSONResponse(status_code=404, content={"error": "Approval item not found."})

        thread_row = conn.execute(
            "SELECT thread_id FROM langgraph_threads WHERE approval_id = ? LIMIT 1",
            (approval_id,),
        ).fetchone()

    decision = payload.decision

    if decision in ("approve", "retry"):
        if thread_row:
            thread_state = await get_thread_state(thread_id=str(thread_row["thread_id"]))
            if thread_state and thread_state.get("interrupted"):
                resumed = await resume_workflow_approval(
                    thread_id=str(thread_row["thread_id"]),
                    decision_payload={
                        "decision": decision,
                        "overrideQuietHours": bool(payload.overrideQuietHours),
                    },
                )
                await cache_backend.invalidate_prefix(f"analytics:{business_id}")
                return JSONResponse(
                    status_code=200 if resumed.get("ok") else 422,
                    content=resumed,
                )

        exec_res = await execute_approved_action_db(
            business_id=business_id,
            approval_id=approval_id,
            user_id=auth.get("userId"),
            mode=auth["mode"],
            override_quiet_hours=bool(payload.overrideQuietHours),
        )
        await cache_backend.invalidate_prefix(f"analytics:{business_id}")
        return JSONResponse(status_code=200 if exec_res.get("ok") else 422, content=exec_res)

    if decision == "reject":
        if thread_row:
            thread_state = await get_thread_state(thread_id=str(thread_row["thread_id"]))
            if thread_state and thread_state.get("interrupted"):
                resumed = await resume_workflow_approval(
                    thread_id=str(thread_row["thread_id"]),
                    decision_payload={"decision": "reject", "reason": payload.reason},
                )
                await cache_backend.invalidate_prefix(f"analytics:{business_id}")
                return {"ok": True, "status": "rejected", "message": resumed.get("message", "Action rejected and logged.")}

        try:
            meta = json.loads(str(existing.get("metadata_json") or "{}"))
        except ValueError:
            meta = {}
        meta["rejectionReason"] = payload.reason or "Dismissed by merchant"

        with get_sqlite_conn() as conn:
            conn.execute(
                "UPDATE approvals SET status = 'rejected', metadata_json = ?, updated_at = datetime('now') WHERE id = ?",
                (json.dumps(meta), approval_id),
            )
            if existing.get("workflow_id"):
                conn.execute(
                    "UPDATE agent_workflows SET status = 'completed', current_step = 'rejected_by_merchant', updated_at = datetime('now') WHERE id = ?",
                    (existing["workflow_id"],),
                )
            write_audit_log(
                conn,
                audit_id=_gen_id("AUD"),
                business_id=business_id,
                user_id=auth.get("userId"),
                actor_type="merchant",
                action="approval_rejected",
                entity_type="approval",
                entity_id=approval_id,
                details={"reason": payload.reason},
            )
        await cache_backend.invalidate_prefix(f"analytics:{business_id}")
        return {"ok": True, "status": "rejected", "message": "Action rejected and logged."}

    if decision in ("snooze", "schedule"):
        effective_schedule = payload.scheduledFor or (
            datetime.now(timezone.utc) + timedelta(hours=24)
        ).isoformat()
        with get_sqlite_conn() as conn:
            conn.execute(
                "UPDATE approvals SET status = 'snoozed', scheduled_for = ?, updated_at = datetime('now') WHERE id = ?",
                (effective_schedule, approval_id),
            )
            write_audit_log(
                conn,
                audit_id=_gen_id("AUD"),
                business_id=business_id,
                user_id=auth.get("userId"),
                actor_type="merchant",
                action="approval_scheduled" if decision == "schedule" else "approval_snoozed",
                entity_type="approval",
                entity_id=approval_id,
                details={"scheduledFor": effective_schedule},
            )
        await cache_backend.invalidate_prefix(f"analytics:{business_id}")
        return {
            "ok": True,
            "status": "snoozed",
            "scheduledFor": effective_schedule,
            "message": "Action scheduled." if decision == "schedule" else "Action snoozed.",
        }

    if decision == "escalate":
        with get_sqlite_conn() as conn:
            conn.execute(
                "UPDATE approvals SET status = 'escalated', updated_at = datetime('now') WHERE id = ?",
                (approval_id,),
            )
        await cache_backend.invalidate_prefix(f"analytics:{business_id}")
        return {"ok": True, "status": "escalated", "message": "Escalated for manual review."}

    return JSONResponse(status_code=400, content={"error": "Unsupported decision."})


@router.post("/approvals/bulk-approve")
async def bulk_approve_actions(
    payload: BulkApproveRequest,
    auth: dict[str, Any] = Depends(get_auth_context),
) -> dict[str, Any]:
    business_id = auth["businessId"]
    results = []
    for item_id in payload.ids:
        thread_row = None
        with get_sqlite_conn() as conn:
            thread_row = conn.execute(
                "SELECT thread_id FROM langgraph_threads WHERE approval_id = ? LIMIT 1",
                (item_id,),
            ).fetchone()

        if thread_row:
            ts = await get_thread_state(thread_id=str(thread_row["thread_id"]))
            if ts and ts.get("interrupted"):
                r = await resume_workflow_approval(
                    thread_id=str(thread_row["thread_id"]),
                    decision_payload={"decision": "approve", "overrideQuietHours": True},
                )
                results.append({"id": item_id, "ok": bool(r.get("ok")), "message": r.get("message", "")})
                continue

        r = await execute_approved_action_db(
            business_id=business_id,
            approval_id=item_id,
            user_id=auth.get("userId"),
            mode=auth["mode"],
            override_quiet_hours=True,
        )
        results.append({"id": item_id, "ok": bool(r.get("ok")), "message": r.get("message", "")})

    await cache_backend.invalidate_prefix(f"analytics:{business_id}")
    return {
        "ok": all(r["ok"] for r in results),
        "succeeded": sum(1 for r in results if r["ok"]),
        "failed": sum(1 for r in results if not r["ok"]),
        "results": results,
    }


# ---------------------------------------------------------------------------
# 3. COD SHIELD & UDHAAR TRIGGERS
# ---------------------------------------------------------------------------

@router.post("/cod/score")
async def score_cod_endpoint(payload: CodScoreRequest) -> dict[str, Any]:
    return score_cod_order_risk_logic(
        is_first_time_buyer=payload.isFirstTimeBuyer,
        pincode=payload.pincode,
        address=payload.address,
        amount=payload.amount,
        prior_rto_count=payload.priorRtoCount,
    )


@router.post("/udhaar/{customer_id}/prepare-reminder")
async def prepare_udhaar_reminder(
    customer_id: str,
    request: Request,
    auth: dict[str, Any] = Depends(get_auth_context),
) -> dict[str, Any]:
    try:
        body = await request.json()
    except Exception:
        body = {}
    res = await invoke_workflow(
        business_id=auth["businessId"],
        user_id=auth.get("userId"),
        workflow_type="udhaar_collection",
        target_customer_id=customer_id,
        mode=auth["mode"],
        language=(body or {}).get("language"),
        trigger_source="udhaar_ledger",
    )
    await cache_backend.invalidate_prefix(f"analytics:{auth['businessId']}")
    return res


# ---------------------------------------------------------------------------
# 4. AI COPILOT, WHATSAPP DRAFTING & VOICE INTENT
# ---------------------------------------------------------------------------

@router.post("/ai/draft-message")
async def draft_whatsapp_message(payload: DraftMessageRequest) -> dict[str, Any]:
    return await generate_whatsapp_message(
        customer_name=payload.customerName,
        customer_city=payload.customerCity,
        product_name=payload.productName,
        last_order_days_ago=payload.lastOrderDaysAgo,
        action_type=payload.recommendedAction or payload.actionType or "reorder_reminder",
        tone=payload.tone,
        language=payload.language,
        udhaar_amount=payload.udhaarAmount,
        order_id=payload.orderId,
        discount_text=payload.discountOffer,
    )


@router.post("/ai/ask-copilot")
async def ask_copilot(
    payload: CopilotRequest,
    auth: dict[str, Any] = Depends(get_auth_context),
) -> Any:
    query = payload.query.strip()
    if not query:
        return JSONResponse(status_code=400, content={"error": "Question cannot be empty."})

    business_id = auth["businessId"]
    with get_sqlite_conn() as conn:
        customers = conn.execute(
            "SELECT name, city, segment, last_product_ordered, days_since_last_order, average_cadence_days, outstanding_udhaar "
            "FROM customers WHERE business_id = ? LIMIT 30",
            (business_id,),
        ).fetchall()
        high_risk = conn.execute(
            "SELECT order_number, total_amount, cod_risk_score, status FROM orders "
            "WHERE business_id = ? AND payment_mode = 'COD' AND cod_risk_score >= 50",
            (business_id,),
        ).fetchall()

    context = {
        "mode": auth["mode"],
        "businessName": auth["businessName"],
        "totalCustomers": len(customers),
        "dueForReorder": [
            c for c in customers if c["segment"] == "reorder_due" or c["days_since_last_order"] >= c["average_cadence_days"]
        ],
        "overdueUdhaar": [
            {"name": c["name"], "city": c["city"], "amount": c["outstanding_udhaar"]}
            for c in customers
            if float(c.get("outstanding_udhaar") or 0) > 0
        ],
        "highRiskOrders": high_risk,
    }
    return await generate_copilot_reply(
        business_id=business_id,
        query=query,
        context=context,
        language=payload.language,
    )


@router.post("/ai/parse-voice-command")
async def parse_voice_command_endpoint(payload: VoiceCommandRequest) -> Any:
    transcript = payload.transcript.strip()
    if not transcript:
        return JSONResponse(status_code=400, content={"error": "Voice transcript is required."})
    return await parse_voice_command_agentic(transcript)


# ---------------------------------------------------------------------------
# 5. ANALYTICS & HOLDOUT ROI (Redis / TTL cached)
# ---------------------------------------------------------------------------

@router.get("/analytics/summary")
async def analytics_summary(
    range_param: str = Query(default="30d", alias="range"),
    auth: dict[str, Any] = Depends(get_auth_context),
) -> dict[str, Any]:
    business_id = auth["businessId"]
    cache_key = f"analytics:{business_id}:{range_param}"
    cached = await cache_backend.get_json(cache_key)
    if cached:
        return cached
    summary = compute_analytics_summary(
        business_id=business_id,
        mode=auth["mode"],
        range_key=range_param,
    )
    await cache_backend.set_json(cache_key, summary, ttl_seconds=15)
    return summary


# ---------------------------------------------------------------------------
# 6. AGENTIC ORCHESTRATION & CHECKPOINT DIAGNOSTICS
# ---------------------------------------------------------------------------

@router.get("/agentic/threads/{thread_id}")
async def inspect_langgraph_thread(thread_id: str) -> Any:
    state = await get_thread_state(thread_id=thread_id)
    if not state:
        return JSONResponse(status_code=404, content={"error": "LangGraph thread checkpoint not found."})
    return state


@router.post("/agentic/analyze")
async def agentic_supervisor_analyze(
    payload: AgenticAnalyzeRequest,
    auth: dict[str, Any] = Depends(get_auth_context),
) -> dict[str, Any]:
    business_id = auth["businessId"]
    index_business_customers(business_id)
    wf_type = payload.workflowType or "copilot_qa"
    return await invoke_workflow(
        business_id=business_id,
        user_id=auth.get("userId"),
        workflow_type=wf_type,
        target_customer_id=payload.customerId,
        target_order_id=payload.orderId,
        mode=auth["mode"],
        language=payload.language,
        trigger_source="agentic_api",
        user_query=payload.query,
    )
