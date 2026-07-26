-- ============================================================================
-- 019_phase4_final_schema_and_employees.sql
-- Adds Lakshaya Ma'am & Aadya Sharma counselor accounts,
-- partial payment support to installments, payment methods (UPI/Bank/Cash),
-- and referral linking.
-- ============================================================================

-- 1. Partial Payments & Payment Methods on Installments Table
ALTER TABLE installments ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('upi', 'bank_transfer', 'cash', 'other'));
ALTER TABLE installments ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE installments ADD COLUMN IF NOT EXISTS pending_balance NUMERIC(10, 2);

-- Update status constraint to include 'partial'
ALTER TABLE installments DROP CONSTRAINT IF EXISTS installments_status_check;
ALTER TABLE installments ADD CONSTRAINT installments_status_check CHECK (status IN ('pending', 'partial', 'paid', 'overdue', 'cancelled'));

-- Initialize pending_balance for existing installments where missing
UPDATE installments 
SET pending_balance = amount - COALESCE(amount_paid, 0)
WHERE pending_balance IS NULL;

-- 2. Referral Tracking FK on Leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS referred_by_lead_id UUID REFERENCES leads(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_leads_referred_by ON leads(referred_by_lead_id) WHERE referred_by_lead_id IS NOT NULL;

-- 3. Seed/Update Team & Role Accounts (Shivam, Megha, Aadya Sharma, Lakshaya Ma'am, Preeti Verma)
INSERT INTO users (name, email, role, is_owner, is_active)
VALUES
  ('Shivam Owner', 'shivam.kizen.test@gmail.com', 'owner', TRUE, TRUE),
  ('Shivam Owner (Edu)', 'shivam@kizen.edu', 'owner', TRUE, TRUE),
  ('Megha Owner', 'megha@kizen.edu', 'owner', TRUE, TRUE),
  ('Aadya Sharma (Counselor 1)', 'counselor1@kizen.edu', 'counselor', FALSE, TRUE),
  ('Lakshaya Ma''am (Counselor 2)', 'lakshaya@kizen.edu', 'counselor', FALSE, TRUE),
  ('Preeti Verma (Front Desk)', 'reception@kizen.edu', 'reception', FALSE, TRUE)
ON CONFLICT (email) DO UPDATE 
SET 
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  is_owner = EXCLUDED.is_owner,
  is_active = EXCLUDED.is_active;

-- Auto-link auth_id if matching user exists in auth.users
UPDATE users u
SET auth_id = au.id
FROM auth.users au
WHERE LOWER(u.email) = LOWER(au.email)
  AND (u.auth_id IS NULL OR u.auth_id != au.id);

-- Verification Notice
DO $$
BEGIN
  RAISE NOTICE '019 Migration Executed Successfully: Partial payments, Referral FK, and Staff Accounts updated!';
END $$;
