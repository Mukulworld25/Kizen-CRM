-- Migration 029: Enable RLS and create base authenticated_staff_only policy on all 16 exposed tables
-- Closes the public unauthenticated access vulnerability while preserving full access for logged-in staff.

BEGIN;

-- 1. leads
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_staff_only" ON public.leads;
CREATE POLICY "authenticated_staff_only" ON public.leads
FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 2. students
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_staff_only" ON public.students;
CREATE POLICY "authenticated_staff_only" ON public.students
FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 3. fees
ALTER TABLE public.fees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_staff_only" ON public.fees;
CREATE POLICY "authenticated_staff_only" ON public.fees
FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 4. fee_payments
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_staff_only" ON public.fee_payments;
CREATE POLICY "authenticated_staff_only" ON public.fee_payments
FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 5. installments
ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_staff_only" ON public.installments;
CREATE POLICY "authenticated_staff_only" ON public.installments
FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 6. batches
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_staff_only" ON public.batches;
CREATE POLICY "authenticated_staff_only" ON public.batches
FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 7. courses
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_staff_only" ON public.courses;
CREATE POLICY "authenticated_staff_only" ON public.courses
FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 8. attendance
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_staff_only" ON public.attendance;
CREATE POLICY "authenticated_staff_only" ON public.attendance
FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 9. documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_staff_only" ON public.documents;
CREATE POLICY "authenticated_staff_only" ON public.documents
FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 10. tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_staff_only" ON public.tasks;
CREATE POLICY "authenticated_staff_only" ON public.tasks
FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 11. follow_ups
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_staff_only" ON public.follow_ups;
CREATE POLICY "authenticated_staff_only" ON public.follow_ups
FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 12. lead_activities
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_staff_only" ON public.lead_activities;
CREATE POLICY "authenticated_staff_only" ON public.lead_activities
FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 13. users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_staff_only" ON public.users;
CREATE POLICY "authenticated_staff_only" ON public.users
FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 14. system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_staff_only" ON public.system_settings;
CREATE POLICY "authenticated_staff_only" ON public.system_settings
FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 15. feature_permissions
ALTER TABLE public.feature_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_staff_only" ON public.feature_permissions;
CREATE POLICY "authenticated_staff_only" ON public.feature_permissions
FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 16. expense_categories
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_staff_only" ON public.expense_categories;
CREATE POLICY "authenticated_staff_only" ON public.expense_categories
FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

COMMIT;
