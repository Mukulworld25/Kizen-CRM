-- =====================================================
-- KIZEN CRM — AI Features + Lead Scoring + Command Palette
-- =====================================================

-- Feature 2: Lead score column (0-100 range)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0;

-- Feature 3: AI summary on activities
ALTER TABLE lead_activities ADD COLUMN IF NOT EXISTS ai_summary TEXT;

-- Indexes for lead scoring query
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(lead_score) WHERE lead_score > 0;

-- Index for cold leads detection (Feature 4)
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_date ON lead_activities(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_batches_capacity ON batches(enrolled_count, total_seats);