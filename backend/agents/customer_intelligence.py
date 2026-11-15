from __future__ import annotations

import time
from typing import Any

from backend.db.connection import get_sqlite_conn
from backend.db.vector_store import semantic_search_customers
from backend.schemas.models import SellvionAgentState


async def run_customer_intelligence_agent(state: SellvionAgentState) -> dict[str, Any]:
    """Agent 1: Customer profiling, segmentation, Customer 360 insights, and semantic retrieval."""
    started = time.perf_counter()
    business_id = state["business_id"]
    wf_type = state.get("workflow_type", "reactivation")
    target_cust_id = state.get("target_customer_id")
    target_order_id = state.get("target_order_id")

    customer: dict[str, Any] | None = state.get("customer")
    order: dict[str, Any] | None = state.get("order")

    with get_sqlite_conn() as conn:
        if target_order_id and not order:
            order = conn.execute(
                "SELECT * FROM orders WHERE id = ? AND business_id = ?",
                (target_order_id, business_id),
            ).fetchone()
            if order:
                customer = conn.execute(
                    "SELECT * FROM customers WHERE id = ? AND business_id = ?",
                    (order["customer_id"], business_id),
                ).fetchone()
        elif target_cust_id and not customer:
            customer = conn.execute(
                "SELECT * FROM customers WHERE id = ? AND business_id = ?",
                (target_cust_id, business_id),
            ).fetchone()
        elif wf_type == "cod_protection" and not order:
            order = conn.execute(
                """
                SELECT * FROM orders
                WHERE business_id = ? AND payment_mode = 'COD' AND status = 'Pending_Verification'
                ORDER BY cod_risk_score DESC LIMIT 1
                """,
                (business_id,),
            ).fetchone()
            if order:
                customer = conn.execute(
                    "SELECT * FROM customers WHERE id = ? AND business_id = ?",
                    (order["customer_id"], business_id),
                ).fetchone()
        elif wf_type == "udhaar_collection" and not customer:
            customer = conn.execute(
                """
                SELECT * FROM customers
                WHERE business_id = ? AND outstanding_udhaar > 0
                ORDER BY outstanding_udhaar DESC LIMIT 1
                """,
                (business_id,),
            ).fetchone()
        elif not customer:
            customer = conn.execute(
                """
                SELECT * FROM customers
                WHERE business_id = ?
                  AND (segment IN ('reorder_due', 'inactive', 'at_risk') OR days_since_last_order >= average_cadence_days)
                ORDER BY days_since_last_order DESC LIMIT 1
                """,
                (business_id,),
            ).fetchone()

    duration_ms = max(8, int((time.perf_counter() - started) * 1000))
    completed = list(state.get("completed_agents") or [])
    completed.append("customer_intelligence")
    traces = list(state.get("traces") or [])

    if not customer and wf_type not in ("copilot_qa", "analytics_roi"):
        reason = "No matching customer or order found in store records yet."
        traces.append(
            {
                "agent_id": "customer_intelligence",
                "agent_name": "Customer Intelligence Agent",
                "step_order": len(traces) + 1,
                "status": "escalated",
                "reason": reason,
                "confidence": 100,
                "duration_ms": duration_ms,
                "output": {},
            }
        )
        return {
            "customer": None,
            "order": None,
            "completed_agents": completed,
            "traces": traces,
            "status": "escalated",
            "current_step": "understand",
            "error_message": "No eligible customer or order found for this workflow.",
            "final_message": "No matching customer or order found in your store records yet. Import customers or orders to run this workflow.",
            "next_agent": "complete",
        }

    # Semantic search enrichment when copilot query exists or for peer similarity insight
    query_text = state.get("user_query") or (
        f"{customer.get('primary_category', '')} {customer.get('segment', '')}" if customer else ""
    )
    similar = semantic_search_customers(business_id, query_text, top_k=3) if query_text else []

    if customer:
        total_orders = int(customer.get("total_orders", 0) or 0)
        total_spent = float(customer.get("total_spent", 0) or 0)
        udhaar = float(customer.get("outstanding_udhaar", 0) or 0)
        reason = (
            f"Loaded Customer 360 profile for {customer['name']} "
            f"({total_orders} orders, ₹{int(round(total_spent)):,} spend, ₹{int(round(udhaar)):,} udhaar)."
        )
        insight = {
            "customer_id": customer["id"],
            "segment": customer.get("segment", "regular"),
            "cadence_days": customer.get("average_cadence_days", 30),
            "days_since_last_order": customer.get("days_since_last_order", 0),
            "cod_reliability_score": customer.get("cod_reliability_score", 85),
            "similar_profiles": similar,
        }
    else:
        reason = f"Indexed {len(similar)} semantic customer profiles for store-wide query context."
        insight = {"similar_profiles": similar}

    traces.append(
        {
            "agent_id": "customer_intelligence",
            "agent_name": "Customer Intelligence Agent",
            "step_order": len(traces) + 1,
            "status": "completed",
            "reason": reason,
            "confidence": 92,
            "duration_ms": duration_ms,
            "output": insight,
        }
    )

    # Conditional routing after Customer Intelligence Agent
    if wf_type == "cod_protection":
        next_agent = "cod_risk_intelligence"
    elif wf_type == "udhaar_collection":
        next_agent = "udhaar_management"
    elif wf_type in ("copilot_qa", "analytics_roi"):
        next_agent = "analytics_roi"
    else:
        next_agent = "marketing_retention"

    return {
        "customer": customer,
        "order": order,
        "customer_360_insight": insight,
        "completed_agents": completed,
        "traces": traces,
        "current_step": "decide",
        "next_agent": next_agent,
    }
