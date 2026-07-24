-- ============================================================================
-- 023_seed_faculty_accounts.sql
-- Seeds Faculty accounts and links batches with realistic class days, timings,
-- and faculty assignments for ACCA, 11th/12th, CUET, and CA Prep.
-- ============================================================================

-- 1. Add days_of_week and timing columns to batches table if not present
ALTER TABLE batches ADD COLUMN IF NOT EXISTS days_of_week TEXT DEFAULT 'Mon, Wed, Fri';
ALTER TABLE batches ADD COLUMN IF NOT EXISTS timing TEXT DEFAULT '10:00 AM - 12:00 PM';

-- 2. Seed Faculty Members into public.users table
INSERT INTO users (name, email, role, is_owner, is_active)
VALUES
  ('CA Raman Sharma (ACCA & CA Faculty)', 'raman.faculty@kizen.edu', 'faculty', FALSE, TRUE),
  ('Prof. Ananya Gupta (11th & 12th Head)', 'ananya.faculty@kizen.edu', 'faculty', FALSE, TRUE),
  ('Dr. Vikram Malhotra (CUET & IFRS Lead)', 'vikram.faculty@kizen.edu', 'faculty', FALSE, TRUE)
ON CONFLICT (email) DO UPDATE
SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  is_active = TRUE;

-- 3. Link Batches to Faculty with Days & Timings
UPDATE batches
SET
  faculty_id = (SELECT id FROM users WHERE email = 'raman.faculty@kizen.edu' LIMIT 1),
  timing = '10:00 AM - 12:00 PM',
  days_of_week = 'Mon, Wed, Fri'
WHERE batch_name ILIKE '%ACCA%';

UPDATE batches
SET
  faculty_id = (SELECT id FROM users WHERE email = 'ananya.faculty@kizen.edu' LIMIT 1),
  timing = '03:00 PM - 05:00 PM',
  days_of_week = 'Mon, Wed, Fri'
WHERE batch_name ILIKE '%CLASS 11TH%';

UPDATE batches
SET
  faculty_id = (SELECT id FROM users WHERE email = 'ananya.faculty@kizen.edu' LIMIT 1),
  timing = '03:00 PM - 05:00 PM',
  days_of_week = 'Tue, Thu, Sat'
WHERE batch_name ILIKE '%CLASS 12TH%';

UPDATE batches
SET
  faculty_id = (SELECT id FROM users WHERE email = 'vikram.faculty@kizen.edu' LIMIT 1),
  timing = '10:00 AM - 12:00 PM',
  days_of_week = 'Tue, Thu, Sat'
WHERE batch_name ILIKE '%CUET%';

UPDATE batches
SET
  faculty_id = (SELECT id FROM users WHERE email = 'raman.faculty@kizen.edu' LIMIT 1),
  timing = '01:00 PM - 03:00 PM',
  days_of_week = 'Mon to Sat'
WHERE batch_name ILIKE '%CA%';

UPDATE batches
SET
  faculty_id = (SELECT id FROM users WHERE email = 'vikram.faculty@kizen.edu' LIMIT 1),
  timing = '05:00 PM - 07:00 PM',
  days_of_week = 'Mon, Wed, Fri'
WHERE batch_name ILIKE '%IFRS%' OR batch_name ILIKE '%AI%';

-- 4. Assign faculty_id on enrolled students matching their batch
UPDATE students s
SET faculty_id = b.faculty_id
FROM batches b
WHERE s.batch_id = b.id AND b.faculty_id IS NOT NULL;

-- Verification Notice
DO $$
BEGIN
  RAISE NOTICE '023 Migration Executed Successfully: Faculty accounts seeded & batch timings configured!';
END $$;
