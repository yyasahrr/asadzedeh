-- 0005: one-time login codes (SMS OTP).
-- Additive and re-runnable.

-- Codes are stored hashed and single-use, mirroring password_resets. The phone
-- is the identity here rather than a user id, because an OTP may also create
-- the account (when registration by OTP is enabled), and because issuing a code
-- must not require confirming that the number is registered.
CREATE TABLE IF NOT EXISTS otp_codes (
  id TEXT PRIMARY KEY,
  phone TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'login',
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  -- Wrong guesses against this code; bounds brute force inside the window.
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lookups are "latest unused code for this phone".
CREATE INDEX IF NOT EXISTS otp_codes_lookup_idx ON otp_codes (phone, used_at, expires_at);
-- The hourly send budget is counted over this.
CREATE INDEX IF NOT EXISTS otp_codes_recent_idx ON otp_codes (phone, created_at);
