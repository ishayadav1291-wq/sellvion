from __future__ import annotations

import httpx
import pytest

from backend.main import create_fastapi_app


@pytest.mark.anyio
async def test_fastapi_health_agents_and_compat_endpoints(isolated_env):
    app = create_fastapi_app()
    transport = httpx.ASGITransport(app=app)

    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        health = await client.get("/api/health")
        assert health.status_code == 200
        assert health.json()["engine"] == "langgraph+langchain+gemini"

        compat_agents = await client.get("/api/agents")
        assert compat_agents.status_code == 200
        assert len(compat_agents.json()["agents"]) == 5

        seven_agents = await client.get("/api/agentic/agents")
        assert seven_agents.status_code == 200
        assert len(seven_agents.json()["agents"]) == 7

        cod = await client.post(
            "/api/cod/score",
            json={"isFirstTimeBuyer": True, "pincode": "226001", "address": "Short", "amount": 2800},
        )
        assert cod.status_code == 200
        assert cod.json()["band"] == "high"

        voice = await client.post(
            "/api/ai/parse-voice-command",
            json={"transcript": "Show pending customer udhaar payments"},
        )
        assert voice.status_code == 200
        assert voice.json()["intent"] == "show_udhaar"

        copilot = await client.post("/api/ai/ask-copilot", json={"query": "How much udhaar is overdue?"})
        assert copilot.status_code == 200
        assert "1,850" in copilot.json()["reply"]


@pytest.mark.anyio
async def test_fastapi_workflow_edit_approve_and_analytics_flow(isolated_env):
    app = create_fastapi_app()
    transport = httpx.ASGITransport(app=app)

    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        wf_resp = await client.post(
            "/api/workflows/run",
            json={"workflowType": "udhaar_collection", "targetCustomerId": "CUST-UDHAAR"},
        )
        assert wf_resp.status_code == 201
        wf_data = wf_resp.json()
        approval_id = wf_data["approvalId"]
        thread_id = wf_data["threadId"]

        thread_resp = await client.get(f"/api/agentic/threads/{thread_id}")
        assert thread_resp.status_code == 200
        assert thread_resp.json()["interrupted"] is True

        edit_resp = await client.patch(
            f"/api/approvals/{approval_id}",
            json={"suggestedMessage": "Namaste Meera ji, custom updated payment reminder."},
        )
        assert edit_resp.status_code == 200
        assert "custom updated" in edit_resp.json()["approval"]["suggested_message"]

        dec_resp = await client.post(
            f"/api/approvals/{approval_id}/decision",
            json={"decision": "approve", "overrideQuietHours": True},
        )
        assert dec_resp.status_code == 200
        assert dec_resp.json()["status"] == "executed"

        analytics_resp = await client.get("/api/analytics/summary?range=30d")
        assert analytics_resp.status_code == 200
        summary = analytics_resp.json()
        assert summary["cohorts"]["engagedObservedRevenue"] == 1400.0
        assert summary["cohorts"]["holdoutObservedRevenue"] == 450.0


@pytest.mark.anyio
async def test_fastapi_live_mode_blocks_unconfigured_whatsapp_execution(isolated_env):
    app = create_fastapi_app()
    transport = httpx.ASGITransport(app=app)
    headers = {"Authorization": f"Bearer {isolated_env['live_token']}"}

    async with httpx.AsyncClient(transport=transport, base_url="http://testserver", headers=headers) as client:
        wf_resp = await client.post(
            "/api/workflows/run",
            json={"workflowType": "reactivation", "targetCustomerId": "CUST-LIVE-1"},
        )
        assert wf_resp.status_code == 201
        approval_id = wf_resp.json()["approvalId"]

        dec_resp = await client.post(
            f"/api/approvals/{approval_id}/decision",
            json={"decision": "approve", "overrideQuietHours": True},
        )
        assert dec_resp.status_code == 422
        assert dec_resp.json()["ok"] is False
        assert "WhatsApp Cloud API is not connected" in dec_resp.json()["message"]
