from __future__ import annotations

import time
from typing import Any

from backend.llm.provider import llm_provider
from backend.prompts.templates import SUPERVISOR_ROUTE_PROMPT, VOICE_INTENT_PROMPT
from backend.schemas.models import (
    SellvionAgentState,
    SupervisorRouteDecision,
    VoiceIntentOutput,
)


async def run_supervisor_router(state: SellvionAgentState) -> dict[str, Any]:
    """Central Supervisor / Router Agent coordinating the 7 specialized SELLVION agents."""
    started = time.perf_counter()
    wf_type = state.get("workflow_type", "reactivation")
    query = (state.get("user_query") or "").strip()

    route_reason = f"Supervisor routed '{wf_type}' workflow to Customer Intelligence Agent first."
    initial_agent = "customer_intelligence"

    # When an open-ended user query arrives without explicit workflowType, classify via LangChain + Gemini
    if query and wf_type == "copilot_qa":
        q_low = query.lower()
        if any(k in q_low for k in ("roi", "holdout", "revenue", "lift", "analytics")):
            initial_agent = "customer_intelligence"
            route_reason = "Supervisor routed ROI/Analytics inquiry through Customer Intelligence -> Analytics & ROI Agent."
        elif llm_provider.is_configured:
            decision, _ = await llm_provider.invoke_prompt_structured(
                SUPERVISOR_ROUTE_PROMPT,
                SupervisorRouteDecision,
                {"workflow_type": wf_type, "query": query},
            )
            if decision:
                route_reason = decision.reasoning

    traces = list(state.get("traces") or [])
    traces.append(
        {
            "agent_id": "supervisor",
            "agent_name": "Central Supervisor Router",
            "step_order": len(traces) + 1,
            "status": "completed",
            "reason": route_reason,
            "confidence": 98,
            "duration_ms": max(4, int((time.perf_counter() - started) * 1000)),
            "output": {"workflow_type": wf_type, "initial_agent": initial_agent},
        }
    )

    return {
        "next_agent": initial_agent,
        "route_reason": route_reason,
        "current_step": "understand",
        "completed_agents": list(state.get("completed_agents") or []),
        "traces": traces,
    }


async def parse_voice_command_agentic(transcript: str) -> dict[str, Any]:
    """Fast deterministic intent matcher backed by LangChain structured Gemini output for long-tail commands."""
    lower = transcript.lower()

    if any(k in lower for k in ("udhaar", "pending", "payment", "due", "khata", "बाकी", "బాకీ")):
        should_confirm = ("send" in lower) or ("remind" in lower)
        return {
            "intent": "prepare_reminders" if should_confirm else "show_udhaar",
            "targetTab": "udhaar",
            "summary": (
                "Prepare polite payment reminders for overdue udhaar customers for your approval."
                if should_confirm
                else "Open pending customer udhaar payments."
            ),
            "requiresConfirmation": should_confirm,
            "suggestedWorkflow": "udhaar_collection" if should_confirm else None,
        }

    if any(k in lower for k in ("risk", "cod", "return", "rto", "ऑर्डर")):
        return {
            "intent": "show_cod_risk",
            "targetTab": "cod-risk",
            "summary": "Open orders that may be returned.",
            "requiresConfirmation": False,
            "suggestedWorkflow": "cod_protection",
        }

    if "order" in lower:
        return {
            "intent": "show_orders",
            "targetTab": "orders",
            "summary": "Open all store orders.",
            "requiresConfirmation": False,
        }

    if any(k in lower for k in ("inactive", "haven't purchased", "reorder", "reminder", "stopped")):
        return {
            "intent": "prepare_reminders",
            "targetTab": "customers",
            "summary": "Prepare follow-up messages for customers who have not purchased recently (requires your approval before sending).",
            "requiresConfirmation": True,
            "suggestedWorkflow": "reactivation",
        }

    if any(k in lower for k in ("approv", "inbox", "action")):
        return {
            "intent": "open_approvals",
            "targetTab": "inbox",
            "summary": "Open Action Center.",
            "requiresConfirmation": False,
        }

    if llm_provider.is_configured:
        parsed, _ = await llm_provider.invoke_prompt_structured(
            VOICE_INTENT_PROMPT,
            VoiceIntentOutput,
            {"transcript": transcript},
        )
        if parsed:
            return parsed.model_dump()

    return {
        "intent": "unknown",
        "targetTab": "dashboard",
        "summary": f'Could not match "{transcript}" to a specific command. Try "Show pending customer payments" or "Show today\'s risky orders".',
        "requiresConfirmation": False,
    }
