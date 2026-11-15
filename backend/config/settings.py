from functools import lru_cache
from pathlib import Path
import os
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ROOT_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "SELLVION Agentic AI Backend"
    environment: str = "development"

    # LLM / Gemini configuration
    llm_provider: str = os.getenv("LLM_PROVIDER", "gemini")
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-4-hydrogen")
    llm_timeout_seconds: float = float(os.getenv("LLM_TIMEOUT_SECONDS", "8"))

    # LangSmith tracing
    langchain_tracing_v2: bool = os.getenv("LANGCHAIN_TRACING_V2", "false").lower() == "true"
    langsmith_endpoint: str = os.getenv("LANGSMITH_ENDPOINT", "https://api.smith.langchain.com")
    langsmith_api_key: str = os.getenv("LANGSMITH_API_KEY", "")
    langsmith_project: str = os.getenv("LANGSMITH_PROJECT", "sellvion-agentic-ai")

    # Storage & Checkpointing
    database_url: str = os.getenv("DATABASE_URL", f"sqlite:///{ROOT_DIR / 'data' / 'sellvion.db'}")
    langgraph_checkpoint_url: str = os.getenv(
        "LANGGRAPH_CHECKPOINT_URL",
        f"sqlite:///{ROOT_DIR / 'data' / 'langgraph_checkpoints.db'}",
    )
    redis_url: str = os.getenv("REDIS_URL", "")

    # Auth & Webhooks
    session_secret: str = os.getenv("SESSION_SECRET", "sellvion-dev-secret-key")
    whatsapp_verify_token: str = os.getenv("WHATSAPP_VERIFY_TOKEN", "sellvion-verify-token")

    @property
    def is_postgres(self) -> bool:
        return self.database_url.startswith("postgres://") or self.database_url.startswith("postgresql://")

    @property
    def sqlite_path(self) -> Path:
        raw = self.database_url
        if raw.startswith("sqlite:///"):
            raw = raw[len("sqlite:///"):]
        p = Path(raw)
        if not p.is_absolute():
            p = ROOT_DIR / p
        return p

    @property
    def checkpoint_sqlite_path(self) -> Path:
        raw = self.langgraph_checkpoint_url
        if raw.startswith("sqlite:///"):
            raw = raw[len("sqlite:///"):]
        p = Path(raw)
        if not p.is_absolute():
            p = ROOT_DIR / p
        return p

    @property
    def is_gemini_configured(self) -> bool:
        key = self.gemini_api_key.strip()
        return bool(key and key != "MY_GEMINI_API_KEY")

    @property
    def is_langsmith_configured(self) -> bool:
        key = self.langsmith_api_key.strip()
        return self.langchain_tracing_v2 and bool(key and key != "MY_LANGSMITH_API_KEY")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
