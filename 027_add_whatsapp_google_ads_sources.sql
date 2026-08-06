-- Kizen CRM - Migration 027: Add WhatsApp and Google Ads to CHECK Constraints

-- 1. Add 'google_ads' to leads.source CHECK constraint
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_source_check;
ALTER TABLE leads ADD CONSTRAINT leads_source_check
  CHECK (source IN (
    'instagram','facebook','walk_in','referral','website',
    'whatsapp','college_visit','google_ads','other'
  ));

-- 2. Add 'whatsapp' to ad_sync_connections.platform CHECK
ALTER TABLE ad_sync_connections DROP CONSTRAINT IF EXISTS ad_sync_connections_platform_check;
ALTER TABLE ad_sync_connections ADD CONSTRAINT ad_sync_connections_platform_check
  CHECK (platform IN ('meta', 'google_ads', 'whatsapp'));

-- 3. Add 'whatsapp' to data_intake_settings.source CHECK
ALTER TABLE data_intake_settings DROP CONSTRAINT IF EXISTS data_intake_settings_source_check;
ALTER TABLE data_intake_settings ADD CONSTRAINT data_intake_settings_source_check
  CHECK (source IN ('manual_upload', 'sheets_sync', 'meta_ads', 'google_ads', 'whatsapp'));
