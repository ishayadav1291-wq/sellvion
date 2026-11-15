from __future__ import annotations

import json
import time
from typing import Any, Optional

from backend.config.settings import get_settings


class AsyncCacheBackend:
    """Uses Redis when REDIS_URL is configured; otherwise falls back cleanly to async in-memory TTL store."""

    def __init__(self) -> None:
        self._memory: dict[str, tuple[float, str]] = {}
        self._redis_client: Any = None

    async def _get_redis(self) -> Any:
        settings = get_settings()
        if not settings.redis_url:
            return None
        if self._redis_client is None:
            import redis.asyncio as aioredis

            self._redis_client = aioredis.from_url(settings.redis_url, decode_responses=True)
        return self._redis_client

    async def get_json(self, key: str) -> Optional[Any]:
        client = await self._get_redis()
        if client is not None:
            try:
                raw = await client.get(key)
                return json.loads(raw) if raw else None
            except Exception:
                pass
        entry = self._memory.get(key)
        if not entry:
            return None
        expires_at, payload = entry
        if time.time() > expires_at:
            self._memory.pop(key, None)
            return None
        return json.loads(payload)

    async def set_json(self, key: str, value: Any, ttl_seconds: int = 30) -> None:
        raw = json.dumps(value)
        client = await self._get_redis()
        if client is not None:
            try:
                await client.set(key, raw, ex=ttl_seconds)
                return
            except Exception:
                pass
        self._memory[key] = (time.time() + ttl_seconds, raw)

    async def invalidate_prefix(self, prefix: str) -> None:
        for k in list(self._memory.keys()):
            if k.startswith(prefix):
                self._memory.pop(k, None)
        client = await self._get_redis()
        if client is not None:
            try:
                keys = await client.keys(f"{prefix}*")
                if keys:
                    await client.delete(*keys)
            except Exception:
                pass


cache_backend = AsyncCacheBackend()
