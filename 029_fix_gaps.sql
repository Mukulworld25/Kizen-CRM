-- KIZEN CRM — GAP FIX MIGRATION
-- 1. Add missing columns to batches
-- 2. Backfill students.batch_id from course_id
-- 3. Backfill fees.course_id from students
-- 4. Add trigger to auto-set fees.course_id on insert

-- ============================================
-- PART 1: Add missing columns to batches
-- ============================================
ALTER TABLE batches ADD COLUMN IF NOT EXISTS days_of_week TEXT;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS schedule_days TEXT;

-- ============================================
-- PART 2: Backfill students.batch_id from course_id
-- Deterministic: one batch per course, so we match by course_id
-- ============================================
UPDATE students s
SET batch_id = b.id
FROM batches b
WHERE s.course_id IS NOT NULL
  AND b.course_id = s.course_id
  AND s.batch_id IS NULL;

-- ============================================
-- PART 3: Backfill fees.course_id from students
-- ============================================
UPDATE fees f
SET course_id = s.course_id
FROM students s
WHERE f.student_id = s.id
  AND s.course_id IS NOT NULL
  AND f.course_id IS NULL;

-- ============================================
-- PART 4: Trigger to auto-set fees.course_id on insert
-- ============================================
CREATE OR REPLACE FUNCTION auto_set_fee_course_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.course_id IS NULL THEN
    SELECT course_id INTO NEW.course_id
    FROM students
    WHERE id = NEW.student_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_set_fee_course_id ON fees;
CREATE TRIGGER trg_auto_set_fee_course_id
  BEFORE INSERT ON fees
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_fee_course_id();