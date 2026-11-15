from __future__ import annotations

from contextlib import asynccontextmanager
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.routes import router as api_router
from backend.config.settings import get_settings
from backend.db.connection import ensure_agentic_auxiliary_tables
from backend.llm.provider import ensure_llm_tracing_env


@asynccontextmanager
async def lifespan(_app: FastAPI):
    ensure_llm_tracing_env()
    ensure_agentic_auxiliary_tables()
    yield


def create_fastapi_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version="2.0.0",
        description="SELLVION Agentic AI Backend powered by LangGraph, LangChain, Gemini Flash, and FastAPI.",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def attach_service_header(request, call_next):
        response = await call_next(request)
        response.headers["X-Sellvion-Service"] = "agentic-fastapi"
        return response

    app.include_router(api_router)
    return app


app = create_fastapi_app()

if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("FASTAPI_PORT", "8010"))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=False)
