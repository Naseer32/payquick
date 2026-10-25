-- PayQuick V2 Database Schema
-- Run this file once against a fresh database.
-- For existing databases, apply database/migrations/ instead.

-- ── Core tables ─────────────────────────────────────────────────────────────

CREATE TABLE merchants (
  id UUID PRIMARY KEY,
  wallet_address TEXT NOT NULL UNIQUE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE customers (
  id UUID PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX customers_merchant_id_idx ON customers(merchant_id);

CREATE TABLE invoices (
  id UUID PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  customer_id UUID REFERENCES customers(id),
  invoice_number TEXT NOT NULL,
  amount NUMERIC(30, 6) NOT NULL,
  currency TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  checkout_token TEXT NOT NULL UNIQUE,
  due_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Enforce allowed status values
  CONSTRAINT invoices_status_check
    CHECK (status IN ('pending', 'paid', 'expired', 'cancelled'))
);

CREATE INDEX invoices_merchant_id_idx ON invoices(merchant_id);
CREATE INDEX invoices_status_idx ON invoices(status);
CREATE INDEX invoices_due_at_idx ON invoices(due_at) WHERE due_at IS NOT NULL;

CREATE TABLE payments (
  id UUID PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  tx_hash TEXT NOT NULL UNIQUE,
  payer_address TEXT NOT NULL,
  receiver_address TEXT NOT NULL,
  amount NUMERIC(30, 6) NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  block_number BIGINT,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT payments_status_check
    CHECK (status IN ('pending', 'confirmed', 'failed'))
);

CREATE INDEX payments_invoice_id_idx ON payments(invoice_id);
CREATE INDEX payments_status_idx ON payments(status);
CREATE INDEX payments_tx_hash_idx ON payments(tx_hash);

CREATE TABLE payment_events (
  id UUID PRIMARY KEY,
  payment_id UUID REFERENCES payments(id),
  event_name TEXT NOT NULL,
  tx_hash TEXT,
  block_number BIGINT,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX payment_events_payment_id_idx ON payment_events(payment_id);

CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  merchant_id UUID REFERENCES merchants(id),
  customer_id UUID REFERENCES customers(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX notifications_merchant_id_idx ON notifications(merchant_id);
CREATE INDEX notifications_read_at_idx ON notifications(read_at) WHERE read_at IS NULL;

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  actor_wallet TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX audit_logs_actor_wallet_idx ON audit_logs(actor_wallet);
CREATE INDEX audit_logs_entity_id_idx ON audit_logs(entity_id) WHERE entity_id IS NOT NULL;

-- ── Authentication ──────────────────────────────────────────────────────────

-- Sessions stored in DB (not in-memory) so they survive API restarts.
CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX sessions_wallet_address_idx ON sessions(wallet_address);
CREATE INDEX sessions_expires_at_idx ON sessions(expires_at);

-- Single-use nonces for wallet-signature authentication.
-- One row per wallet address; re-requesting a challenge replaces the nonce.
CREATE TABLE auth_challenges (
  wallet_address TEXT PRIMARY KEY,
  nonce TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── API keys ────────────────────────────────────────────────────────────────

CREATE TABLE api_keys (
  id UUID PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX api_keys_merchant_id_idx ON api_keys(merchant_id);
CREATE INDEX api_keys_key_hash_idx ON api_keys(key_hash);
