-- =============================================================================
-- Migration 052: Permanent Resolution for All Team User Roles & Database Integrity
--
-- 1. Support all active CRM roles: bdm, hod, reception, counselor, faculty, accounts
-- 2. Relax user cap to 25 active users and ignore deactivated accounts
-- 3. Fix faculty & HOD student visibility and batch schedule columns
-- 4. Fix lead reassignment WITH CHECK constraint for counselors
-- 5. Fix lead conversion fee insertion for counselors and receptionists
-- 6. Fix notification dispatching for staff members
-- 7. Add soft-delete columns (is_deleted, deleted_at) to institutions & institute_expenses
-- 8. Create missing BDM tables (institution_meetings, institution_follow_ups)
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Widen role CHECK constraint on public.users
-- ---------------------------------------------------------------------------
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('owner', 'admin', 'counselor', 'faculty', 'accounts', 'reception', 'bdm', 'hod'));

-- ---------------------------------------------------------------------------
-- 2. Relax user cap to 25 active users
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_user_cap()
RETURNS TRIGGER AS $$
DECLARE
  v_active_count INT;
BEGIN
  SELECT COUNT(*) INTO v_active_count FROM public.users WHERE is_active = TRUE;
  IF v_active_count >= 25 THEN
    RAISE EXCEPTION 'Maximum 25 active users reached. Deactivate inactive users to add new accounts.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_cap ON public.users;
CREATE TRIGGER users_cap BEFORE INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.enforce_user_cap();

-- ---------------------------------------------------------------------------
-- 3. Add batch schedule columns if not present
-- ---------------------------------------------------------------------------
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS schedule_days TEXT;
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS days_of_week TEXT;

-- ---------------------------------------------------------------------------
-- 4. Add soft delete columns to institutions and institute_expenses
-- ---------------------------------------------------------------------------
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.institute_expenses ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.institute_expenses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- 5. Create missing BDM tables: institution_meetings & institution_follow_ups
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.institution_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  meeting_date DATE NOT NULL,
  meeting_time TEXT,
  contact_person TEXT,
  notes TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.institution_follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inst_meetings_institution ON public.institution_meetings(institution_id);
CREATE INDEX IF NOT EXISTS idx_inst_followups_institution ON public.institution_follow_ups(institution_id);

ALTER TABLE public.institution_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_follow_ups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_staff_only" ON public.institution_meetings;
CREATE POLICY "authenticated_staff_only" ON public.institution_meetings
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "authenticated_staff_only" ON public.institution_follow_ups;
CREATE POLICY "authenticated_staff_only" ON public.institution_follow_ups
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ---------------------------------------------------------------------------
-- 6. Notifications RLS: Allow authenticated staff to create notifications
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS notifications_insert ON public.notifications;
CREATE POLICY notifications_insert ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- ---------------------------------------------------------------------------
-- 7. Students RLS: Allow all staff roles and batch faculty to select students
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS students_select ON public.students;
CREATE POLICY students_select ON public.students FOR SELECT TO authenticated
USING (
  public.is_owner()
  OR public.get_user_role() IN ('owner', 'admin', 'counselor', 'accounts', 'reception', 'faculty', 'hod', 'bdm')
  OR EXISTS (
    SELECT 1 FROM public.batches b
    WHERE b.id = students.batch_id AND b.faculty_id = public.get_user_id()
  )
);

DROP POLICY IF EXISTS students_insert ON public.students;
CREATE POLICY students_insert ON public.students FOR INSERT TO authenticated
WITH CHECK (
  public.is_owner()
  OR public.get_user_role() IN ('owner', 'admin', 'counselor', 'reception', 'accounts')
);

-- ---------------------------------------------------------------------------
-- 8. Fees & Installments RLS: Allow Reception & Counselors to insert fees
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS fees_insert ON public.fees;
CREATE POLICY fees_insert ON public.fees FOR INSERT TO authenticated
WITH CHECK (
  public.is_owner()
  OR public.get_user_role() IN ('owner', 'admin', 'accounts', 'counselor', 'reception')
  OR EXISTS (
    SELECT 1 FROM public.feature_permissions fp
    WHERE fp.feature_key = 'fees'
      AND fp.can_edit = TRUE
      AND (
        fp.user_id = public.get_user_id()
        OR (fp.role = public.get_user_role() AND fp.user_id IS NULL)
      )
  )
);

DROP POLICY IF EXISTS fee_payments_insert ON public.fee_payments;
CREATE POLICY fee_payments_insert ON public.fee_payments FOR INSERT TO authenticated
WITH CHECK (
  public.is_owner()
  OR public.get_user_role() IN ('owner', 'admin', 'accounts', 'counselor', 'reception')
);

DROP POLICY IF EXISTS installments_insert ON public.installments;
CREATE POLICY installments_insert ON public.installments FOR INSERT TO authenticated
WITH CHECK (
  public.is_owner()
  OR public.get_user_role() IN ('owner', 'admin', 'accounts', 'counselor', 'reception')
);

-- ---------------------------------------------------------------------------
-- 9. Leads RLS: Support BDM, Reception, and Counselor lead reassignments
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS leads_select ON public.leads;
CREATE POLICY leads_select ON public.leads FOR SELECT TO authenticated
USING (
  public.is_owner()
  OR public.get_user_role() IN ('owner', 'admin', 'reception', 'bdm')
  OR (public.get_user_role() = 'counselor' AND (assigned_counselor_id = public.get_user_id() OR assigned_counselor_id IS NULL))
  OR EXISTS (
    SELECT 1 FROM public.feature_permissions fp
    WHERE fp.feature_key = 'leads'
      AND fp.can_view = TRUE
      AND (
        fp.user_id = public.get_user_id()
        OR (fp.role = public.get_user_role() AND fp.user_id IS NULL)
      )
  )
);

DROP POLICY IF EXISTS leads_insert ON public.leads;
CREATE POLICY leads_insert ON public.leads FOR INSERT TO authenticated
WITH CHECK (
  public.is_owner()
  OR public.get_user_role() IN ('owner', 'admin', 'reception', 'counselor', 'bdm')
  OR EXISTS (
    SELECT 1 FROM public.feature_permissions fp
    WHERE fp.feature_key = 'leads'
      AND fp.can_edit = TRUE
      AND (
        fp.user_id = public.get_user_id()
        OR (fp.role = public.get_user_role() AND fp.user_id IS NULL)
      )
  )
);

DROP POLICY IF EXISTS leads_update ON public.leads;
CREATE POLICY leads_update ON public.leads FOR UPDATE TO authenticated
USING (
  public.is_owner()
  OR public.get_user_role() IN ('owner', 'admin', 'reception', 'bdm')
  OR (public.get_user_role() = 'counselor' AND (assigned_counselor_id = public.get_user_id() OR assigned_counselor_id IS NULL))
  OR EXISTS (
    SELECT 1 FROM public.feature_permissions fp
    WHERE fp.feature_key = 'leads'
      AND (fp.can_edit = TRUE OR fp.can_view = TRUE)
      AND (
        fp.user_id = public.get_user_id()
        OR (fp.role = public.get_user_role() AND fp.user_id IS NULL)
      )
  )
)
WITH CHECK (
  public.is_owner()
  OR public.get_user_role() IN ('owner', 'admin', 'reception', 'counselor', 'bdm')
  OR EXISTS (
    SELECT 1 FROM public.feature_permissions fp
    WHERE fp.feature_key = 'leads'
      AND (fp.can_edit = TRUE OR fp.can_view = TRUE)
      AND (
        fp.user_id = public.get_user_id()
        OR (fp.role = public.get_user_role() AND fp.user_id IS NULL)
      )
  )
);

-- ---------------------------------------------------------------------------
-- 10. Realtime Publications
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE tasks'; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE attendance'; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE feature_permissions'; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE deletion_requests'; EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

COMMIT;
