from __future__ import annotations

import time
from typing import Any

from backend.schemas.models import SellvionAgentState
from backend.tools.merchant_tools import score_cod_order_risk_logic


async def run_cod_risk_intelligence_agent(state: SellvionAgentState) -> dict[str, Any]:
    """Agent 3: COD order risk analysis, RTO scoring, risk identification, and UPI prepay guidance."""
    started = time.perf_counter()
    customer = state.get("customer") or {}
    order = state.get("order")

    if not order:
        duration_ms = max(6, int((time.perf_counter() - started) * 1000))
        completed = list(state.get("completed_agents") or [])
        completed.append("cod_risk_intelligence")
        traces = list(state.get("traces") or [])
        traces.append(
            {
                "agent_id": "cod_risk_intelligence",
                "agent_name": "COD Risk Intelligence Agent",
                "step_order": len(traces) + 1,
                "status": "escalated",
                "reason": "No pending COD order found to evaluate.",
                "confidence": 100,
                "duration_ms": duration_ms,
                "output": {},
            }
        )
        return {
            "completed_agents": completed,
            "traces": traces,
            "status": "escalated",
            "error_message": "No eligible COD order found.",
            "final_message": "No pending COD order found for risk evaluation.",
            "next_agent": "complete",
        }

    risk = score_cod_order_risk_logic(
        is_first_time_buyer=int(customer.get("total_orders", 0) or 0) <= 1,
        pincode=str(order.get("pincode") or customer.get("pincode") or ""),
        address=str(order.get("delivery_address") or customer.get("address_line") or ""),
        amount=float(order.get("total_amount", 0) or 0),
    )

    action_type = "cod_prepay" if risk["score"] >= 60 else "cod_verify"
    confidence = min(95, max(70, int(risk["score"]) + 18))
    reason = f"COD risk score {risk['score']}/100: {'; '.join(risk['reasons']) or 'Standard order check'}."
    title = f"COD Risk Check: Order {order.get('order_number', order.get('id'))}"
    impact = str(risk["recommendedAction"])

    duration_ms = max(10, int((time.perf_counter() - started) * 1000))
    completed = list(state.get("completed_agents") or [])
    completed.append("cod_risk_intelligence")
    traces = list(state.get("traces") or [])
    traces.append(
        {
            "agent_id": "cod_risk_intelligence",
            "agent_name": "COD Risk Intelligence Agent",
            "step_order": len(traces) + 1,
            "status": "completed",
            "reason": reason,
            "confidence": confidence,
            "duration_ms": duration_ms,
            "output": risk,
        }
    )

    return {
        "cod_risk_result": risk,
        "action_type": action_type,
        "action_title": title,
        "potential_impact": impact,
        "confidence": confidence,
        "completed_agents": completed,
        "traces": traces,
        "next_agent": "whatsapp_communication",
    }
