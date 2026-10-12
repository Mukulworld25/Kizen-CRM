-- Migration 050: Enforce unique 10-digit mobile number on leads and index lead_date
-- Prevents duplicate leads across Meta/Google/Manual imports at the database constraint level

-- 1. Create unique partial index on normalized 10-digit mobile number
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_unique_10digit_mobile 
ON leads (RIGHT(REGEXP_REPLACE(mobile, '[^0-9]', '', 'g'), 10))
WHERE mobile IS NOT NULL 
  AND LENGTH(REGEXP_REPLACE(mobile, '[^0-9]', '', 'g')) >= 10
  AND RIGHT(REGEXP_REPLACE(mobile, '[^0-9]', '', 'g'), 10) != '9999999999'
  AND is_deleted = false;

-- 2. Create compound index on lead_date DESC, created_at DESC for ultra-fast ordering
CREATE INDEX IF NOT EXISTS idx_leads_lead_date_created_at_desc
ON leads (lead_date DESC NULLS LAST, created_at DESC)
WHERE is_deleted = false;
