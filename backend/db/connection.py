from __future__ import annotations

from contextlib import asynccontextmanager, contextmanager
from datetime import datetime, timezone
import hashlib
import json
import sqlite3
from typing import Any, AsyncIterator, Iterator, Optional

from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver

from backend.config.settings import get_settings


def _dict_factory(cursor: sqlite3.Cursor, row: tuple[Any, ...]) -> dict[str, Any]:
    return {col[0]: row[idx] for idx, col in enumerate(cursor.description)}


@contextmanager
def get_sqlite_conn(db_path: Optional[str] = None) -> Iterator[sqlite3.Connection]:
    settings = get_settings()
    target = db_path or str(settings.sqlite_path)
    conn = sqlite3.connect(target, check_same_thread=False, timeout=10.0)
    conn.row_factory = _dict_factory
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    conn.execute("PRAGMA busy_timeout=5000;")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def ensure_agentic_auxiliary_tables(db_path: Optional[str] = None) -> None:
    """Create semantic vector memory & LangGraph thread mapping tables in existing SQLite DB."""
    with get_sqlite_conn(db_path) as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS customer_memory_embeddings (
              id TEXT PRIMARY KEY,
              business_id TEXT NOT NULL,
              customer_id TEXT NOT NULL,
              summary_text TEXT NOT NULL,
              embedding_json TEXT NOT NULL,
              updated_at TEXT NOT NULL DEFAULT (datetime('now')),
              UNIQUE (business_id, customer_id)
            );
            CREATE TABLE IF NOT EXISTS langgraph_threads (
              thread_id TEXT PRIMARY KEY,
              workflow_id TEXT NOT NULL,
              business_id TEXT NOT NULL,
              approval_id TEXT,
              status TEXT NOT NULL DEFAULT 'running',
              created_at TEXT NOT NULL DEFAULT (datetime('now')),
              updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            """
        )


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def resolve_auth_from_headers(
    authorization: Optional[str] = None,
    cookie_header: Optional[str] = None,
    requested_mode: Optional[str] = None,
    db_path: Optional[str] = None,
) -> dict[str, Any]:
    """Mirror server/middleware/auth.ts tenant resolution cleanly."""
    raw_token: Optional[str] = None
    if authorization and authorization.lower().startswith("bearer "):
        raw_token = authorization[7:].strip()
    elif cookie_header:
        for part in cookie_header.split(";"):
            if "=" in part:
                k, v = part.strip().split("=", 1)
                if k == "sellvion_session":
                    raw_token = v
                    break

    with get_sqlite_conn(db_path) as conn:
        if raw_token and requested_mode != "demo":
            token_hash = hash_token(raw_token)
            row = conn.execute(
                """
                SELECT s.user_id, s.business_id, s.expires_at, u.email, u.full_name,
                       b.name AS business_name, b.mode AS business_mode, bm.role
                FROM sessions s
                JOIN users u ON u.id = s.user_id
                JOIN businesses b ON b.id = s.business_id
                JOIN business_members bm ON bm.business_id = s.business_id AND bm.user_id = s.user_id
                WHERE s.token_hash = ?
                """,
                (token_hash,),
            ).fetchone()
            if row:
                try:
                    exp = datetime.fromisoformat(str(row["expires_at"]).replace("Z", "+00:00"))
                    if exp.tzinfo is None:
                        exp = exp.replace(tzinfo=timezone.utc)
                    valid = exp > datetime.now(timezone.utc)
                except ValueError:
                    valid = True
                if valid:
                    return {
                        "userId": row["user_id"],
                        "email": row["email"],
                        "fullName": row["full_name"],
                        "businessId": row["business_id"],
                        "businessName": row["business_name"],
                        "role": row["role"],
                        "mode": row["business_mode"],
                        "isAuthenticated": True,
                    }

        demo_biz = conn.execute(
            "SELECT id, name, mode FROM businesses WHERE id = 'BIZ-DEMO-001' OR mode = 'demo' LIMIT 1"
        ).fetchone()

    return {
        "userId": None,
        "email": None,
        "fullName": "Demo Merchant",
        "businessId": demo_biz["id"] if demo_biz else "BIZ-DEMO-001",
        "businessName": demo_biz["name"] if demo_biz else "Mystic Spices & Naturals (Demo Store)",
        "role": "demo_visitor",
        "mode": "demo",
        "isAuthenticated": False,
    }


def write_audit_log(
    conn: sqlite3.Connection,
    *,
    audit_id: str,
    business_id: str,
    user_id: Optional[str],
    actor_type: str,
    action: str,
    entity_type: str,
    entity_id: str,
    details: Optional[dict[str, Any]] = None,
) -> None:
    conn.execute(
        """
        INSERT INTO audit_logs (id, business_id, user_id, actor_type, action, entity_type, entity_id, details_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            audit_id,
            business_id,
            user_id,
            actor_type,
            action,
            entity_type,
            entity_id,
            json.dumps(details or {}),
        ),
    )


@asynccontextmanager
async def get_langgraph_checkpointer(
    checkpoint_path: Optional[str] = None,
) -> AsyncIterator[Any]:
    """Yield AsyncSqliteSaver by default, or AsyncPostgresSaver when DATABASE_URL is PostgreSQL."""
    settings = get_settings()
    if settings.is_postgres and not checkpoint_path:
        from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

        async with AsyncPostgresSaver.from_conn_string(settings.database_url) as pg_saver:
            await pg_saver.setup()
            yield pg_saver
        return

    target = checkpoint_path or str(settings.checkpoint_sqlite_path)
    async with AsyncSqliteSaver.from_conn_string(target) as sqlite_saver:
        yield sqlite_saver
