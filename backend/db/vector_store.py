from __future__ import annotations

import hashlib
import json
import math
import re
from typing import Any, Optional

from backend.db.connection import ensure_agentic_auxiliary_tables, get_sqlite_conn

EMBED_DIM = 64


def compute_text_embedding(text: str, dim: int = EMBED_DIM) -> list[float]:
    """Deterministic lightweight semantic hashing embedding (64-dim unit vector) for local/pgvector indexing."""
    vec = [0.0] * dim
    tokens = re.findall(r"[a-z0-9]+", text.lower())
    if not tokens:
        return vec
    for tok in tokens:
        digest = hashlib.sha256(tok.encode("utf-8")).digest()
        idx = int.from_bytes(digest[:2], "big") % dim
        sign = 1.0 if digest[2] % 2 == 0 else -1.0
        vec[idx] += sign
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [round(v / norm, 6) for v in vec]


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a)) or 1.0
    nb = math.sqrt(sum(y * y for y in b)) or 1.0
    return dot / (na * nb)


def index_business_customers(business_id: str, db_path: Optional[str] = None) -> int:
    """Index customer summaries as vectors in customer_memory_embeddings."""
    ensure_agentic_auxiliary_tables(db_path)
    indexed = 0
    with get_sqlite_conn(db_path) as conn:
        rows = conn.execute(
            """
            SELECT id, name, city, primary_category, last_product_ordered, segment, ai_insight,
                   outstanding_udhaar, days_since_last_order
            FROM customers
            WHERE business_id = ?
            """,
            (business_id,),
        ).fetchall()
        for r in rows:
            summary = (
                f"{r['name']} {r['city']} {r['primary_category']} {r['last_product_ordered']} "
                f"segment {r['segment']} udhaar {r['outstanding_udhaar']} days {r['days_since_last_order']} "
                f"{r.get('ai_insight', '')}"
            )
            emb = compute_text_embedding(summary)
            emb_id = f"VEC-{r['id']}"
            conn.execute(
                """
                INSERT INTO customer_memory_embeddings (id, business_id, customer_id, summary_text, embedding_json, updated_at)
                VALUES (?, ?, ?, ?, ?, datetime('now'))
                ON CONFLICT(business_id, customer_id) DO UPDATE SET
                  summary_text = excluded.summary_text,
                  embedding_json = excluded.embedding_json,
                  updated_at = datetime('now')
                """,
                (emb_id, business_id, r["id"], summary, json.dumps(emb)),
            )
            indexed += 1
    return indexed


def semantic_search_customers(
    business_id: str,
    query: str,
    top_k: int = 5,
    db_path: Optional[str] = None,
) -> list[dict[str, Any]]:
    """Retrieve top-k semantically matching customers for Copilot Q&A and Retention Agent."""
    index_business_customers(business_id, db_path)
    q_vec = compute_text_embedding(query)
    scored: list[tuple[float, dict[str, Any]]] = []
    with get_sqlite_conn(db_path) as conn:
        rows = conn.execute(
            """
            SELECT e.customer_id, e.summary_text, e.embedding_json,
                   c.name, c.city, c.segment, c.last_product_ordered,
                   c.outstanding_udhaar, c.days_since_last_order, c.average_cadence_days
            FROM customer_memory_embeddings e
            JOIN customers c ON c.id = e.customer_id
            WHERE e.business_id = ?
            """,
            (business_id,),
        ).fetchall()
        for r in rows:
            vec = json.loads(r["embedding_json"])
            sim = cosine_similarity(q_vec, vec)
            scored.append(
                (
                    sim,
                    {
                        "customer_id": r["customer_id"],
                        "name": r["name"],
                        "city": r["city"],
                        "segment": r["segment"],
                        "last_product_ordered": r["last_product_ordered"],
                        "outstanding_udhaar": r["outstanding_udhaar"],
                        "days_since_last_order": r["days_since_last_order"],
                        "average_cadence_days": r["average_cadence_days"],
                        "similarity": round(sim, 4),
                    },
                )
            )
    scored.sort(key=lambda item: item[0], reverse=True)
    return [item[1] for item in scored[:top_k]]
