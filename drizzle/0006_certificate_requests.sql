-- Certificate completion requests are separate from issued certificates.
-- Additive only: existing certificates remain untouched and valid.
CREATE TABLE IF NOT EXISTS certificate_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ NOT NULL,
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  certificate_code TEXT,
  payload JSONB NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS certificate_requests_user_course_idx
  ON certificate_requests (user_id, course_slug);
CREATE INDEX IF NOT EXISTS certificate_requests_status_idx
  ON certificate_requests (status);
