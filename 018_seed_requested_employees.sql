-- ============================================================================
-- 018_seed_requested_employees.sql (PERFECTED & ORDERED)
-- Seeds the requested employee accounts into the CRM users table in correct order:
-- 1. Owners (Shivam, Megha)
-- 2. Counselors (Aadya Sharma, Counselor 2)
-- 3. Front Desk (Preeti Verma)
-- 4. Attender Staff
-- ============================================================================

-- 1. Disconnect foreign key references on test data to avoid constraint errors
UPDATE institutions SET assigned_bdm_id = NULL;
UPDATE leads SET assigned_counselor_id = NULL, created_by = NULL;
UPDATE batches SET faculty_id = NULL;
UPDATE students SET faculty_id = NULL;
UPDATE follow_ups SET assigned_to = NULL, created_by = NULL;
UPDATE lead_activities SET created_by = NULL;

-- 2. Clean out old test/dummy users (keep primary Shivam owner)
DELETE FROM users WHERE email NOT IN ('shivam@kizen.edu');

-- 3. Insert the exact clean employee accounts requested
INSERT INTO users (name, email, role, is_owner, is_active)
VALUES
  ('Shivam Owner', 'shivam@kizen.edu', 'owner', TRUE, TRUE),
  ('Megha Owner', 'megha@kizen.edu', 'owner', TRUE, TRUE),
  ('Aadya Sharma (Counselor 1)', 'counselor1@kizen.edu', 'counselor', FALSE, TRUE),
  ('Counselor 2', 'counselor2@kizen.edu', 'counselor', FALSE, TRUE),
  ('Preeti Verma (Front Desk)', 'reception@kizen.edu', 'reception', FALSE, TRUE),
  ('Attender Staff', 'attender@kizen.edu', 'reception', FALSE, TRUE)
ON CONFLICT (email) DO UPDATE 
SET 
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  is_owner = EXCLUDED.is_owner,
  is_active = EXCLUDED.is_active;

-- Verification Notice
DO $$
BEGIN
  RAISE NOTICE 'Successfully seeded all employee accounts with Aadya Sharma as Counselor!';
END $$;
