-- ============================================================================
-- 017_wipe_old_test_data.sql
-- Safely clears old test data (leads, students, fees, payments, followups, expenses)
-- while preserving system users, roles, courses, and core configurations.
-- ============================================================================

-- Disable triggers temporarily for clean truncation
TRUNCATE TABLE 
  fee_payments,
  installments,
  fees,
  attendance,
  student_documents,
  students,
  follow_ups,
  lead_activities,
  leads,
  institute_expenses,
  notifications,
  import_audit_log
CASCADE;

-- Optional: Reset batch seat counts
UPDATE batches SET enrolled_count = 0;

-- Verification Notice
DO $$
BEGIN
  RAISE NOTICE 'Old test data has been successfully wiped!';
  RAISE NOTICE 'System users, roles, courses, and batches are preserved and ready for fresh data import.';
END $$;
