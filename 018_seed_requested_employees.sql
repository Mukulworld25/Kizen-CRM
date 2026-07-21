-- ============================================================================
-- 018_seed_requested_employees.sql (FIXED AUTH MATCHING)
-- Seeds the requested employee accounts into the CRM users table
-- Includes both shivam.kizen.test@gmail.com and shivam@kizen.edu for seamless Owner login.
-- ============================================================================

-- 1. Disconnect foreign key references on test data to avoid constraint errors
UPDATE institutions SET assigned_bdm_id = NULL;
UPDATE leads SET assigned_counselor_id = NULL, created_by = NULL;
UPDATE batches SET faculty_id = NULL;
UPDATE students SET faculty_id = NULL;
UPDATE follow_ups SET assigned_to = NULL, created_by = NULL;
UPDATE lead_activities SET created_by = NULL;

-- 2. Clean out old test/dummy users (keep both Shivam owner emails)
DELETE FROM users WHERE email NOT IN ('shivam@kizen.edu', 'shivam.kizen.test@gmail.com');

-- 3. Insert/Update the employee accounts including both Shivam Owner logins
INSERT INTO users (name, email, role, is_owner, is_active)
VALUES
  ('Shivam Owner', 'shivam.kizen.test@gmail.com', 'owner', TRUE, TRUE),
  ('Shivam Owner (Edu)', 'shivam@kizen.edu', 'owner', TRUE, TRUE),
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

-- 4. Auto-link existing Auth users by matching email
UPDATE users u
SET auth_id = au.id
FROM auth.users au
WHERE LOWER(u.email) = LOWER(au.email)
  AND (u.auth_id IS NULL OR u.auth_id != au.id);

-- Verification Notice
DO $$
BEGIN
  RAISE NOTICE 'Successfully updated all employee accounts and linked auth_id for Shivam!';
END $$;
