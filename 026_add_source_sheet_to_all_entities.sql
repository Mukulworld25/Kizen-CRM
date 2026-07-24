-- ============================================================================
-- 026_add_source_sheet_to_all_entities.sql
-- Adds source_sheet column to students, fees, institute_expenses, and institutions
-- to enable 100% accurate per-tab filtering in Fee Management & Expenses!
-- ============================================================================

ALTER TABLE students ADD COLUMN IF NOT EXISTS source_sheet TEXT;
ALTER TABLE fees ADD COLUMN IF NOT EXISTS source_sheet TEXT;
ALTER TABLE institute_expenses ADD COLUMN IF NOT EXISTS source_sheet TEXT;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS source_sheet TEXT;

-- Verify Notice
DO $$
BEGIN
  RAISE NOTICE '026 Migration Executed Successfully: Added source_sheet to students, fees, expenses, institutions!';
END $$;
