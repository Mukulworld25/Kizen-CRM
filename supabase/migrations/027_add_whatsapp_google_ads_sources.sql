-- Kizen CRM - Migration 027: Add WhatsApp and Google Ads to CHECK Constraints & Ensure Intake Tables Exist

-- 1. Ensure leads table allows 'google_ads' in source CHECK constraint
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_source_check;
ALTER TABLE leads ADD CONSTRAINT leads_source_check
  CHECK (source IN (
    'instagram','facebook','walk_in','referral','website',
    'whatsapp','college_visit','google_ads','other'
  ));

-- 2. Ensure ad_sync_connections table exists with updated platform CHECK constraint
CREATE TABLE IF NOT EXISTS ad_sync_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform TEXT NOT NULL,
  account_id TEXT,
  access_token TEXT,
  is_active BOOLEAN DEFAULT FALSE,
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'pending_approval' CHECK (sync_status IN ('not_connected', 'pending_approval', 'active', 'error'))
);

ALTER TABLE ad_sync_connections DROP CONSTRAINT IF EXISTS ad_sync_connections_platform_check;
ALTER TABLE ad_sync_connections ADD CONSTRAINT ad_sync_connections_platform_check
  CHECK (platform IN ('meta', 'google_ads', 'whatsapp'));

-- 3. Ensure data_intake_settings table exists with updated source CHECK constraint
CREATE TABLE IF NOT EXISTS data_intake_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT UNIQUE NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,
  last_synced_at TIMESTAMPTZ
);

ALTER TABLE data_intake_settings DROP CONSTRAINT IF EXISTS data_intake_settings_source_check;
ALTER TABLE data_intake_settings ADD CONSTRAINT data_intake_settings_source_check
  CHECK (source IN ('manual_upload', 'sheets_sync', 'meta_ads', 'google_ads', 'whatsapp'));

-- Seed default settings
INSERT INTO data_intake_settings (source, is_enabled) VALUES
  ('manual_upload', TRUE),
  ('sheets_sync', TRUE),
  ('meta_ads', FALSE),
  ('google_ads', FALSE),
  ('whatsapp', FALSE)
ON CONFLICT (source) DO NOTHING;
