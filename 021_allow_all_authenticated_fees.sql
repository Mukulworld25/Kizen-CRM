-- ============================================================================
-- 021_allow_all_authenticated_fees.sql
-- Relaxes RLS SELECT policies on fees, fee_payments, and installments
-- so Counselors, Receptionists, and BDMs can view fee records when granted permission by Owner.
-- ============================================================================

-- 1. Fees Table Select Policy
DROP POLICY IF EXISTS fees_select ON fees;
CREATE POLICY fees_select ON fees FOR SELECT USING (TRUE);

-- 2. Fee Payments Table Select Policy
DROP POLICY IF EXISTS fee_payments_select ON fee_payments;
CREATE POLICY fee_payments_select ON fee_payments FOR SELECT USING (TRUE);

-- 3. Installments Table Select Policy
DROP POLICY IF EXISTS installments_select ON installments;
CREATE POLICY installments_select ON installments FOR SELECT USING (TRUE);

-- 4. Installments Update Policy (allow counselors & reception to record payments)
DROP POLICY IF EXISTS installments_update ON installments;
CREATE POLICY installments_update ON installments FOR UPDATE USING (TRUE);

-- 5. Fee Payments Insert Policy (allow counselors & reception to record payments)
DROP POLICY IF EXISTS fee_payments_insert ON fee_payments;
CREATE POLICY fee_payments_insert ON fee_payments FOR INSERT WITH CHECK (TRUE);

-- Verification Notice
DO $$
BEGIN
  RAISE NOTICE '021 Migration Executed Successfully: Fee access unlocked for Counselors & Reception!';
END $$;
