-- ============================================================================
-- 022_unlock_all_counselor_rls.sql
-- Unlocks RLS SELECT policies for students, follow_ups, leads, fees, fee_payments,
-- and installments for all authenticated users so that Owner Matrix settings
-- dynamically control data visibility across all roles (Counselor, Reception, BDM, Accounts, Admin, Owner).
-- ============================================================================

-- 1. Students Table Select Policy
DROP POLICY IF EXISTS students_select ON students;
CREATE POLICY students_select ON students FOR SELECT USING (TRUE);

-- 2. Follow-ups Table Select Policy
DROP POLICY IF EXISTS follow_ups_select ON follow_ups;
CREATE POLICY follow_ups_select ON follow_ups FOR SELECT USING (TRUE);

-- 3. Leads Table Select Policy
DROP POLICY IF EXISTS leads_select ON leads;
CREATE POLICY leads_select ON leads FOR SELECT USING (TRUE);

-- 4. Fees Table Select Policy
DROP POLICY IF EXISTS fees_select ON fees;
CREATE POLICY fees_select ON fees FOR SELECT USING (TRUE);

-- 5. Fee Payments Table Select Policy
DROP POLICY IF EXISTS fee_payments_select ON fee_payments;
CREATE POLICY fee_payments_select ON fee_payments FOR SELECT USING (TRUE);

-- 6. Installments Table Select Policy
DROP POLICY IF EXISTS installments_select ON installments;
CREATE POLICY installments_select ON installments FOR SELECT USING (TRUE);

-- 7. Sync auth_id in users table with auth.users
UPDATE users u
SET auth_id = au.id
FROM auth.users au
WHERE LOWER(u.email) = LOWER(au.email)
  AND (u.auth_id IS NULL OR u.auth_id != au.id);

-- Verification Notice
DO $$
BEGIN
  RAISE NOTICE '022 Migration Executed Successfully: All RLS SELECT policies unlocked for Matrix control!';
END $$;
