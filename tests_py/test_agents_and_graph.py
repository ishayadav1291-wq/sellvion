from __future__ import annotations

import sqlite3
import pytest

from backend.agents.autonomy_policy import evaluate_policy_guard, is_time_in_quiet_hours
from backend.agents.whatsapp_communication import generate_whatsapp_message
from backend.graph.workflow import get_thread_state, invoke_workflow, resume_workflow_approval
from backend.tools.merchant_tools import score_cod_order_risk_logic


def test_cod_risk_scoring_high_risk_and_low_risk():
    high = score_cod_order_risk_logic(
        is_first_time_buyer=True,
        pincode="226001",
        address="Near market",
        amount=3200,
        prior_rto_count=1,
    )
    assert high["score"] >= 80
    assert high["band"] == "high"
    assert len(high["reasons"]) >= 4

    low = score_cod_order_risk_logic(
        is_first_time_buyer=False,
        pincode="302001",
        address="Flat 402, Heritage Residency, MI Road, Jaipur",
        amount=850,
        prior_rto_count=0,
    )
    assert low["band"] == "low"
    assert low["score"] < 35


def test_policy_guard_quiet_hours_consent_and_optout(isolated_env):
    db_path = isolated_env["db_path"]

    # 9 PM - 9 AM IST quiet hours check
    assert is_time_in_quiet_hours("21:00", "09:00", current_hour=22) is True
    assert is_time_in_quiet_hours("21:00", "09:00", current_hour=2) is True
    assert is_time_in_quiet_hours("21:00", "09:00", current_hour=14) is False

    # Opted-out & no-consent customer blocked
    blocked = evaluate_policy_guard(
        business_id="BIZ-TEST-001",
        customer_id="CUST-OPTOUT",
        action_type="reorder_reminder",
        confidence=95,
        current_ist_hour=14,
        db_path=db_path,
    )
    assert blocked["allowed"] is False
    assert blocked["checks"]["consentOk"] is False
    assert blocked["checks"]["notOptedOut"] is False

    # Consented customer allowed during quiet hours only if override_quiet_hours=True; flagged otherwise
    quiet = evaluate_policy_guard(
        business_id="BIZ-TEST-001",
        customer_id="CUST-REORDER",
        action_type="reorder_reminder",
        confidence=90,
        override_quiet_hours=False,
        current_ist_hour=22,
        db_path=db_path,
    )
    assert quiet["checks"]["withinQuietHours"] is False
    assert quiet["requiresApproval"] is True


@pytest.mark.anyio
async def test_whatsapp_agent_deterministic_fallback_languages(isolated_env):
    hinglish = await generate_whatsapp_message(
        customer_name="Meera",
        action_type="udhaar_reminder",
        language="hinglish",
        udhaar_amount=1850,
    )
    assert "Meera" in hinglish["draft"]
    assert "1,850" in hinglish["draft"]
    assert hinglish["model"] == "template-engine"

    hindi = await generate_whatsapp_message(
        customer_name="आरव",
        product_name="हल्दी पाउडर",
        action_type="reorder_reminder",
        language="hi",
    )
    assert "नमस्ते" in hindi["draft"]


@pytest.mark.anyio
async def test_langgraph_reactivation_hitl_interrupt_and_resume_approve(isolated_env):
    db_path = isolated_env["db_path"]
    ckpt_path = isolated_env["ckpt_path"]

    # Step 1: Run LangGraph workflow -> pauses at Autonomy & Policy Agent interrupt()
    wf = await invoke_workflow(
        business_id="BIZ-TEST-001",
        user_id=None,
        workflow_type="reactivation",
        target_customer_id="CUST-REORDER",
        mode="demo",
        checkpoint_path=ckpt_path,
        db_path=db_path,
    )
    assert wf["status"] == "awaiting_approval"
    assert wf["interrupted"] is True
    assert wf["approvalId"] is not None
    thread_id = wf["threadId"]

    agent_names = [t["agentName"] for t in wf["tasks"]]
    assert "Central Supervisor Router" in agent_names
    assert "Customer Intelligence Agent" in agent_names
    assert "Marketing & Retention Agent" in agent_names
    assert "WhatsApp Communication Agent" in agent_names
    assert "Autonomy & Policy Agent" in agent_names

    # Verify thread checkpoint is paused waiting on HITL
    state_snap = await get_thread_state(thread_id=thread_id, checkpoint_path=ckpt_path)
    assert state_snap is not None
    assert state_snap["interrupted"] is True

    # Step 2: Deduplication guard blocks duplicate workflow within 15 mins
    dup = await invoke_workflow(
        business_id="BIZ-TEST-001",
        user_id=None,
        workflow_type="reactivation",
        target_customer_id="CUST-REORDER",
        mode="demo",
        checkpoint_path=ckpt_path,
        db_path=db_path,
    )
    assert dup.get("deduplicated") is True
    assert dup["approvalId"] == wf["approvalId"]

    # Step 3: Resume LangGraph HITL interrupt with merchant approval
    resumed = await resume_workflow_approval(
        thread_id=thread_id,
        decision_payload={"decision": "approve", "overrideQuietHours": True},
        checkpoint_path=ckpt_path,
    )
    assert resumed["ok"] is True
    assert resumed["status"] == "executed"

    # Verify DB persistence: approval executed, simulated WhatsApp logged, Analytics & ROI completed
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    app_row = conn.execute("SELECT status FROM approvals WHERE id = ?", (wf["approvalId"],)).fetchone()
    msg_row = conn.execute("SELECT status FROM message_history WHERE approval_id = ?", (wf["approvalId"],)).fetchone()
    wf_row = conn.execute("SELECT status, current_step FROM agent_workflows WHERE id = ?", (wf["workflowId"],)).fetchone()
    conn.close()

    assert app_row["status"] == "executed"
    assert msg_row["status"] == "simulated"
    assert wf_row["status"] == "completed"
    assert wf_row["current_step"] == "measure"


@pytest.mark.anyio
async def test_langgraph_cod_and_udhaar_routes_and_reject_resume(isolated_env):
    db_path = isolated_env["db_path"]
    ckpt_path = isolated_env["ckpt_path"]

    # COD Protection route: Supervisor -> Customer Intel -> COD Risk Intel -> WhatsApp -> Policy
    cod_wf = await invoke_workflow(
        business_id="BIZ-TEST-001",
        user_id=None,
        workflow_type="cod_protection",
        target_order_id="ORD-COD-1",
        mode="demo",
        checkpoint_path=ckpt_path,
        db_path=db_path,
    )
    assert cod_wf["status"] == "awaiting_approval"
    cod_agents = [t["agentName"] for t in cod_wf["tasks"]]
    assert "COD Risk Intelligence Agent" in cod_agents

    # Reject via LangGraph resume
    rejected = await resume_workflow_approval(
        thread_id=cod_wf["threadId"],
        decision_payload={"decision": "reject", "reason": "Verified by phone"},
        checkpoint_path=ckpt_path,
    )
    assert rejected["ok"] is True
    assert rejected["status"] == "rejected"

    # Udhaar Collection route: Supervisor -> Customer Intel -> Udhaar Mgmt -> WhatsApp -> Policy
    udh_wf = await invoke_workflow(
        business_id="BIZ-TEST-001",
        user_id=None,
        workflow_type="udhaar_collection",
        target_customer_id="CUST-UDHAAR",
        mode="demo",
        checkpoint_path=ckpt_path,
        db_path=db_path,
    )
    assert udh_wf["status"] == "awaiting_approval"
    udh_agents = [t["agentName"] for t in udh_wf["tasks"]]
    assert "Udhaar Management Agent" in udh_agents


@pytest.mark.anyio
async def test_langgraph_policy_blocks_optout_customer(isolated_env):
    db_path = isolated_env["db_path"]
    ckpt_path = isolated_env["ckpt_path"]

    res = await invoke_workflow(
        business_id="BIZ-TEST-001",
        user_id=None,
        workflow_type="reactivation",
        target_customer_id="CUST-OPTOUT",
        mode="demo",
        checkpoint_path=ckpt_path,
        db_path=db_path,
    )
    assert res["status"] == "escalated"
    assert "Policy blocked" in res["message"]
