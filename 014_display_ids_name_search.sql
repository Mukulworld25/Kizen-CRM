-- Kizen CRM — Migration 014: Display IDs & Trigram Name Search

-- 1. Enable pg_trgm extension for fast name search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Add display_id columns
ALTER TABLE IF EXISTS leads ADD COLUMN IF NOT EXISTS display_id TEXT UNIQUE;
ALTER TABLE IF EXISTS institute_expenses ADD COLUMN IF NOT EXISTS display_id TEXT UNIQUE;
ALTER TABLE IF EXISTS institutions ADD COLUMN IF NOT EXISTS display_id TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_leads_display_id ON leads(display_id);
CREATE INDEX IF NOT EXISTS idx_expenses_display_id ON institute_expenses(display_id);
CREATE INDEX IF NOT EXISTS idx_institutions_display_id ON institutions(display_id);

-- 3. Add GIN Trigram Indexes for ILIKE & fuzzy name search
CREATE INDEX IF NOT EXISTS idx_leads_name_trgm ON leads USING gin (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_institutions_name_trgm ON institutions USING gin (name gin_trgm_ops);

-- 4. Automatic Sequence & Display ID Trigger Generator
CREATE OR REPLACE FUNCTION generate_display_id()
RETURNS TRIGGER AS $$
DECLARE
  v_prefix TEXT;
  v_year TEXT;
  v_seq_name TEXT;
  v_next_val INT;
BEGIN
  IF NEW.display_id IS NOT NULL AND NEW.display_id <> '' THEN
    RETURN NEW;
  END IF;

  v_year := to_char(COALESCE(NEW.created_at, NOW()), 'YYYY');

  IF TG_TABLE_NAME = 'leads' THEN
    v_prefix := 'LD';
  ELSIF TG_TABLE_NAME = 'institute_expenses' THEN
    v_prefix := 'EXP';
  ELSIF TG_TABLE_NAME = 'institutions' THEN
    v_prefix := 'INST';
  ELSE
    v_prefix := 'REF';
  END IF;

  v_seq_name := 'seq_' || v_prefix || '_' || v_year;

  -- Create sequence dynamically if it does not exist for this year
  EXECUTE format('CREATE SEQUENCE IF NOT EXISTS %I START 1', v_seq_name);
  EXECUTE format('SELECT nextval(%L)', v_seq_name) INTO v_next_val;

  NEW.display_id := v_prefix || '-' || v_year || '-' || lpad(v_next_val::text, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Attach Triggers BEFORE INSERT
DROP TRIGGER IF EXISTS trg_leads_display_id ON leads;
CREATE TRIGGER trg_leads_display_id BEFORE INSERT ON leads
  FOR EACH ROW EXECUTE FUNCTION generate_display_id();

DROP TRIGGER IF EXISTS trg_expenses_display_id ON institute_expenses;
CREATE TRIGGER trg_expenses_display_id BEFORE INSERT ON institute_expenses
  FOR EACH ROW EXECUTE FUNCTION generate_display_id();

DROP TRIGGER IF EXISTS trg_institutions_display_id ON institutions;
CREATE TRIGGER trg_institutions_display_id BEFORE INSERT ON institutions
  FOR EACH ROW EXECUTE FUNCTION generate_display_id();

-- 6. Retrofit Existing Rows with Display IDs
UPDATE leads
SET display_id = 'LD-' || to_char(created_at, 'YYYY') || '-' || lpad(row_num::text, 4, '0')
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY to_char(created_at, 'YYYY') ORDER BY created_at) as row_num
  FROM leads
) s
WHERE leads.id = s.id AND leads.display_id IS NULL;

UPDATE institute_expenses
SET display_id = 'EXP-' || to_char(created_at, 'YYYY') || '-' || lpad(row_num::text, 4, '0')
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY to_char(created_at, 'YYYY') ORDER BY created_at) as row_num
  FROM institute_expenses
) s
WHERE institute_expenses.id = s.id AND institute_expenses.display_id IS NULL;

UPDATE institutions
SET display_id = 'INST-' || to_char(created_at, 'YYYY') || '-' || lpad(row_num::text, 4, '0')
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY to_char(created_at, 'YYYY') ORDER BY created_at) as row_num
  FROM institutions
) s
WHERE institutions.id = s.id AND institutions.display_id IS NULL;
