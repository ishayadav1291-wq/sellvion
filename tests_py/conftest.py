from __future__ import annotations

from pathlib import Path
import sqlite3
import pytest

from backend.config.settings import get_settings
from backend.db.connection import ensure_agentic_auxiliary_tables


MIGRATION_SQL = (Path(__file__).resolve().parent.parent / "migrations" / "001_init.sql").read_text(
    encoding="utf-8"
)


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture()
def isolated_env(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    """Provision an isolated SQLite store + LangGraph checkpoint DB seeded with synthetic test fixtures."""
    db_file = tmp_path / "test_sellvion.db"
    ckpt_file = tmp_path / "test_checkpoints.db"

    conn = sqlite3.connect(str(db_file))
    conn.executescript(MIGRATION_SQL)

    # Synthetic business & settings
    conn.execute(
        """
        INSERT INTO businesses (id, name, category, city, state, mode)
        VALUES ('BIZ-TEST-001', 'Test Herbal Store', 'Ayurveda', 'Jaipur', 'Rajasthan', 'demo'),
               ('BIZ-LIVE-001', 'Live Herbal Store', 'Ayurveda', 'Pune', 'Maharashtra', 'live')
        """
    )
    conn.execute(
        """
        INSERT INTO business_settings (
          business_id, reorder_mode, cod_prepay_mode, udhaar_mode, winback_mode,
          max_daily_messages, quiet_hours_start, quiet_hours_end, min_confidence, max_discount_pct, emergency_pause_all
        ) VALUES
          ('BIZ-TEST-001', 'approval_required', 'approval_required', 'approval_required', 'approval_required', 1, '21:00', '09:00', 85, 10, 0),
          ('BIZ-LIVE-001', 'approval_required', 'approval_required', 'approval_required', 'approval_required', 1, '21:00', '09:00', 85, 10, 0)
        """
    )

    # Synthetic users + session for live tenant auth check
    conn.execute(
        "INSERT INTO users (id, email, password_hash, full_name, email_verified) VALUES ('USR-TEST-1', 'live@example.test', 'salt:hash', 'Live Merchant', 1)"
    )
    conn.execute(
        "INSERT INTO business_members (id, business_id, user_id, role) VALUES ('BM-1', 'BIZ-LIVE-001', 'USR-TEST-1', 'owner')"
    )
    import hashlib

    tok = "test-live-session-token"
    tok_hash = hashlib.sha256(tok.encode("utf-8")).hexdigest()
    conn.execute(
        "INSERT INTO sessions (id, user_id, business_id, token_hash, expires_at) VALUES ('SES-1', 'USR-TEST-1', 'BIZ-LIVE-001', ?, '2099-01-01T00:00:00Z')",
        (tok_hash,),
    )

    # Synthetic customers (demo & live)
    conn.execute(
        """
        INSERT INTO customers (
          id, business_id, name, phone, city, primary_category, last_product_ordered,
          total_orders, total_spent, average_cadence_days, days_since_last_order,
          cod_reliability_score, outstanding_udhaar, udhaar_due_date,
          consent_whatsapp, opted_out, preferred_language, segment, holdout_group, is_demo
        ) VALUES
          ('CUST-REORDER', 'BIZ-TEST-001', 'Aarav Sharma', '+919900112233', 'Jaipur', 'Wellness', 'Ashwagandha 250g', 4, 4800, 30, 36, 92, 0, '', 1, 0, 'hinglish', 'reorder_due', 0, 1),
          ('CUST-UDHAAR', 'BIZ-TEST-001', 'Meera Joshi', '+919900112244', 'Indore', 'Spices', 'Cold Pressed Sesame Oil', 3, 3200, 25, 15, 88, 1850, '2025-01-01', 1, 0, 'hinglish', 'high_udhaar', 0, 1),
          ('CUST-COD', 'BIZ-TEST-001', 'Rohan Verma', '+919900112255', 'Lucknow', 'Wellness', 'Chyawanprash 1kg', 1, 2900, 30, 1, 60, 0, '', 1, 0, 'hinglish', 'regular', 0, 1),
          ('CUST-OPTOUT', 'BIZ-TEST-001', 'Kiran OptOut', '+919900112266', 'Delhi', 'Wellness', 'Tulsi Drops', 2, 900, 30, 45, 90, 0, '', 0, 1, 'hinglish', 'inactive', 0, 1),
          ('CUST-HOLDOUT', 'BIZ-TEST-001', 'Holdout Buyer', '+919900112277', 'Surat', 'Wellness', 'Herbal Tea', 2, 1200, 30, 20, 85, 0, '', 1, 0, 'en', 'regular', 1, 1),
          ('CUST-LIVE-1', 'BIZ-LIVE-001', 'Live Buyer', '+919900112288', 'Pune', 'Wellness', 'Amla Powder', 2, 1600, 25, 32, 88, 0, '', 1, 0, 'hinglish', 'reorder_due', 0, 0)
        """
    )

    conn.execute(
        """
        INSERT INTO orders (
          id, business_id, customer_id, order_number, items_json, total_amount, payment_mode,
          delivery_address, pincode, status, cod_risk_score, is_demo, ordered_at
        ) VALUES
          ('ORD-COD-1', 'BIZ-TEST-001', 'CUST-COD', 'ORD-2099', '["Chyawanprash 1kg"]', 2900, 'COD', 'Near temple market', '226001', 'Pending_Verification', 86, 1, date('now'))
        """
    )
    conn.execute(
        """
        INSERT INTO udhaar_records (id, business_id, customer_id, original_amount, remaining_amount, due_date, status, is_demo)
        VALUES ('UDH-1', 'BIZ-TEST-001', 'CUST-UDHAAR', 1850, 1850, '2025-01-01', 'overdue', 1)
        """
    )
    conn.execute(
        """
        INSERT INTO analytics_events (id, business_id, event_type, customer_id, amount, holdout_group, is_demo)
        VALUES
          ('EVT-1', 'BIZ-TEST-001', 'repeat_order_observed', 'CUST-REORDER', 1400, 0, 1),
          ('EVT-2', 'BIZ-TEST-001', 'holdout_order_observed', 'CUST-HOLDOUT', 450, 1, 1)
        """
    )
    conn.commit()
    conn.close()

    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_file}")
    monkeypatch.setenv("LANGGRAPH_CHECKPOINT_URL", f"sqlite:///{ckpt_file}")
    monkeypatch.setenv("GEMINI_API_KEY", "")
    monkeypatch.setenv("REDIS_URL", "")
    monkeypatch.setenv("LANGCHAIN_TRACING_V2", "false")
    get_settings.cache_clear()

    ensure_agentic_auxiliary_tables(str(db_file))
    yield {
        "db_path": str(db_file),
        "ckpt_path": str(ckpt_file),
        "live_token": tok,
    }
    get_settings.cache_clear()
