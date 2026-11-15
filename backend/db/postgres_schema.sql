-- SELLVION PostgreSQL + pgvector Schema (Target Production Schema)
-- Mirrors migrations/001_init.sql and adds vector embeddings + LangGraph checkpoint readiness.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS businesses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Retail & D2C',
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  currency TEXT NOT NULL DEFAULT 'INR',
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  preferred_language TEXT NOT NULL DEFAULT 'en',
  store_url TEXT DEFAULT '',
  mode TEXT NOT NULL DEFAULT 'live' CHECK (mode IN ('demo', 'live')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS business_settings (
  business_id TEXT PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  reorder_mode TEXT NOT NULL DEFAULT 'approval_required',
  cod_prepay_mode TEXT NOT NULL DEFAULT 'approval_required',
  udhaar_mode TEXT NOT NULL DEFAULT 'approval_required',
  winback_mode TEXT NOT NULL DEFAULT 'recommendation_only',
  max_daily_messages INTEGER NOT NULL DEFAULT 1,
  quiet_hours_start TEXT NOT NULL DEFAULT '21:00',
  quiet_hours_end TEXT NOT NULL DEFAULT '09:00',
  min_confidence INTEGER NOT NULL DEFAULT 85,
  max_discount_pct INTEGER NOT NULL DEFAULT 10,
  daily_spend_cap_inr INTEGER NOT NULL DEFAULT 2500,
  emergency_pause_all BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  address_line TEXT DEFAULT '',
  pincode TEXT DEFAULT '',
  primary_category TEXT NOT NULL DEFAULT 'General',
  last_product_ordered TEXT DEFAULT '',
  first_order_date TEXT DEFAULT '',
  last_order_date TEXT DEFAULT '',
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_spent DOUBLE PRECISION NOT NULL DEFAULT 0,
  average_cadence_days INTEGER NOT NULL DEFAULT 30,
  days_since_last_order INTEGER NOT NULL DEFAULT 0,
  cod_reliability_score INTEGER NOT NULL DEFAULT 85,
  outstanding_udhaar DOUBLE PRECISION NOT NULL DEFAULT 0,
  udhaar_due_date TEXT DEFAULT '',
  consent_whatsapp BOOLEAN NOT NULL DEFAULT TRUE,
  opted_out BOOLEAN NOT NULL DEFAULT FALSE,
  preferred_language TEXT NOT NULL DEFAULT 'hinglish',
  segment TEXT NOT NULL DEFAULT 'regular',
  holdout_group INTEGER NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  ai_insight TEXT DEFAULT '',
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_memory_embeddings (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  summary_text TEXT NOT NULL,
  embedding vector(64) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_memory_hnsw
  ON customer_memory_embeddings USING ivfflat (embedding vector_cosine_ops);
