-- SELLVION Relational Database Schema (Migration 001)
-- Multi-tenant business-isolated schema with foreign keys, constraints, and indexes.
-- Compatible with SQLite (node:sqlite) and easily portable to PostgreSQL / Cloud SQL.

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email_verified INTEGER NOT NULL DEFAULT 0,
  verification_token TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

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
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS business_members (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'manager', 'staff')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (business_id, user_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS business_settings (
  business_id TEXT PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  reorder_mode TEXT NOT NULL DEFAULT 'approval_required' CHECK (reorder_mode IN ('recommendation_only', 'approval_required', 'bounded_autonomous')),
  cod_prepay_mode TEXT NOT NULL DEFAULT 'approval_required' CHECK (cod_prepay_mode IN ('recommendation_only', 'approval_required', 'bounded_autonomous')),
  udhaar_mode TEXT NOT NULL DEFAULT 'approval_required' CHECK (udhaar_mode IN ('recommendation_only', 'approval_required', 'bounded_autonomous')),
  winback_mode TEXT NOT NULL DEFAULT 'recommendation_only' CHECK (winback_mode IN ('recommendation_only', 'approval_required', 'bounded_autonomous')),
  max_daily_messages INTEGER NOT NULL DEFAULT 1,
  quiet_hours_start TEXT NOT NULL DEFAULT '21:00',
  quiet_hours_end TEXT NOT NULL DEFAULT '09:00',
  min_confidence INTEGER NOT NULL DEFAULT 85,
  max_discount_pct INTEGER NOT NULL DEFAULT 10,
  daily_spend_cap_inr INTEGER NOT NULL DEFAULT 2500,
  emergency_pause_all INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
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
  total_spent REAL NOT NULL DEFAULT 0,
  average_cadence_days INTEGER NOT NULL DEFAULT 30,
  days_since_last_order INTEGER NOT NULL DEFAULT 0,
  cod_reliability_score INTEGER NOT NULL DEFAULT 85,
  outstanding_udhaar REAL NOT NULL DEFAULT 0,
  udhaar_due_date TEXT DEFAULT '',
  consent_whatsapp INTEGER NOT NULL DEFAULT 1,
  opted_out INTEGER NOT NULL DEFAULT 0,
  preferred_language TEXT NOT NULL DEFAULT 'hinglish',
  segment TEXT NOT NULL DEFAULT 'regular',
  holdout_group INTEGER NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  ai_insight TEXT DEFAULT '',
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  sku TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  price REAL NOT NULL DEFAULT 0,
  typical_cadence_days INTEGER NOT NULL DEFAULT 30,
  stock_qty INTEGER NOT NULL DEFAULT 0,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  items_json TEXT NOT NULL DEFAULT '[]',
  total_amount REAL NOT NULL DEFAULT 0,
  payment_mode TEXT NOT NULL DEFAULT 'COD' CHECK (payment_mode IN ('COD', 'Prepaid_UPI', 'Prepaid_Card', 'Udhaar')),
  delivery_address TEXT DEFAULT '',
  pincode TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Pending_Verification' CHECK (status IN ('Delivered', 'In_Transit', 'Pending_Verification', 'RTO_Returned', 'Cancelled')),
  cod_risk_score INTEGER DEFAULT 0,
  risk_reasons_json TEXT NOT NULL DEFAULT '[]',
  courier_cost REAL NOT NULL DEFAULT 0,
  actual_outcome TEXT DEFAULT '',
  is_demo INTEGER NOT NULL DEFAULT 0,
  ordered_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  amount REAL NOT NULL,
  method TEXT NOT NULL DEFAULT 'UPI',
  reference_id TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'captured' CHECK (status IN ('pending', 'captured', 'failed', 'refunded')),
  recorded_by TEXT NOT NULL DEFAULT 'merchant',
  is_demo INTEGER NOT NULL DEFAULT 0,
  paid_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS udhaar_records (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  original_amount REAL NOT NULL,
  remaining_amount REAL NOT NULL,
  due_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'overdue', 'paid')),
  notes TEXT DEFAULT '',
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  settled_at TEXT
);

CREATE TABLE IF NOT EXISTS cod_risk_assessments (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  risk_score INTEGER NOT NULL,
  risk_band TEXT NOT NULL CHECK (risk_band IN ('low', 'moderate', 'high')),
  reasons_json TEXT NOT NULL DEFAULT '[]',
  evidence_json TEXT NOT NULL DEFAULT '{}',
  recommended_action TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'flagged' CHECK (status IN ('safe', 'flagged', 'mitigated', 'escalated', 'resolved')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS agent_workflows (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  workflow_type TEXT NOT NULL CHECK (workflow_type IN ('reactivation', 'cod_protection', 'udhaar_collection', 'reorder_scan', 'voice_command')),
  trigger_source TEXT NOT NULL DEFAULT 'manual',
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'awaiting_approval', 'approved', 'executing', 'completed', 'failed', 'escalated')),
  current_step TEXT NOT NULL DEFAULT 'understand',
  input_json TEXT NOT NULL DEFAULT '{}',
  result_json TEXT NOT NULL DEFAULT '{}',
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 2,
  error_message TEXT DEFAULT '',
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS agent_tasks (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL REFERENCES agent_workflows(id) ON DELETE CASCADE,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  step_order INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped', 'escalated')),
  input_json TEXT NOT NULL DEFAULT '{}',
  output_json TEXT NOT NULL DEFAULT '{}',
  reason TEXT DEFAULT '',
  confidence INTEGER DEFAULT NULL,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  error_message TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  workflow_id TEXT REFERENCES agent_workflows(id) ON DELETE SET NULL,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('reorder_reminder', 'cod_prepay', 'cod_verify', 'udhaar_reminder', 'winback_offer')),
  title TEXT NOT NULL,
  reason TEXT NOT NULL,
  agent_name TEXT NOT NULL DEFAULT 'Orchestrator',
  required_permission TEXT NOT NULL DEFAULT 'whatsapp_send',
  confidence INTEGER NOT NULL DEFAULT 80,
  potential_impact TEXT NOT NULL DEFAULT '',
  suggested_message TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'WhatsApp',
  status TEXT NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'approved', 'rejected', 'snoozed', 'executed', 'failed', 'escalated')),
  scheduled_for TEXT DEFAULT '',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS message_templates (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'hinglish',
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS message_history (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  approval_id TEXT REFERENCES approvals(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'WhatsApp',
  direction TEXT NOT NULL DEFAULT 'outbound' CHECK (direction IN ('outbound', 'inbound')),
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'failed', 'simulated')),
  provider_message_id TEXT DEFAULT '',
  error_message TEXT DEFAULT '',
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS integration_accounts (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('whatsapp', 'shopify', 'shiprocket', 'razorpay', 'gemini')),
  status TEXT NOT NULL DEFAULT 'not_configured' CHECK (status IN ('not_configured', 'connected', 'error', 'disconnected')),
  encrypted_credentials TEXT DEFAULT '',
  config_json TEXT NOT NULL DEFAULT '{}',
  last_verified_at TEXT,
  last_error TEXT DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (business_id, provider)
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY,
  business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  signature_valid INTEGER NOT NULL DEFAULT 0,
  payload_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'received',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS import_batches (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('customers', 'products', 'orders', 'payments', 'udhaar')),
  filename TEXT NOT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  imported_rows INTEGER NOT NULL DEFAULT 0,
  skipped_rows INTEGER NOT NULL DEFAULT 0,
  error_rows_json TEXT NOT NULL DEFAULT '[]',
  inserted_ids_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'rolled_back', 'failed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  amount REAL NOT NULL DEFAULT 0,
  holdout_group INTEGER NOT NULL DEFAULT 0,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  actor_type TEXT NOT NULL DEFAULT 'merchant',
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details_json TEXT NOT NULL DEFAULT '{}',
  ip_address TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_customers_business ON customers(business_id, segment);
CREATE INDEX IF NOT EXISTS idx_orders_business ON orders(business_id, status, payment_mode);
CREATE INDEX IF NOT EXISTS idx_udhaar_business ON udhaar_records(business_id, status);
CREATE INDEX IF NOT EXISTS idx_approvals_business ON approvals(business_id, status);
CREATE INDEX IF NOT EXISTS idx_workflows_business ON agent_workflows(business_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_workflow ON agent_tasks(workflow_id);
CREATE INDEX IF NOT EXISTS idx_messages_customer ON message_history(business_id, customer_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_business ON analytics_events(business_id, event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_business ON audit_logs(business_id, created_at);
