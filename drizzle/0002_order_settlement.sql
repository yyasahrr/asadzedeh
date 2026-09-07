-- 0002: order settlement marker + one-certificate-per-learner.
-- Additive and re-runnable.

-- Set inside the fulfilment transaction, so "PAID but stock not settled" and
-- "settled twice" are both impossible.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS orders_settled_idx ON orders (settled_at);

-- One certificate per learner per course. Partial so a revoked certificate can
-- be reissued without colliding with the revoked row.
CREATE UNIQUE INDEX IF NOT EXISTS certificates_user_course_active_idx
  ON certificates (user_id, course_title)
  WHERE revoked_at IS NULL AND user_id IS NOT NULL;

-- Certificates are snapshots; nothing should ever rewrite an issued one.
ALTER TABLE certificates ALTER COLUMN student_name SET NOT NULL;
ALTER TABLE certificates ALTER COLUMN course_title SET NOT NULL;
