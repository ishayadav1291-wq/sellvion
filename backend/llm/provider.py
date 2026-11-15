from __future__ import annotations

import asyncio
import os
from typing import Any, Optional, Type, TypeVar

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel

from backend.config.settings import get_settings

T = TypeVar("T", bound=BaseModel)


class LLMProvider:
    """Clean LLM abstraction allowing provider/model replacement via environment settings."""

    def __init__(self) -> None:
        self._configure_langsmith_env()

    @property
    def settings(self):
        return get_settings()

    def _configure_langsmith_env(self) -> None:
        if self.settings.is_langsmith_configured:
            os.environ["LANGCHAIN_TRACING_V2"] = "true"
            os.environ["LANGCHAIN_API_KEY"] = self.settings.langsmith_api_key
            os.environ["LANGCHAIN_PROJECT"] = self.settings.langsmith_project
            os.environ["LANGCHAIN_ENDPOINT"] = self.settings.langsmith_endpoint

    @property
    def model_name(self) -> str:
        return self.settings.gemini_model

    @property
    def is_configured(self) -> bool:
        return self.settings.is_gemini_configured

    def get_chat_model(self) -> Optional[BaseChatModel]:
        if not self.is_configured:
            return None
        if self.settings.llm_provider.lower() == "gemini":
            return ChatGoogleGenerativeAI(
                model=self.settings.gemini_model,
                google_api_key=self.settings.gemini_api_key,
                timeout=self.settings.llm_timeout_seconds,
                max_retries=2,
                additional_headers={"User-Agent": "aistudio-build"},
            )
        raise ValueError(f"Unsupported LLM_PROVIDER: {self.settings.llm_provider}")

    async def invoke_prompt_text(
        self,
        prompt: ChatPromptTemplate,
        variables: dict[str, Any],
        timeout_seconds: Optional[float] = None,
    ) -> tuple[Optional[str], str]:
        """Run a LangChain ChatPromptTemplate -> BaseChatModel chain asynchronously with timeout."""
        llm = self.get_chat_model()
        if llm is None:
            return None, "fallback"
        chain = prompt | llm
        timeout = timeout_seconds or self.settings.llm_timeout_seconds
        try:
            msg = await asyncio.wait_for(chain.ainvoke(variables), timeout=timeout)
            content = getattr(msg, "content", "")
            if isinstance(content, list):
                text = " ".join(
                    str(part.get("text", "") if isinstance(part, dict) else part)
                    for part in content
                ).strip()
            else:
                text = str(content or "").strip()
            if text:
                return text, self.model_name
            return None, "fallback"
        except Exception:
            return None, "fallback"

    async def invoke_prompt_structured(
        self,
        prompt: ChatPromptTemplate,
        schema: Type[T],
        variables: dict[str, Any],
        timeout_seconds: Optional[float] = None,
    ) -> tuple[Optional[T], str]:
        """Run a LangChain structured output chain -> Pydantic v2 schema."""
        llm = self.get_chat_model()
        if llm is None:
            return None, "fallback"
        structured_llm = llm.with_structured_output(schema)
        chain = prompt | structured_llm
        timeout = timeout_seconds or self.settings.llm_timeout_seconds
        try:
            result = await asyncio.wait_for(chain.ainvoke(variables), timeout=timeout)
            if isinstance(result, schema):
                return result, self.model_name
            if isinstance(result, dict):
                return schema.model_validate(result), self.model_name
            return None, "fallback"
        except Exception:
            return None, "fallback"


llm_provider = LLMProvider()


def ensure_llm_tracing_env() -> None:
    llm_provider._configure_langsmith_env()
