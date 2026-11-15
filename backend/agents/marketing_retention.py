from __future__ import annotations

import time
from typing import Any

from backend.db.connection import get_sqlite_conn
from backend.llm.provider import llm_provider
from backend.prompts.templates import RETENTION_STRATEGY_PROMPT
from backend.schemas.models import RetentionCampaignOutput, SellvionAgentState


async def run_marketing_retention_agent(state: SellvionAgentState) -> dict[str, Any]:
    """Agent 5: Customer retention strategy, repeat-purchase cadence forecasting, and bounded offer design."""
    started = time.perf_counter()
    business_id = state["business_id"]
    customer = state.get("customer") or {}
    days_since = int(customer.get("days_since_last_order", 0) or 0)
    cadence = int(customer.get("average_cadence_days", 30) or 30)
    product = str(customer.get("last_product_ordered") or "regular items")

    with get_sqlite_conn() as conn:
        settings = conn.execute(
            "SELECT max_discount_pct FROM business_settings WHERE business_id = ?",
            (business_id,),
        ).fetchone()
    max_discount = int((settings or {}).get("max_discount_pct", 10))

    is_winback = days_since >= max(60, cadence * 2)
    default_action = "winback_offer" if is_winback else "reorder_reminder"
    default_conf = 86 if is_winback else 90
    default_offer = f"VIP {min(max_discount, 10)}% courtesy discount" if is_winback and max_discount > 0 else "Complimentary sample check-in"

    strategy_payload: dict[str, Any] = {
        "strategy": default_action,
        "recommended_offer": default_offer,
        "discount_pct": min(max_discount, 10) if is_winback else 0,
        "confidence": default_conf,
        "rationale": (
            f"No purchase in {days_since} days (typical cycle {cadence} days)."
            if is_winback
            else f"Customer is {days_since} days since last order (cycle: {cadence} days)."
        ),
    }

    if llm_provider.is_configured:
        cust_summary = f"{customer.get('name', 'Buyer')} ({customer.get('city', 'India')}), last ordered {product}, segment {customer.get('segment', 'regular')}"
        structured, _ = await llm_provider.invoke_prompt_structured(
            RETENTION_STRATEGY_PROMPT,
            RetentionCampaignOutput,
            {
                "customer_summary": cust_summary,
                "days_since": days_since,
                "cadence_days": cadence,
                "max_discount_pct": max_discount,
            },
        )
        if structured:
            bounded_disc = min(max_discount, structured.discount_pct)
            strategy_payload = {
                "strategy": "winback_offer" if structured.strategy == "winback_offer" or is_winback else "reorder_reminder",
                "recommended_offer": structured.recommended_offer,
                "discount_pct": bounded_disc,
                "confidence": structured.confidence,
                "rationale": structured.rationale,
            }

    action_type = "winback_offer" if strategy_payload["strategy"] == "winback_offer" else "reorder_reminder"
    title = (
        f"Customer Reactivation: {customer.get('name', 'Customer')}"
        if action_type == "winback_offer"
        else f"Reorder Check-in: {customer.get('name', 'Customer')}"
    )
    impact = f"Invite repeat order on {product}"
    confidence = int(strategy_payload["confidence"])

    duration_ms = max(10, int((time.perf_counter() - started) * 1000))
    completed = list(state.get("completed_agents") or [])
    completed.append("marketing_retention")
    traces = list(state.get("traces") or [])
    traces.append(
        {
            "agent_id": "marketing_retention",
            "agent_name": "Marketing & Retention Agent",
            "step_order": len(traces) + 1,
            "status": "completed",
            "reason": strategy_payload["rationale"],
            "confidence": confidence,
            "duration_ms": duration_ms,
            "output": strategy_payload,
        }
    )

    return {
        "retention_strategy": strategy_payload,
        "action_type": action_type,
        "action_title": title,
        "potential_impact": impact,
        "confidence": confidence,
        "completed_agents": completed,
        "traces": traces,
        "next_agent": "whatsapp_communication",
    }
