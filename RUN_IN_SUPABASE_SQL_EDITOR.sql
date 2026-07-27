-- ============================================
-- RUN THIS IN SUPABASE DASHBOARD > SQL EDITOR
-- ============================================

-- 1. Add missing columns to batches table
ALTER TABLE batches ADD COLUMN IF NOT EXISTS days_of_week TEXT;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS schedule_days TEXT;

-- 2. Add referral columns to leads and students
ALTER TABLE leads ADD COLUMN IF NOT EXISTS referred_by_student_id UUID REFERENCES students(id) ON DELETE SET NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS referred_by_lead_id UUID REFERENCES leads(id) ON DELETE SET NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS referred_by_student_id UUID REFERENCES students(id) ON DELETE SET NULL;

-- 3. Add NOTIFY to reload schema cache
NOTIFY pgrst, 'reload schema';

-- 4. Create trigger to auto-set fees.course_id on insert
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

-- 5. Verify backfill results
SELECT 'students_with_batch' as check, count(*) FROM students WHERE batch_id IS NOT NULL
UNION ALL
SELECT 'fees_with_course', count(*) FROM fees WHERE course_id IS NOT NULL;