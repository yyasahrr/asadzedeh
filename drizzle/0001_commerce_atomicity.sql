-- 0001: commerce atomicity.
-- Adds the columns needed to reserve stock/seats in the database instead of in
-- application memory, so two concurrent checkouts cannot both take the last unit.
-- Non-destructive: every statement is additive and re-runnable.

ALTER TABLE products ADD COLUMN IF NOT EXISTS allow_backorder BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sold INTEGER NOT NULL DEFAULT 0;

-- Backfill from the JSON payload written by the previous release.
UPDATE products SET allow_backorder = COALESCE((payload->>'allowBackorder')::boolean, FALSE);
UPDATE products SET sold = COALESCE((payload->>'sold')::int, 0);

ALTER TABLE classes ADD COLUMN IF NOT EXISTS reserved_seats INTEGER NOT NULL DEFAULT 0;

-- Marks an order whose reservation was returned after a failed/cancelled payment.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS released_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS payments_status_idx ON payments (status);
CREATE INDEX IF NOT EXISTS payments_created_idx ON payments (created_at);
CREATE INDEX IF NOT EXISTS orders_user_status_idx ON orders (user_id, status);
CREATE INDEX IF NOT EXISTS certificates_user_code_idx ON certificates (user_id, code);
CREATE INDEX IF NOT EXISTS seo_entries_type_idx ON seo_entries (entity_type);
