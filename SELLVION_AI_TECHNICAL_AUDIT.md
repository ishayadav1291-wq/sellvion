# SELLVION — AI / AGENTIC AI TECHNICAL STACK AUDIT

**Repository:** `https://github.com/ishayadav1291-wq/sellvion` (audited alongside local workspace baseline `726fa02`)  
**Migration Date:** November 15, 2026  
**Scope:** Strictly backend AI / Multi-Agent Architecture Migration (`src/` frontend untouched 100%)

---

## 1. Executive Summary

SELLVION's backend AI & multi-agent orchestration layer has been migrated from sequential Node.js procedural handlers (`server/services/agents.ts`, `server/services/geminiService.ts`) to a **Python 3.12.16 / FastAPI / Pydantic v2 / Asyncio** backend powered by **LangGraph 1.2.22**, **LangChain 1.5.0**, **LangSmith 0.14.17**, and **Google Gemini (`langchain-google-genai 4.5.0`, `gemini-4-hydrogen`)**.

- **100% Frontend Preservation:** Zero files in `src/` or `index.html` were modified (`git diff --name-only src/ index.html` is empty). All UI workflows, layouts, modals, animations, Approval Inbox, Customer 360, COD Shield, Udhaar Ledger, WhatsApp Simulator, Holdout ROI Calculator, and Earned Autonomy controls behave identically.
- **Genuine Agentic Graph:** A Central Supervisor Router coordinates 7 specialized agents over a shared typed `SellvionAgentState` with conditional routing, LangChain `@tool` tools, Pydantic structured outputs, `AsyncSqliteSaver` / `AsyncPostgresSaver` workflow checkpointing, and real LangGraph `interrupt()` / `Command(resume=...)` Human-in-the-Loop approval checkpoints.
- **Zero-Downtime Bridge Compatibility:** `server.ts` continues serving the React/Vite app and non-AI commerce/auth routes on port 3000 while bridging AI, Workflow, Approval, COD Scoring, Udhaar Reminder, and Analytics endpoints to the FastAPI ASGI service (`http://127.0.0.1:8010`) with seamless fallback if FastAPI is offline.

---

## 2. Repository Audit (Baseline Before Migration)

Audit performed against both `https://github.com/ishayadav1291-wq/sellvion` and `/app/applet`:

| Layer | Pre-Migration Stack | Observations |
|---|---|---|
| **Frontend (`src/`)** | React 19.0.1, TypeScript, Vite 8.3, Tailwind CSS 4.3, `motion`, `lucide-react` | `AgenticHeroCanvas.tsx` + `MerchantWorkspace.tsx` (`src/components/workspace/*`); calls `/api/*` JSON contracts |
| **Web Server / Routes (`server.ts`, `server/routes/*`)** | Express 4.21.2 (`tsx`), `node:sqlite`, AES-256-GCM credential encryption, Shopify/Meta/Shiprocket/Razorpay handlers | Single-process Node app on port 3000; Vite middleware in dev |
| **Previous Agent Engine (`server/services/agents.ts`)** | Sequential TypeScript functions simulating 5 logical agent steps (`SPECIALIZED_AGENTS`) | No LangGraph graph state, no checkpoint persistence, no `interrupt()` HITL resume, no semantic vector index |
| **Previous LLM Layer (`server/services/geminiService.ts`)** | Direct `@google/genai` REST helper with `gemini-2.5-flash` and template fallbacks | Direct HTTP wrapper; no LangChain prompt templates, structured Pydantic parsing, or LangSmith tracing |
| **Database (`migrations/001_init.sql`)** | SQLite WAL (`data/sellvion.db`) with 17 relational tenant-isolated tables (`businesses`, `customers`, `orders`, `udhaar_records`, `agent_workflows`, `agent_tasks`, `approvals`, `analytics_events`, `audit_logs`, etc.) | Shared source of truth preserved without breaking existing Node auth/import/webhook flows |

---

## 3. Architecture Before vs. After Migration

### Before (Node/Express Sequential Orchestrator)
```
Frontend (React/Vite)
   │ HTTP /api/*
   ▼
Express (server.ts:3000)
   ├── authRoutes / commerceRoutes / agentRoutes
   └── server/services/agents.ts (sequential TS calls)
         └── @google/genai (gemini-2.5-flash)
         └── SQLite (data/sellvion.db)
```

### After (Express API Gateway + Python 3.12 FastAPI + LangGraph Multi-Agent Stack)
```
Frontend (React/Vite — 100% Untouched)
   │ HTTP /api/*
   ▼
Express Gateway (server.ts:3000)
   ├── Auth / CSV Import / Shopify Sync / Webhooks / Static & Vite
   └── pythonAgentBridge.ts (proxies AI, Agents, Workflows, Approvals, COD, Analytics)
         │ HTTP (http://127.0.0.1:8010, verified via X-Sellvion-Service: agentic-fastapi)
         ▼
FastAPI ASGI Service (backend/main.py — Python 3.12.16 + Asyncio + Pydantic v2)
   ├── LangGraph StateGraph (backend/graph/workflow.py)
   │     ├── START ─▶ supervisor (Central Supervisor Router)
   │     ├── customer_intelligence (Agent 1 + Vector Semantic Search)
   │     ├── cod_risk_intelligence (Agent 3)
   │     ├── udhaar_management (Agent 4)
   │     ├── marketing_retention (Agent 5)
   │     ├── whatsapp_communication (Agent 2 + ChatGoogleGenerativeAI gemini-4-hydrogen)
   │     ├── autonomy_policy (Agent 6 + 9 PM–9 AM IST Quiet Hours + LangGraph interrupt())
   │     └── analytics_roi (Agent 7 + Holdout A/B Lift + Command(resume) Execution)
   ├── Checkpointer: AsyncSqliteSaver (default) / AsyncPostgresSaver (PostgreSQL URI)
   ├── Cache: redis.asyncio (when REDIS_URL set) / Async TTL fallback
   ├── Tracing: LangSmith (when LANGCHAIN_TRACING_V2=true & LANGSMITH_API_KEY set)
   └── Shared Database: data/sellvion.db (+ pgvector PostgreSQL schema ready)
```

---

## 4. Complete Project Folder Structure (Post-Migration)

```
.
├── .env.example                          # Documented Gemini, LangSmith, DB, Checkpoint, Redis, Bridge vars
├── .gitignore                            # Excludes .venv/, __pycache__/, .pytest_cache/
├── pyproject.toml                        # Python >=3.12 dependencies & pytest configuration
├── requirements.txt                      # Pinned Python 3.12 production dependencies
├── server.ts                             # Express server (mounts pythonAgentBridgeMiddleware)
├── server/services/pythonAgentBridge.ts  # Fault-tolerant HTTP bridge + X-Sellvion-Service guard
├── migrations/001_init.sql               # Preserved relational SQLite schema
├── src/                                  # 100% UNCHANGED React/TypeScript/Vite frontend
├── backend/
│   ├── __init__.py
│   ├── main.py                           # FastAPI app, CORS, lifespan, X-Sellvion-Service middleware
│   ├── config/settings.py                # Pydantic BaseSettings env & DSN resolver
│   ├── schemas/models.py                 # SellvionAgentState TypedDict, structured outputs, FastAPI schemas
│   ├── db/
│   │   ├── connection.py                 # SQLite WAL, tenant auth resolver, AsyncSqliteSaver / AsyncPostgresSaver
│   │   ├── vector_store.py               # 64-dim cosine similarity customer memory index
│   │   └── postgres_schema.sql           # Production PostgreSQL + pgvector DDL schema
│   ├── cache/redis_cache.py              # Async Redis cache with in-memory TTL fallback
│   ├── llm/provider.py                   # LLMProvider wrapping ChatGoogleGenerativeAI + timeout fallback
│   ├── prompts/templates.py              # LangChain ChatPromptTemplate prompts
│   ├── tools/merchant_tools.py           # 5 LangChain @tool tools + deterministic COD scoring
│   ├── agents/
│   │   ├── __init__.py                   # 7 Specialized Agents catalog
│   │   ├── supervisor.py                 # Central Supervisor Router & Voice Intent Classifier
│   │   ├── customer_intelligence.py      # Agent 1: Customer Intelligence Agent
│   │   ├── whatsapp_communication.py     # Agent 2: WhatsApp Communication Agent
│   │   ├── cod_risk.py                   # Agent 3: COD Risk Intelligence Agent
│   │   ├── udhaar_management.py          # Agent 4: Udhaar Management Agent
│   │   ├── marketing_retention.py        # Agent 5: Marketing & Retention Agent
│   │   ├── autonomy_policy.py            # Agent 6: Autonomy & Policy Agent (with LangGraph interrupt())
│   │   └── analytics_roi.py              # Agent 7: Analytics & ROI Agent
│   ├── graph/workflow.py                 # StateGraph, conditional edges, dedup, invoke/resume/thread state
│   └── api/routes.py                     # FastAPI REST endpoints (frontend-compatible + /api/agentic/*)
└── tests_py/
    ├── conftest.py                       # Isolated SQLite + checkpoint DB fixtures (synthetic test data)
    ├── test_agents_and_graph.py          # Unit + LangGraph HITL interrupt/resume + Policy Guard tests
    └── test_fastapi_endpoints.py         # ASGI httpx FastAPI compatibility + Live-mode guardrail tests
```

---

## 5. Preserved Frontend Guarantee

- Verified command: `git diff --name-only src/ index.html` returned **0 modified files**.
- Frontend continues calling `/api/agents`, `/api/workflows`, `/api/workflows/run`, `/api/approvals`, `/api/approvals/:id/decision`, `/api/cod/score`, `/api/udhaar/:id/prepare-reminder`, `/api/ai/draft-message`, `/api/ai/ask-copilot`, `/api/ai/parse-voice-command`, and `/api/analytics/summary` without a single payload or component change.
- `GET /api/agents` preserves the exact 5 UI agent roster keys expected by the Hero/Console preview while aggregating live run counts from the new 7-agent execution table (`agent_tasks`).
- `GET /api/agentic/agents` and workflow task traces expose all 7 LangGraph agents + the Central Supervisor Router.

---

## 6. Specialized AI Agents & Responsibilities

| # | Agent | Module | Responsibilities & Outputs |
|---|---|---|---|
| Router | **Central Supervisor Router** | `backend/agents/supervisor.py` | Routes workflow intent (`reactivation`, `cod_protection`, `udhaar_collection`, `reorder_scan`, `copilot_qa`, `analytics_roi`) & voice transcripts using deterministic fast-path + LangChain structured Gemini routing (`SupervisorRouteDecision`). |
| 1 | **Customer Intelligence Agent** | `backend/agents/customer_intelligence.py` | Queries customer/order DB rows, builds Customer 360 insights (`segment`, cadence, COD score, spend), and computes semantic peer similarity via `vector_store.py`. |
| 2 | **WhatsApp Communication Agent** | `backend/agents/whatsapp_communication.py` | Generates personalized WhatsApp drafts in Hinglish, Hindi, or English via `ChatGoogleGenerativeAI` structured output (`WhatsAppDraftOutput`) with template-engine fallback; never dispatches directly. |
| 3 | **COD Risk Intelligence Agent** | `backend/agents/cod_risk.py` | Scores COD RTO risk (`5–95`), explains risk drivers (first-time buyer, incomplete address, elevated pincode, high order value, prior RTO), and decides `cod_prepay` vs `cod_verify`. |
| 4 | **Udhaar Management Agent** | `backend/agents/udhaar_management.py` | Calculates overdue windows from `udhaar_due_date`, pulls prior captured payments, and prepares `udhaar_reminder` recommendations. |
| 5 | **Marketing & Retention Agent** | `backend/agents/marketing_retention.py` | Evaluates repeat-purchase cadence gaps, respects merchant `max_discount_pct` bounds, and outputs `RetentionCampaignOutput` (`reorder_reminder` vs `winback_offer`). |
| 6 | **Autonomy & Policy Agent** | `backend/agents/autonomy_policy.py` | Enforces WhatsApp consent, `STOP` opt-outs, emergency pause, 48-hour frequency caps, `9 PM–9 AM IST` quiet hours, and Earned Autonomy thresholds; creates persistent approval items and invokes `langgraph.types.interrupt()` for Human-in-the-Loop gating. |
| 7 | **Analytics & ROI Agent** | `backend/agents/analytics_roi.py` | Resumes post-approval execution (Demo simulated or Live Meta Graph API), computes Holdout vs Engaged cohort A/B revenue lift, and runs store-grounded Copilot Q&A. |

---

## 7. LangGraph Multi-Agent Orchestration Design

1. **Shared Typed State (`SellvionAgentState`):** Carries tenant context (`business_id`, `user_id`, `mode`), routing control (`next_agent`, `completed_agents`), domain results (`customer_360_insight`, `cod_risk_result`, `udhaar_result`, `retention_strategy`, `draft_result`, `policy_result`, `roi_result`), HITL state (`approval_id`, `requires_approval`, `human_decision`), and per-step execution traces (`traces`).
2. **Conditional Graph Edges (`backend/graph/workflow.py`):**
   - `START -> supervisor -> customer_intelligence`
   - `customer_intelligence -> cod_risk_intelligence | udhaar_management | marketing_retention | analytics_roi`
   - Branch agents -> `whatsapp_communication -> autonomy_policy -> analytics_roi -> END`
   - Blocked/empty targets short-circuit safely to `END` with `status='escalated'`.
3. **Workflow Checkpointing & HITL Resume:**
   - Every invocation receives a `thread_id` (`thread-WF-...`) backed by `AsyncSqliteSaver` (`data/langgraph_checkpoints.db`) or `AsyncPostgresSaver` when `DATABASE_URL` uses PostgreSQL.
   - `run_autonomy_policy_agent` persists `langgraph_threads` and `approvals` idempotently before invoking `interrupt(...)`.
   - When the merchant clicks Approve / Retry / Reject in the UI, `/api/approvals/{id}/decision` calls `resume_workflow_approval(thread_id, Command(resume=...))` to resume the exact graph thread cleanly into `analytics_roi`.

---

## 8. LangChain & LangSmith Integration

- **LLM Abstraction (`backend/llm/provider.py`):** Wraps `langchain_google_genai.ChatGoogleGenerativeAI` configured via `LLM_PROVIDER`, `GEMINI_MODEL`, `GEMINI_API_KEY`, and `LLM_TIMEOUT_SECONDS`. Zero deprecated `gemini-1.5-*` or `gemini-2.0-*` models used; defaults to active `gemini-4-hydrogen`.
- **Structured Outputs & Prompts (`backend/prompts/templates.py`):** Uses `ChatPromptTemplate` chained with `.with_structured_output(PydanticModel)` (`SupervisorRouteDecision`, `WhatsAppDraftOutput`, `VoiceIntentOutput`, `RetentionCampaignOutput`) plus `asyncio.wait_for()` timeout protection and deterministic fallback.
- **LangChain Tools (`backend/tools/merchant_tools.py`):** Provides 5 typed `@tool` bindings (`fetch_customer_360_tool`, `score_cod_order_tool`, `fetch_udhaar_ledger_tool`, `evaluate_merchant_policy_tool`, `calculate_roi_holdout_tool`).
- **LangSmith Tracing:** `ensure_llm_tracing_env()` populates `LANGCHAIN_TRACING_V2`, `LANGCHAIN_API_KEY`, `LANGCHAIN_PROJECT`, and `LANGCHAIN_ENDPOINT` cleanly at FastAPI startup when configured, and attaches tenant/mode metadata tags on every `graph.ainvoke()` call.

---

## 9. Database, Vector Memory, Checkpointing & Caching Strategy

- **Primary Operational Store:** Continues sharing `data/sellvion.db` (SQLite WAL) with Express so authentication sessions, CSV imports, Shopify syncs, Meta webhooks, and agent approvals remain 100% unified without data duplication or drift.
- **Auxiliary Agentic Tables:** `customer_memory_embeddings` (64-dim unit vector customer profiles for cosine similarity retrieval) and `langgraph_threads` (thread-to-workflow/approval mapping).
- **PostgreSQL + pgvector Readiness (`backend/db/postgres_schema.sql`):** Full normalized Postgres DDL with `VECTOR(64)` column and `ivfflat` cosine similarity index, paired with `AsyncPostgresSaver` support in `backend/db/connection.py` when `DATABASE_URL=postgresql://...`.
- **Caching (`backend/cache/redis_cache.py`):** Uses `redis.asyncio` when `REDIS_URL` is configured, falling back transparently to an async in-memory TTL store (`analytics:{business_id}:{range}` cache, invalidated on any workflow or approval mutation).

---

## 10. Safety, Human Approval & Earned Autonomy Preservation

Every existing safety guardrail is preserved and enforced inside `evaluate_policy_guard()` and `run_autonomy_policy_agent()`:
- **WhatsApp Consent & STOP Opt-Out:** Blocked automatically (`status='escalated'`) if `consent_whatsapp == 0` or `opted_out == 1`.
- **Emergency Pause All:** Blocks all automated execution immediately if `emergency_pause_all == 1`.
- **48-Hour Frequency Cap:** Enforces `max_daily_messages` count over `datetime('now', '-48 hours')`.
- **9 PM–9 AM IST Quiet Hours:** Enforced via `ZoneInfo("Asia/Kolkata")` comparing IST hour against `quiet_hours_start`/`quiet_hours_end`.
- **Live-Mode Credential Verification:** In `mode == "live"`, `execute_approved_action_db()` verifies `integration_accounts` status (`connected`) and decrypts AES-256-GCM Meta WhatsApp credentials before sending via Meta Graph API v20.0; unconfigured live accounts fail loudly (`HTTP 422`) rather than faking delivery.
- **15-Minute Idempotency Deduplication & Audit Trail:** Duplicate triggers reuse pending Inbox items; all edits, rejections, snoozes, escalations, and dispatches write immutable `audit_logs`.

---

## 11. Environment Configuration (`.env.example`)

Updated `.env.example` documents all required and optional variables without storing any secrets:
- `GEMINI_API_KEY`, `LLM_PROVIDER`, `GEMINI_MODEL="gemini-4-hydrogen"`, `LLM_TIMEOUT_SECONDS`
- `LANGCHAIN_TRACING_V2`, `LANGSMITH_ENDPOINT`, `LANGSMITH_API_KEY`, `LANGSMITH_PROJECT`
- `DATABASE_URL`, `LANGGRAPH_CHECKPOINT_URL`
- `REDIS_URL`
- `FASTAPI_PORT="8010"`, `FASTAPI_AGENT_URL="http://127.0.0.1:8010"`, `APP_URL`, `SESSION_SECRET`, `WHATSAPP_VERIFY_TOKEN`

---

## 12. Pinned Python Dependencies (`requirements.txt` & `pyproject.toml`)

- Runtime: `Python 3.12.16`
- Core API: `fastapi==0.163.0`, `uvicorn==0.54.0`, `pydantic==2.14.3`, `pydantic-settings==2.16.3`, `httpx==0.28.1`
- Agentic Stack: `langgraph==1.2.22`, `langgraph-checkpoint==4.3.2`, `langgraph-checkpoint-sqlite==3.1.3`, `langgraph-checkpoint-postgres==3.2.1`, `langchain==1.5.0`, `langchain-core==1.8.0`, `langchain-google-genai==4.5.0`, `langsmith==0.14.17`
- Storage & Cache Adapters: `aiosqlite==0.22.1`, `psycopg[binary]==3.3.9`, `pgvector==0.5.1`, `redis==8.1.0`, `cryptography`

---

## 13. Live Verification Results & Honest Limitations

### Verified Automatically & Live in Workspace
1. **Python Unit & LangGraph Integration Suite (`.venv/bin/pytest -v tests_py`):** **9 / 9 tests PASSED**.
   - Verified deterministic COD scoring, 9 PM–9 AM IST quiet hours & opt-out blocks, Hindi/Hinglish/English WhatsApp drafting, full `StateGraph` conditional routing across `reactivation`, `cod_protection`, and `udhaar_collection`, 15-minute deduplication, `AsyncSqliteSaver` checkpoint persistence, LangGraph `interrupt()` pause & `Command(resume=...)` approve/reject execution, FastAPI ASGI contract parity, and Live-mode unconfigured Meta WhatsApp fail-closed protection.
2. **TypeScript & Vite Compilation (`npm run lint` / `compile_applet`):** **0 errors**.
3. **Express-to-FastAPI Bridge Verification:**
   - Verified `http://127.0.0.1:3000/api/agentic/agents` returns `HTTP/1.1 200 OK` with header `X-Sellvion-Engine: fastapi-langgraph` while FastAPI listens on port `8010`.
   - Verified graceful Node fallback (`HTTP/1.1 200 OK` from Express handlers) when FastAPI on port `8010` is stopped.
   - Confirmed port `8000` inside this container environment is occupied by `control-plane-a`; switched FastAPI default port cleanly to `8010` with strict `X-Sellvion-Service: agentic-fastapi` header validation on the Express bridge.

### Explicitly Unverified (Infrastructure / Credentials Absent in Container)
- **Live Gemini API Calls:** Not executed live because `GEMINI_API_KEY` is unset in this sandbox; verified code wiring (`ChatGoogleGenerativeAI` kwargs & signature) and deterministic fallback paths.
- **Remote LangSmith UI Traces:** `LANGSMITH_API_KEY` is unset; environment propagation is wired and verified locally, remote ingestion unverified.
- **External PostgreSQL + pgvector & Redis Daemons:** Neither Postgres nor Redis servers run in this container; `postgres_schema.sql`, `AsyncPostgresSaver`, and `redis.asyncio` client paths are implemented and import-verified, while runtime tests exercised SQLite WAL + `AsyncSqliteSaver` + async in-memory TTL cache.

---

## 14. Key Implementation Excerpts

### LangGraph Topology & Checkpointing (`backend/graph/workflow.py`)
```python
def build_sellvion_graph(checkpointer: Any = None):
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
    # Conditional edges route supervisor & specialized agents dynamically via state["next_agent"]
    return builder.compile(checkpointer=checkpointer)
```

### Human-in-the-Loop Pause & Resume (`backend/agents/autonomy_policy.py` & `backend/graph/workflow.py`)
```python
if requires_approval:
    human_decision = interrupt({
        "approval_id": approval_id,
        "workflow_id": workflow_id,
        "action_type": action_type,
        "title": title,
        "customer_name": customer.get("name"),
        "suggested_message": draft_text,
    })
```
```python
result_state = await graph.ainvoke(Command(resume=decision_payload), config=run_config)
```

---

## 15. Running the Migrated Backend

```bash
# Terminal 1 — Start Python 3.12 FastAPI + LangGraph Agentic Backend (port 8010)
.venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8010

# Terminal 2 — Start Express Gateway + Vite Frontend (port 3000)
npm run dev

# Run Python Agentic AI Test Suite
.venv/bin/pytest -v tests_py
```
