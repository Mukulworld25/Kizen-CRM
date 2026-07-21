-- ============================================================================
-- 016_fix_all_data_issues.sql
-- Comprehensive data cleanup, overdue automation, payment notifications,
-- referral tracking, and import pipeline improvements for Kizen Education CRM
-- ============================================================================

-- ============================================================================
-- 1. OVERDUE INSTALLMENT TRANSITION (CRITICAL)
-- No cron job existed to move installments from 'pending' to 'overdue'
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_overdue_installments()
RETURNS void AS $$
BEGIN
  UPDATE installments 
  SET status = 'overdue' 
  WHERE due_date < CURRENT_DATE 
    AND status = 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run once immediately to fix existing data:
SELECT mark_overdue_installments();

-- Schedule with pg_cron (run in Supabase SQL editor after enabling pg_cron):
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('mark-overdue-installments', '0 3 * * *', 'SELECT mark_overdue_installments()');
-- This runs daily at 3:00 AM UTC (8:30 AM IST)


-- ============================================================================
-- 2. FIX DATA HALLUCINATIONS
-- ============================================================================

-- 2a. Fix fees.amount_paid where no actual fee_payments exist
-- This fixes the dashboard showing ₹76,500 revenue with "No payments yet"
UPDATE fees f
SET amount_paid = COALESCE(
  (SELECT SUM(fp.amount) FROM fee_payments fp WHERE fp.fee_id = f.id), 0
);

-- 2b. Delete installments with NULL due_date (cause of Jan 1, 1970 display)
DELETE FROM installments WHERE due_date IS NULL;

-- 2c. Fix installments with epoch dates (before year 2000)
-- Recalculate based on fee creation date + installment_number * 30 days
UPDATE installments i
SET due_date = (
  SELECT f.created_at::date + (i.installment_number * 30)
  FROM fees f WHERE f.id = i.fee_id
)
WHERE i.due_date < '2000-01-01'::date;


-- ============================================================================
-- 3. FIX FOLLOW-UPS OVERDUE STATUS
-- ============================================================================

UPDATE follow_ups
SET status = 'overdue'
WHERE scheduled_at < NOW()
  AND status = 'pending';


-- ============================================================================
-- 4. DAILY PAYMENT REMINDER NOTIFICATIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_payment_reminders()
RETURNS void AS $$
DECLARE
  inst RECORD;
  user_rec RECORD;
BEGIN
  -- Find installments due within next 3 days
  FOR inst IN
    SELECT i.*, s.full_name AS student_name
    FROM installments i
    JOIN students s ON s.id = i.student_id
    WHERE i.status = 'pending'
      AND i.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days'
  LOOP
    -- Notify all owners, admins, and accounts users
    FOR user_rec IN
      SELECT id FROM users 
      WHERE role IN ('owner', 'admin', 'accounts') 
        AND is_active = TRUE
    LOOP
      -- Avoid duplicate notifications (check if same notification exists today)
      IF NOT EXISTS (
        SELECT 1 FROM notifications 
        WHERE user_id = user_rec.id 
          AND related_id = inst.student_id
          AND type = 'fee_due'
          AND created_at::date = CURRENT_DATE
      ) THEN
        INSERT INTO notifications (user_id, title, message, type, related_id)
        VALUES (
          user_rec.id,
          'Payment Due: ' || inst.student_name,
          'Installment #' || inst.installment_number || ' of ₹' || inst.amount || ' is due on ' || TO_CHAR(inst.due_date, 'DD Mon YYYY'),
          'fee_due',
          inst.student_id
        );
      END IF;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule daily payment reminders (run in Supabase SQL editor):
-- SELECT cron.schedule('payment-reminders', '30 3 * * *', 'SELECT generate_payment_reminders()');
-- This runs daily at 3:30 AM UTC (9:00 AM IST)


-- ============================================================================
-- 5. REFERRAL TRACKING
-- ============================================================================

ALTER TABLE leads ADD COLUMN IF NOT EXISTS referred_by_lead_id UUID REFERENCES leads(id) ON DELETE SET NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS referral_code TEXT;
CREATE INDEX IF NOT EXISTS idx_leads_referral ON leads(referred_by_lead_id) WHERE referred_by_lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_referral_code ON leads(referral_code) WHERE referral_code IS NOT NULL;


-- ============================================================================
-- 6. IMPORT PIPELINE: COLUMN NAME NORMALIZATION
-- ============================================================================

CREATE OR REPLACE FUNCTION normalize_column_name(raw TEXT)
RETURNS TEXT AS $$
DECLARE
  cleaned TEXT;
BEGIN
  cleaned := LOWER(TRIM(raw));
  
  RETURN CASE cleaned
    -- Name variations
    WHEN 'student name' THEN 'full_name'
    WHEN 'name' THEN 'full_name'
    WHEN 'full name' THEN 'full_name'
    WHEN 'lead name' THEN 'full_name'
    WHEN 'contact name' THEN 'full_name'
    -- Phone variations
    WHEN 'phone no.' THEN 'mobile'
    WHEN 'phone no' THEN 'mobile'
    WHEN 'phone number' THEN 'mobile'
    WHEN 'phone' THEN 'mobile'
    WHEN 'contact no' THEN 'mobile'
    WHEN 'contact no.' THEN 'mobile'
    WHEN 'mobile no' THEN 'mobile'
    WHEN 'mobile no.' THEN 'mobile'
    WHEN 'mobile number' THEN 'mobile'
    WHEN 'whatsapp no' THEN 'mobile'
    WHEN 'whatsapp no.' THEN 'mobile'
    -- Email variations
    WHEN 'email id' THEN 'email'
    WHEN 'email address' THEN 'email'
    WHEN 'e-mail' THEN 'email'
    WHEN 'mail' THEN 'email'
    -- Parent variations
    WHEN 'father name' THEN 'parent_name'
    WHEN 'father''s name' THEN 'parent_name'
    WHEN 'parent' THEN 'parent_name'
    WHEN 'guardian name' THEN 'parent_name'
    WHEN 'father contact' THEN 'parent_contact'
    WHEN 'parent phone' THEN 'parent_contact'
    WHEN 'parent mobile' THEN 'parent_contact'
    -- Course variations
    WHEN 'course name' THEN 'interested_course'
    WHEN 'course' THEN 'interested_course'
    WHEN 'program' THEN 'interested_course'
    WHEN 'interested in' THEN 'interested_course'
    -- Source variations
    WHEN 'lead source' THEN 'source'
    WHEN 'how did you hear' THEN 'source'
    WHEN 'reference' THEN 'source'
    -- Date variations
    WHEN 'date' THEN 'lead_date'
    WHEN 'enquiry date' THEN 'lead_date'
    WHEN 'date of enquiry' THEN 'lead_date'
    -- City variations
    WHEN 'city/town' THEN 'city'
    WHEN 'location' THEN 'city'
    -- College variations
    WHEN 'college' THEN 'school_college'
    WHEN 'school' THEN 'school_college'
    WHEN 'institution' THEN 'school_college'
    WHEN 'school/college' THEN 'school_college'
    -- Graduation
    WHEN 'graduation year' THEN 'graduation_year'
    WHEN 'passing year' THEN 'graduation_year'
    WHEN 'year of passing' THEN 'graduation_year'
    WHEN 'class/year' THEN 'class_year'
    WHEN 'class' THEN 'class_year'
    WHEN 'year' THEN 'class_year'
    -- Fee variations
    WHEN 'total fee' THEN 'total_fee'
    WHEN 'total amount' THEN 'total_fee'
    WHEN 'fee amount' THEN 'total_fee'
    WHEN 'amount' THEN 'amount'
    WHEN 'discount' THEN 'discount'
    WHEN 'scholarship' THEN 'scholarship'
    -- Notes
    WHEN 'remarks' THEN 'notes'
    WHEN 'comment' THEN 'notes'
    WHEN 'comments' THEN 'notes'
    WHEN 'feedback' THEN 'notes'
    -- Default: return as-is (lowercased, spaces to underscores)
    ELSE REGEXP_REPLACE(cleaned, '[^a-z0-9]', '_', 'g')
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- ============================================================================
-- 7. VERIFY FIXES
-- ============================================================================

-- Count remaining bad data
DO $$
DECLARE
  bad_installment_dates INT;
  orphaned_fees INT;
  overdue_followups INT;
BEGIN
  SELECT COUNT(*) INTO bad_installment_dates FROM installments WHERE due_date IS NULL OR due_date < '2000-01-01';
  SELECT COUNT(*) INTO orphaned_fees FROM fees f WHERE f.amount_paid > 0 AND NOT EXISTS (SELECT 1 FROM fee_payments fp WHERE fp.fee_id = f.id);
  SELECT COUNT(*) INTO overdue_followups FROM follow_ups WHERE scheduled_at < NOW() AND status = 'pending';
  
  RAISE NOTICE 'Post-cleanup results:';
  RAISE NOTICE '  Bad installment dates: %', bad_installment_dates;
  RAISE NOTICE '  Orphaned fee amounts: %', orphaned_fees;
  RAISE NOTICE '  Unflagged overdue follow-ups: %', overdue_followups;
END $$;
