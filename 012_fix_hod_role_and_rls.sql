-- =================================================================
-- KIZEN CRM — CRITICAL FIXES MIGRATION
-- RUN THIS ENTIRE FILE IN SUPABASE SQL EDITOR
-- =================================================================

-- ═══════════════════════════════════════════════════════════════
-- FIX 1: Add 'hod' to users.role CHECK constraint
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE IF EXISTS public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE IF EXISTS public.users ADD CONSTRAINT users_role_check
  CHECK (role = ANY (ARRAY['owner','admin','counselor','faculty','accounts','reception','bdm','hod']));

-- ═══════════════════════════════════════════════════════════════
-- FIX 2: Increase user cap from 10 to 15
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION enforce_user_cap()
RETURNS TRIGGER AS $$
DECLARE
  user_count INT;
BEGIN
  SELECT COUNT(*) INTO user_count FROM users;
  IF user_count >= 15 THEN
    RAISE EXCEPTION 'Maximum 15 users allowed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════
-- FIX 3: Remove expense category CHECK constraint (DB-driven now)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE IF EXISTS public.institute_expenses DROP CONSTRAINT IF EXISTS institute_expenses_category_check;

-- ═══════════════════════════════════════════════════════════════
-- FIX 4: RLS policies for reminders table
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE IF EXISTS public.reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reminders_select ON public.reminders;
DROP POLICY IF EXISTS reminders_insert ON public.reminders;
DROP POLICY IF EXISTS reminders_update ON public.reminders;
DROP POLICY IF EXISTS reminders_delete ON public.reminders;

CREATE POLICY reminders_select ON public.reminders FOR SELECT USING (
  user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
);

CREATE POLICY reminders_insert ON public.reminders FOR INSERT WITH CHECK (
  user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
);

CREATE POLICY reminders_update ON public.reminders FOR UPDATE USING (
  user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
);

CREATE POLICY reminders_delete ON public.reminders FOR DELETE USING (
  user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
);

-- ═══════════════════════════════════════════════════════════════
-- FIX 5: RLS policies for scratchpad table
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE IF EXISTS public.scratchpad ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS scratchpad_select ON public.scratchpad;
DROP POLICY IF EXISTS scratchpad_insert ON public.scratchpad;
DROP POLICY IF EXISTS scratchpad_update ON public.scratchpad;

CREATE POLICY scratchpad_select ON public.scratchpad FOR SELECT USING (
  user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
);

CREATE POLICY scratchpad_insert ON public.scratchpad FOR INSERT WITH CHECK (
  user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
);

CREATE POLICY scratchpad_update ON public.scratchpad FOR UPDATE USING (
  user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
);

-- ═══════════════════════════════════════════════════════════════
-- FIX 6: RLS policies for expense_categories table
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE IF EXISTS public.expense_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS expense_categories_select ON public.expense_categories;
DROP POLICY IF EXISTS expense_categories_insert ON public.expense_categories;
DROP POLICY IF EXISTS expense_categories_update ON public.expense_categories;
DROP POLICY IF EXISTS expense_categories_delete ON public.expense_categories;

CREATE POLICY expense_categories_select ON public.expense_categories FOR SELECT USING (
  get_user_role() IS NOT NULL
);

CREATE POLICY expense_categories_insert ON public.expense_categories FOR INSERT WITH CHECK (
  get_user_role() = 'owner'
);

CREATE POLICY expense_categories_update ON public.expense_categories FOR UPDATE USING (
  get_user_role() = 'owner'
);

CREATE POLICY expense_categories_delete ON public.expense_categories FOR DELETE USING (
  get_user_role() = 'owner'
);

-- ═══════════════════════════════════════════════════════════════
-- FIX 7: RLS policies for tasks table
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE IF EXISTS public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tasks_select ON public.tasks;
DROP POLICY IF EXISTS tasks_insert ON public.tasks;
DROP POLICY IF EXISTS tasks_update ON public.tasks;

CREATE POLICY tasks_select ON public.tasks FOR SELECT USING (
  get_user_role() IN ('owner','admin') OR assigned_to = (SELECT id FROM users WHERE auth_id = auth.uid()) OR assigned_by = (SELECT id FROM users WHERE auth_id = auth.uid())
);

CREATE POLICY tasks_insert ON public.tasks FOR INSERT WITH CHECK (
  get_user_role() IN ('owner','admin','hod','faculty')
);

CREATE POLICY tasks_update ON public.tasks FOR UPDATE USING (
  get_user_role() IN ('owner','admin') OR assigned_to = (SELECT id FROM users WHERE auth_id = auth.uid())
);

-- ═══════════════════════════════════════════════════════════════
-- FIX 8: Seed default expense categories
-- ═══════════════════════════════════════════════════════════════
INSERT INTO public.expense_categories (name) VALUES
  ('Rent'),
  ('Salaries'),
  ('Electricity'),
  ('Marketing'),
  ('Pantry Expenses'),
  ('WiFi Bill'),
  ('Miscellaneous')
ON CONFLICT (name) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════════
SELECT 'All critical fixes applied successfully' AS status;
SELECT DISTINCT role FROM public.users ORDER BY role;
SELECT COUNT(*) AS user_count_cap FROM public.users;
SELECT column_name, data_type FROM information_schema.columns 
  WHERE table_name = 'institute_expenses' AND column_name = 'category';