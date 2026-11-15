from __future__ import annotations

import json
import re
from typing import Any, Optional

from langchain_core.tools import tool

from backend.db.connection import get_sqlite_conn
from backend.db.vector_store import semantic_search_customers


def score_cod_order_risk_logic(
    *,
    is_first_time_buyer: bool,
    pincode: str,
    address: str,
    amount: float,
    prior_rto_count: int = 0,
) -> dict[str, Any]:
    """Deterministic explainable COD RTO risk scorer (preserved 1:1 with SELLVION business rules)."""
    score = 12
    reasons: list[str] = []

    if is_first_time_buyer:
        score += 24
        reasons.append("First-time buyer with no prior delivered orders")
    else:
        score -= 6

    if prior_rto_count and prior_rto_count > 0:
        score += 25
        reasons.append(f"{prior_rto_count} previous undelivered/returned order(s)")

    elevated_pincodes = {"141001", "800001", "226001", "395007"}
    if pincode.strip() in elevated_pincodes:
        score += 18
        reasons.append(f"Pincode {pincode} has elevated regional return history")

    addr = address.strip()
    has_unit_number = bool(re.search(r"\d+", addr)) and len(addr) >= 18
    if not has_unit_number:
        score += 18
        reasons.append("Delivery address appears incomplete (missing flat, house, or street number)")

    if amount >= 2500:
        score += 14
        reasons.append(f"High COD order value (₹{int(round(amount)):,})")

    score = max(5, min(95, score))
    band = "high" if score >= 60 else "moderate" if score >= 35 else "low"
    recommended_action = (
        "Verify address with customer or prepare an optional UPI prepayment request before dispatch."
        if band == "high"
        else "Confirm delivery address via WhatsApp before booking courier."
        if band == "moderate"
        else "Low risk — proceed with standard dispatch."
    )

    return {
        "score": score,
        "band": band,
        "reasons": reasons,
        "evidence": {
            "isFirstTimeBuyer": is_first_time_buyer,
            "hasUnitNumber": has_unit_number,
            "pincode": pincode,
            "orderAmount": amount,
            "priorRtoCount": prior_rto_count,
        },
        "recommendedAction": recommended_action,
    }


@tool
def fetch_customer_360_tool(business_id: str, customer_id: Optional[str] = None, query: Optional[str] = None) -> str:
    """Fetch Customer 360 profile or semantic matches from the merchant store database."""
    with get_sqlite_conn() as conn:
        if customer_id:
            row = conn.execute(
                "SELECT * FROM customers WHERE id = ? AND business_id = ?",
                (customer_id, business_id),
            ).fetchone()
            return json.dumps(row or {}, default=str)
        if query:
            matches = semantic_search_customers(business_id, query, top_k=5)
            return json.dumps(matches, default=str)
        rows = conn.execute(
            "SELECT id, name, city, segment, total_orders, total_spent, days_since_last_order, average_cadence_days, outstanding_udhaar "
            "FROM customers WHERE business_id = ? LIMIT 25",
            (business_id,),
        ).fetchall()
        return json.dumps(rows, default=str)


@tool
def score_cod_order_tool(
    is_first_time_buyer: bool,
    pincode: str,
    address: str,
    amount: float,
    prior_rto_count: int = 0,
) -> str:
    """Compute explainable COD return-to-origin (RTO) risk score, risk reasons, and UPI prepay guidance."""
    res = score_cod_order_risk_logic(
        is_first_time_buyer=is_first_time_buyer,
        pincode=pincode,
        address=address,
        amount=amount,
        prior_rto_count=prior_rto_count,
    )
    return json.dumps(res)


@tool
def fetch_udhaar_ledger_tool(business_id: str, customer_id: Optional[str] = None) -> str:
    """Fetch open customer credit (Udhaar / Khata) records and recent payments."""
    with get_sqlite_conn() as conn:
        if customer_id:
            rows = conn.execute(
                "SELECT * FROM udhaar_records WHERE business_id = ? AND customer_id = ?",
                (business_id, customer_id),
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT u.*, c.name AS customer_name, c.phone AS customer_phone
                FROM udhaar_records u
                JOIN customers c ON c.id = u.customer_id
                WHERE u.business_id = ? AND u.remaining_amount > 0
                ORDER BY u.remaining_amount DESC
                """,
                (business_id,),
            ).fetchall()
    return json.dumps(rows, default=str)


@tool
def evaluate_merchant_policy_tool(
    business_id: str,
    customer_id: str,
    action_type: str,
    confidence: int,
) -> str:
    """Inspect business autonomy settings, consent, opt-outs, quiet hours (9 PM-9 AM IST), and message caps."""
    from backend.agents.autonomy_policy import evaluate_policy_guard

    res = evaluate_policy_guard(
        business_id=business_id,
        customer_id=customer_id,
        action_type=action_type,
        confidence=confidence,
    )
    return json.dumps(res, default=str)


@tool
def calculate_roi_holdout_tool(business_id: str, range_key: str = "30d") -> str:
    """Compute observed revenue, holdout A/B cohort lift, and COD/Udhaar recovery metrics from store database."""
    from backend.agents.analytics_roi import compute_analytics_summary

    res = compute_analytics_summary(business_id=business_id, mode="demo", range_key=range_key)
    return json.dumps(res, default=str)


ALL_MERCHANT_TOOLS = [
    fetch_customer_360_tool,
    score_cod_order_tool,
    fetch_udhaar_ledger_tool,
    evaluate_merchant_policy_tool,
    calculate_roi_holdout_tool,
]
