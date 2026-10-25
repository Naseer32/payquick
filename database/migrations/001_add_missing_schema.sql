-- Migration 001: Add missing tables, indexes, and constraints
-- Apply this to any existing PayQuick V2 database that was created from the
-- original schema.sql before this migration was added.
-- Safe to run multiple times (uses IF NOT EXISTS / DO NOTHING patterns).

-- ── auth_challenges table (was missing from original schema) ────────────────
CREATE TABLE IF NOT EXISTS auth_challenges (
  wallet_address TEXT PRIMARY KEY,
  nonce TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Missing indexes ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS customers_merchant_id_idx      ON customers(merchant_id);
CREATE INDEX IF NOT EXISTS invoices_merchant_id_idx       ON invoices(merchant_id);
CREATE INDEX IF NOT EXISTS invoices_status_idx            ON invoices(status);
CREATE INDEX IF NOT EXISTS invoices_due_at_idx            ON invoices(due_at) WHERE due_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS payments_invoice_id_idx        ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS payments_status_idx            ON payments(status);
CREATE INDEX IF NOT EXISTS payments_tx_hash_idx           ON payments(tx_hash);
CREATE INDEX IF NOT EXISTS payment_events_payment_id_idx  ON payment_events(payment_id);
CREATE INDEX IF NOT EXISTS notifications_merchant_id_idx  ON notifications(merchant_id);
CREATE INDEX IF NOT EXISTS notifications_read_at_idx      ON notifications(read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS audit_logs_actor_wallet_idx    ON audit_logs(actor_wallet);
CREATE INDEX IF NOT EXISTS audit_logs_entity_id_idx       ON audit_logs(entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS api_keys_key_hash_idx          ON api_keys(key_hash);

-- ── Status CHECK constraints ─────────────────────────────────────────────────
-- These may fail if invalid data already exists; inspect before applying.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoices_status_check'
  ) THEN
    ALTER TABLE invoices
      ADD CONSTRAINT invoices_status_check
      CHECK (status IN ('pending', 'paid', 'expired', 'cancelled'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payments_status_check'
  ) THEN
    ALTER TABLE payments
      ADD CONSTRAINT payments_status_check
      CHECK (status IN ('pending', 'confirmed', 'failed'));
  END IF;
END $$;
