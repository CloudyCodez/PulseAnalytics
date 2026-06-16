-- ============================================================
-- PULSE DATABASE SCHEMA
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id          TEXT UNIQUE NOT NULL,
  email                  TEXT NOT NULL,
  full_name              TEXT,
  company_name           TEXT,
  plan                   TEXT NOT NULL DEFAULT 'trial'
                           CHECK (plan IN ('trial', 'starter', 'growth', 'scale', 'cancelled')),
  stripe_customer_id     TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  trial_ends_at          TIMESTAMPTZ,
  report_delivery_day    TEXT NOT NULL DEFAULT 'monday',
  report_delivery_time   TEXT NOT NULL DEFAULT '07:00',
  timezone               TEXT NOT NULL DEFAULT 'America/New_York',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own record"
  ON users FOR SELECT
  USING (auth.uid()::text = clerk_user_id);
CREATE POLICY "Users can update own record"
  ON users FOR UPDATE
  USING (auth.uid()::text = clerk_user_id);

-- ============================================================
-- INTEGRATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS integrations (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider         TEXT NOT NULL
                     CHECK (provider IN ('ga4', 'google_ads', 'meta', 'shopify',
                                         'klaviyo', 'tiktok', 'hubspot', 'stripe',
                                         'gohighlevel', 'youtube', 'linkedin', 'pinterest')),
  status           TEXT NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'error', 'disconnected', 'expired')),
  access_token     TEXT,
  refresh_token    TEXT,
  token_expires_at TIMESTAMPTZ,
  account_id       TEXT,
  property_id      TEXT,
  store_url        TEXT,
  connected_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_at   TIMESTAMPTZ,
  error_message    TEXT,
  UNIQUE (user_id, provider)
);

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own integrations"
  ON integrations FOR ALL
  USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

-- ============================================================
-- REPORTS
-- ============================================================
CREATE TABLE IF NOT EXISTS reports (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start     DATE NOT NULL,
  week_end       DATE NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'generating', 'sent', 'failed')),
  data_snapshot  JSONB,
  ai_commentary  TEXT,
  email_subject  TEXT,
  sent_at        TIMESTAMPTZ,
  error_message  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own reports"
  ON reports FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

-- ============================================================
-- ANOMALIES
-- ============================================================
CREATE TABLE IF NOT EXISTS anomalies (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  metric      TEXT NOT NULL,
  change_pct  NUMERIC NOT NULL,
  direction   TEXT NOT NULL CHECK (direction IN ('up', 'down')),
  message     TEXT NOT NULL,
  notified    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE anomalies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own anomalies"
  ON anomalies FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

-- ============================================================
-- ALERT PREFERENCES
-- ============================================================
CREATE TABLE IF NOT EXISTS alert_preferences (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  roas_drop         BOOLEAN NOT NULL DEFAULT TRUE,
  spend_spike       BOOLEAN NOT NULL DEFAULT TRUE,
  revenue_drop      BOOLEAN NOT NULL DEFAULT TRUE,
  cac_spike         BOOLEAN NOT NULL DEFAULT FALSE,
  via_email         BOOLEAN NOT NULL DEFAULT TRUE,
  via_slack         BOOLEAN NOT NULL DEFAULT FALSE,
  slack_webhook_url TEXT,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE alert_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own alert preferences"
  ON alert_preferences FOR ALL
  USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_integrations_user_id ON integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_integrations_status ON integrations(status);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_anomalies_user_id ON anomalies(user_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_created_at ON anomalies(created_at DESC);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
