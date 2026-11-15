from __future__ import annotations

from datetime import datetime, timezone
import time
from typing import Any

from backend.db.connection import get_sqlite_conn
from backend.schemas.models import SellvionAgentState


def compute_days_overdue(due_date_str: str) -> int:
    if not due_date_str:
        return 0
    try:
        due = datetime.fromisoformat(due_date_str.replace("Z", "+00:00"))
        if due.tzinfo is None:
            due = due.replace(tzinfo=timezone.utc)
        return max(0, (datetime.now(timezone.utc) - due).days)
    except ValueError:
        return 0


async def run_udhaar_management_agent(state: SellvionAgentState) -> dict[str, Any]:
    """Agent 4: Customer credit tracking, overdue analysis, payment history insights, and reminder prep."""
    started = time.perf_counter()
    business_id = state["business_id"]
    customer = state.get("customer") or {}
    customer_id = str(customer.get("id", ""))
    outstanding = float(customer.get("outstanding_udhaar", 0) or 0)
    due_date = str(customer.get("udhaar_due_date") or "")
    days_overdue = compute_days_overdue(due_date)

    with get_sqlite_conn() as conn:
        recent_payments = conn.execute(
            """
            SELECT amount, method, paid_at FROM payments
            WHERE business_id = ? AND customer_id = ? AND status = 'captured'
            ORDER BY paid_at DESC LIMIT 3
            """,
            (business_id, customer_id),
        ).fetchall()

    confidence = 91 if days_overdue >= 0 else 85
    reason = (
        f"Pending udhaar of ₹{int(round(outstanding)):,} "
        f"({'%d days overdue' % days_overdue if days_overdue > 0 else 'due ' + (due_date or 'soon')}). "
        f"Prior recorded payments: {len(recent_payments)}."
    )
    title = f"Udhaar Follow-Up: {customer.get('name', 'Customer')}"
    impact = f"Follow up on ₹{int(round(outstanding)):,} balance"

    udhaar_summary = {
        "outstanding_udhaar": outstanding,
        "due_date": due_date,
        "days_overdue": days_overdue,
        "recent_payments": recent_payments,
    }

    duration_ms = max(8, int((time.perf_counter() - started) * 1000))
    completed = list(state.get("completed_agents") or [])
    completed.append("udhaar_management")
    traces = list(state.get("traces") or [])
    traces.append(
        {
            "agent_id": "udhaar_management",
            "agent_name": "Udhaar Management Agent",
            "step_order": len(traces) + 1,
            "status": "completed",
            "reason": reason,
            "confidence": confidence,
            "duration_ms": duration_ms,
            "output": udhaar_summary,
        }
    )

    return {
        "udhaar_result": udhaar_summary,
        "action_type": "udhaar_reminder",
        "action_title": title,
        "potential_impact": impact,
        "confidence": confidence,
        "completed_agents": completed,
        "traces": traces,
        "next_agent": "whatsapp_communication",
    }
