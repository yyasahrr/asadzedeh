CREATE TABLE IF NOT EXISTS sms_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'melipayamak',
  provider_template_id INTEGER NOT NULL CHECK (provider_template_id > 0),
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  variable_order JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sms_rules (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  template_id TEXT NOT NULL REFERENCES sms_templates(id) ON DELETE RESTRICT,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  priority INTEGER NOT NULL DEFAULT 100,
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  recipient_strategy TEXT NOT NULL DEFAULT 'event_recipient',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sms_rules_event_idx ON sms_rules (event_id, enabled, priority);

CREATE TABLE IF NOT EXISTS sms_delivery_logs (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  event_key TEXT NOT NULL,
  rule_id TEXT NOT NULL REFERENCES sms_rules(id) ON DELETE RESTRICT,
  template_id TEXT NOT NULL REFERENCES sms_templates(id) ON DELETE RESTRICT,
  provider TEXT NOT NULL,
  recipient_masked TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'sent', 'failed', 'skipped')),
  provider_code TEXT,
  provider_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  UNIQUE (event_key, rule_id)
);
CREATE INDEX IF NOT EXISTS sms_delivery_logs_filter_idx ON sms_delivery_logs (status, event_id, template_id, created_at DESC);
