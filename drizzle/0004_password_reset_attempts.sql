-- 0004: password reset attempt budget.
-- Additive and re-runnable.

-- A reset code is single-use and short-lived, but within its validity window it
-- is guessable, so wrong guesses have to be bounded. The budget lives on the
-- row and resets naturally when a fresh code is issued (the old row is consumed).
ALTER TABLE password_resets ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0;

-- Lookups are always "latest unused code for this user".
CREATE INDEX IF NOT EXISTS password_resets_lookup_idx
  ON password_resets (user_id, used_at, expires_at);
