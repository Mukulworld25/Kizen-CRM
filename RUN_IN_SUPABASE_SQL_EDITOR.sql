-- =================================================================
-- KIZEN CRM — COMPLETE PHASE 3, 3B, 3C MASTER MIGRATION SCRIPT
-- RUN THIS ENTIRE FILE IN SUPABASE SQL EDITOR
-- =================================================================

-- 1. Enable pg_trgm Extension for Name Search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Phone Normalization Helper Function
CREATE OR REPLACE FUNCTION normalize_phone(p_raw TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_digits TEXT;
BEGIN
  IF p_raw IS NULL OR trim(p_raw) = '' THEN
    RETURN NULL;
  END IF;

  v_digits := regexp_replace(trim(p_raw), '[^0-9]', '', 'g');

  IF length(v_digits) = 12 AND v_digits LIKE '91%' THEN
    v_digits := substring(v_digits from 3);
  END IF;

  IF length(v_digits) = 10 THEN
    RETURN v_digits;
  ELSE
    RETURN NULL;
  END IF;
END;
$$;

-- 3. Leads Table Schema Additions (Display ID, Analytics & Tracking)
ALTER TABLE IF EXISTS leads ADD COLUMN IF NOT EXISTS display_id TEXT UNIQUE;
ALTER TABLE IF EXISTS leads ADD COLUMN IF NOT EXISTS counselor_name TEXT;
ALTER TABLE IF EXISTS leads ADD COLUMN IF NOT EXISTS hot_lead_status TEXT;
ALTER TABLE IF EXISTS leads ADD COLUMN IF NOT EXISTS pipeline_stage TEXT DEFAULT 'new';
ALTER TABLE IF EXISTS leads ADD COLUMN IF NOT EXISTS interest_level TEXT;
ALTER TABLE IF EXISTS leads ADD COLUMN IF NOT EXISTS disposition TEXT;
ALTER TABLE IF EXISTS leads ADD COLUMN IF NOT EXISTS lead_date DATE;
ALTER TABLE IF EXISTS leads ADD COLUMN IF NOT EXISTS tap_date DATE;
ALTER TABLE IF EXISTS leads ADD COLUMN IF NOT EXISTS days_to_first_contact INT;

-- Composite & Trigram Indexes for Analytics Speed
CREATE INDEX IF NOT EXISTS idx_leads_stage_city ON leads(pipeline_stage, city);
CREATE INDEX IF NOT EXISTS idx_leads_stage_counselor ON leads(pipeline_stage, counselor_name);
CREATE INDEX IF NOT EXISTS idx_leads_name_trgm ON leads USING gin (full_name gin_trgm_ops);

-- 4. Fee Payments & Fee Installments Schema (Receivables)
ALTER TABLE IF EXISTS fee_payments ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS fee_payments ADD COLUMN IF NOT EXISTS student_name TEXT;
ALTER TABLE IF EXISTS fee_payments ADD COLUMN IF NOT EXISTS contact_no TEXT;
ALTER TABLE IF EXISTS fee_payments ADD COLUMN IF NOT EXISTS course TEXT;
ALTER TABLE IF EXISTS fee_payments ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE IF EXISTS fee_payments ADD COLUMN IF NOT EXISTS duration TEXT;
ALTER TABLE IF EXISTS fee_payments ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10,2);
ALTER TABLE IF EXISTS fee_payments ADD COLUMN IF NOT EXISTS pending_amount NUMERIC(10,2);
ALTER TABLE IF EXISTS fee_payments ADD COLUMN IF NOT EXISTS display_id TEXT UNIQUE;

CREATE TABLE IF NOT EXISTS fee_installments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fee_payment_id UUID REFERENCES fee_payments(id) ON DELETE CASCADE,
  installment_number INT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_installments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fee_payments_all ON fee_payments;
CREATE POLICY fee_payments_all ON fee_payments FOR ALL USING (TRUE);

DROP POLICY IF EXISTS fee_installments_all ON fee_installments;
CREATE POLICY fee_installments_all ON fee_installments FOR ALL USING (TRUE);

-- 5. Dynamic Sequence & Display ID Generator Trigger (LD-YYYY-####, EXP-YYYY-####)
CREATE OR REPLACE FUNCTION generate_display_id()
RETURNS TRIGGER AS $$
DECLARE
  v_prefix TEXT;
  v_year TEXT;
  v_seq_name TEXT;
  v_nextval INT;
BEGIN
  IF NEW.display_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_year := to_char(CURRENT_DATE, 'YYYY');

  IF TG_TABLE_NAME = 'leads' THEN
    v_prefix := 'LD';
  ELSIF TG_TABLE_NAME = 'fee_payments' THEN
    v_prefix := 'EXP';
  ELSIF TG_TABLE_NAME = 'institutions' THEN
    v_prefix := 'INST';
  ELSE
    v_prefix := 'REF';
  END IF;

  v_seq_name := lower('seq_' || v_prefix || '_' || v_year);

  EXECUTE format('CREATE SEQUENCE IF NOT EXISTS %I START 1', v_seq_name);
  EXECUTE format('SELECT nextval(%L)', v_seq_name) INTO v_nextval;

  NEW.display_id := v_prefix || '-' || v_year || '-' || lpad(v_nextval::text, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_leads_display_id ON leads;
CREATE TRIGGER trg_leads_display_id BEFORE INSERT ON leads
  FOR EACH ROW EXECUTE FUNCTION generate_display_id();

DROP TRIGGER IF EXISTS trg_fee_payments_display_id ON fee_payments;
CREATE TRIGGER trg_fee_payments_display_id BEFORE INSERT ON fee_payments
  FOR EACH ROW EXECUTE FUNCTION generate_display_id();

-- 6. Trigger Function to Derive pipeline_stage & days_to_first_contact (Updated Step 5)
CREATE OR REPLACE FUNCTION derive_lead_analytics()
RETURNS TRIGGER AS $$
DECLARE
  v_has_payment BOOLEAN;
BEGIN
  IF NEW.tap_date IS NOT NULL AND NEW.lead_date IS NOT NULL THEN
    NEW.days_to_first_contact := (NEW.tap_date - NEW.lead_date);
    IF NEW.days_to_first_contact < 0 THEN
      NEW.days_to_first_contact := 0;
    END IF;
  END IF;

  IF NEW.id IS NOT NULL THEN
    SELECT EXISTS (SELECT 1 FROM fee_payments WHERE lead_id = NEW.id) INTO v_has_payment;
  ELSE
    v_has_payment := FALSE;
  END IF;

  IF v_has_payment IS TRUE THEN
    NEW.pipeline_stage := 'enrolled';
  ELSIF (NEW.hot_lead_status IS NOT NULL AND trim(NEW.hot_lead_status) <> '') OR NEW.interest_level ILIKE 'Hot' OR NEW.interest_level ILIKE 'Warm' THEN
    NEW.pipeline_stage := 'warm';
  ELSIF NEW.interest_level ILIKE 'Cold' THEN
    NEW.pipeline_stage := 'cold';
  ELSIF NEW.interest_level ILIKE 'Dead' OR NEW.disposition ILIKE '%not interested%' OR NEW.disposition ILIKE '%dead%' OR NEW.disposition ILIKE '%plan dropped%' THEN
    NEW.pipeline_stage := 'dead';
  ELSIF NEW.status = 'contacted' OR NEW.status ILIKE 'Not Connected' OR NEW.status ILIKE 'Connected' OR NEW.interest_level ILIKE 'Not Connected' OR NEW.interest_level ILIKE 'Connected' OR NEW.tap_date IS NOT NULL THEN
    NEW.pipeline_stage := 'contacted';
  ELSE
    NEW.pipeline_stage := 'new';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_leads_derive_analytics ON leads;
CREATE TRIGGER trg_leads_derive_analytics BEFORE INSERT OR UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION derive_lead_analytics();

-- 7. Live VIEW for Lead Enrollments & Real-time Revenue
CREATE OR REPLACE VIEW v_leads_analytics AS
SELECT
  l.id AS lead_id,
  l.display_id,
  l.full_name,
  l.mobile,
  l.city,
  l.counselor_name,
  l.pipeline_stage,
  l.days_to_first_contact,
  (fp.id IS NOT NULL) AS is_enrolled,
  COALESCE(fp.total_amount, 0) AS total_revenue,
  COALESCE(fp.pending_amount, 0) AS pending_revenue
FROM leads l
LEFT JOIN fee_payments fp ON fp.lead_id = l.id;

-- 8. Postgres VIEW for Dashboard Summary Metrics
CREATE OR REPLACE VIEW dashboard_summary AS
SELECT
  COUNT(l.id) AS total_leads,
  ROUND(
    (COUNT(CASE WHEN l.pipeline_stage = 'enrolled' THEN 1 END)::NUMERIC / NULLIF(COUNT(l.id), 0)) * 100,
    2
  ) AS conversion_rate_percent,
  COALESCE(SUM(fp.total_amount - COALESCE(fp.pending_amount, 0)), 0) AS revenue_collected,
  COALESCE(SUM(fp.pending_amount), 0) AS revenue_pending,
  ROUND(AVG(l.days_to_first_contact), 1) AS avg_days_to_first_contact,
  (
    SELECT jsonb_object_agg(stage, cnt)
    FROM (
      SELECT COALESCE(pipeline_stage, 'new') AS stage, COUNT(*) AS cnt
      FROM leads GROUP BY pipeline_stage
    ) s
  ) AS leads_by_stage,
  (
    SELECT jsonb_object_agg(c, cnt)
    FROM (
      SELECT COALESCE(city, 'Unknown') AS c, COUNT(*) AS cnt
      FROM leads GROUP BY city ORDER BY cnt DESC LIMIT 10
    ) c_sub
  ) AS leads_by_city,
  (
    SELECT jsonb_object_agg(cn, cnt)
    FROM (
      SELECT COALESCE(counselor_name, 'Unassigned') AS cn, COUNT(*) AS cnt
      FROM leads GROUP BY counselor_name ORDER BY cnt DESC LIMIT 10
    ) cn_sub
  ) AS leads_by_counselor
FROM leads l
LEFT JOIN fee_payments fp ON fp.lead_id = l.id;

-- 9. Update data_templates Seed Rows
INSERT INTO data_templates (section, required_columns, optional_columns, dedup_keys) VALUES
  (
    'leads',
    '["full_name", "mobile"]'::jsonb,
    '[{"name": "email", "default": null}, {"name": "parent_name", "default": null}, {"name": "parent_contact", "default": null}, {"name": "city", "default": null}, {"name": "school_college", "default": null}, {"name": "class_year", "default": null}, {"name": "graduation_year", "default": null}, {"name": "graduation_degree", "default": null}, {"name": "source", "default": "website"}, {"name": "status", "default": "new_lead"}, {"name": "priority", "default": "medium"}, {"name": "notes", "default": null}, {"name": "lead_date", "default": null}, {"name": "tap_date", "default": null}, {"name": "counselor_name", "default": null}, {"name": "hot_lead_status", "default": null}, {"name": "interest_level", "default": null}, {"name": "disposition", "default": null}]'::jsonb,
    '["mobile", "email"]'::jsonb
  ),
  (
    'fee_payments',
    '["student_name", "contact_no", "total_amount"]'::jsonb,
    '[{"name": "course", "default": null}, {"name": "subject", "default": null}, {"name": "duration", "default": null}, {"name": "pending_amount", "default": null}]'::jsonb,
    '["contact_no", "total_amount", "student_name"]'::jsonb
  )
ON CONFLICT (section) DO UPDATE SET
  required_columns = EXCLUDED.required_columns,
  optional_columns = EXCLUDED.optional_columns,
  dedup_keys = EXCLUDED.dedup_keys;