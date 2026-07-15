-- RUN THIS IN SUPABASE SQL EDITOR
-- Cleans up all E2E test leads and their related records

DO $$
DECLARE
  e2e_ids UUID[];
BEGIN
  -- Find all E2E lead IDs
  SELECT ARRAY_AGG(id) INTO e2e_ids FROM public.leads WHERE full_name ILIKE 'E2E%';
  
  RAISE NOTICE 'Found % E2E leads to clean', COALESCE(array_length(e2e_ids, 1), 0);
  
  -- Delete related records in child tables first
  DELETE FROM public.follow_ups WHERE lead_id = ANY(e2e_ids);
  DELETE FROM public.lead_activities WHERE lead_id = ANY(e2e_ids);
  DELETE FROM public.fees WHERE lead_id = ANY(e2e_ids);
  DELETE FROM public.students WHERE lead_id = ANY(e2e_ids);
  
  -- Delete the leads themselves
  DELETE FROM public.leads WHERE id = ANY(e2e_ids);
  
  RAISE NOTICE 'Cleanup complete.';
END $$;

-- Verify no E2E leads remain
SELECT COUNT(*) AS remaining_e2e FROM public.leads WHERE full_name ILIKE 'E2E%';

-- Show what's left
SELECT id, full_name, status, created_at FROM public.leads ORDER BY created_at DESC;