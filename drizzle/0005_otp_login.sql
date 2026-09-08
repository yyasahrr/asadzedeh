-- One-time codes for phone login.
--
-- Additive only. Mirrors password_resets: the code itself is never stored, only
-- its hash, and single-use is enforced by a conditional UPDATE rather than by
-- application bookkeeping.

CREATE TABLE IF NOT EXISTS otp_codes (
  id TEXT PRIMARY KEY,
  phone TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  -- Wrong guesses against this code. Bounds brute force inside its window.
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS otp_codes_phone_idx ON otp_codes (phone);
CREATE INDEX IF NOT EXISTS otp_codes_lookup_idx ON otp_codes (phone, used_at, expires_at);
-- Throttling lookups scan recent rows per phone.
CREATE INDEX IF NOT EXISTS otp_codes_created_idx ON otp_codes (phone, created_at);
