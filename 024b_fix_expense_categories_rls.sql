-- Run this in Supabase SQL Editor to fix RLS on expense_categories and seed the data

-- 1. Ensure RLS is off (the DISABLE might not have applied cleanly)
ALTER TABLE public.expense_categories DISABLE ROW LEVEL SECURITY;

-- 2. Drop any lingering RLS policies that may have been created
DROP POLICY IF EXISTS "Enable read for all users" ON public.expense_categories;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.expense_categories;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.expense_categories;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.expense_categories;

-- 3. Re-grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_categories TO authenticated, anon, service_role;

-- 4. Seed the default categories (in case they weren't inserted)
INSERT INTO public.expense_categories (name) VALUES
  ('Rent'),
  ('Salaries'),
  ('Electricity'),
  ('Marketing'),
  ('Coffee/ Milk/ Sugar'),
  ('Miscellaneous')
ON CONFLICT (name) DO NOTHING;

-- 5. Verify
SELECT * FROM public.expense_categories ORDER BY name;
