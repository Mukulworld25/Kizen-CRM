-- =============================================================================
-- Migration 049: Universal Feature Permissions RLS Alignment
--
-- Ensure that when an owner grants feature access (e.g. leads, students, fees)
-- to staff via feature_permissions (role-level or user-override), PostgreSQL RLS
-- policies honor these grants universally across all operations.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. leads_select & leads_update
--    Allow any authenticated user who has can_view=true on 'leads' in
--    feature_permissions (role or user override) to select all leads.
--    Allow any authenticated user who has can_edit=true or can_view=true
--    in feature_permissions to update leads.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS leads_select ON public.leads;

CREATE POLICY leads_select ON public.leads FOR SELECT TO authenticated
USING (
  public.is_owner()
  OR public.get_user_role() IN ('owner', 'admin', 'reception')
  OR (public.get_user_role() = 'counselor' AND assigned_counselor_id = public.get_user_id())
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

DROP POLICY IF EXISTS leads_update ON public.leads;

CREATE POLICY leads_update ON public.leads FOR UPDATE TO authenticated
USING (
  public.is_owner()
  OR public.get_user_role() IN ('owner', 'admin')
  OR (public.get_user_role() = 'counselor' AND assigned_counselor_id = public.get_user_id())
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
  OR public.get_user_role() IN ('owner', 'admin')
  OR (public.get_user_role() = 'counselor' AND assigned_counselor_id = public.get_user_id())
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
-- 2. students_update
--    Allow staff granted 'students' edit access via feature_permissions
--    to update student profiles.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS students_update ON public.students;

CREATE POLICY students_update ON public.students FOR UPDATE TO authenticated
USING (
  public.is_owner()
  OR public.get_user_role() IN ('owner', 'admin')
  OR EXISTS (
    SELECT 1 FROM public.feature_permissions fp
    WHERE fp.feature_key = 'students'
      AND (fp.can_edit = TRUE OR fp.can_view = TRUE)
      AND (
        fp.user_id = public.get_user_id()
        OR (fp.role = public.get_user_role() AND fp.user_id IS NULL)
      )
  )
)
WITH CHECK (
  public.is_owner()
  OR public.get_user_role() IN ('owner', 'admin')
  OR EXISTS (
    SELECT 1 FROM public.feature_permissions fp
    WHERE fp.feature_key = 'students'
      AND (fp.can_edit = TRUE OR fp.can_view = TRUE)
      AND (
        fp.user_id = public.get_user_id()
        OR (fp.role = public.get_user_role() AND fp.user_id IS NULL)
      )
  )
);

-- ---------------------------------------------------------------------------
-- 3. fees_select & fees_update
--    Allow staff granted 'fees' access via feature_permissions
--    to view and update fee records.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS fees_select ON public.fees;

CREATE POLICY fees_select ON public.fees FOR SELECT TO authenticated
USING (
  public.is_owner()
  OR public.get_user_role() IN ('owner', 'admin', 'accounts', 'counselor')
  OR EXISTS (
    SELECT 1 FROM public.feature_permissions fp
    WHERE fp.feature_key = 'fees'
      AND fp.can_view = TRUE
      AND (
        fp.user_id = public.get_user_id()
        OR (fp.role = public.get_user_role() AND fp.user_id IS NULL)
      )
  )
);

DROP POLICY IF EXISTS fees_update ON public.fees;

CREATE POLICY fees_update ON public.fees FOR UPDATE TO authenticated
USING (
  public.is_owner()
  OR public.get_user_role() IN ('owner', 'admin', 'accounts')
  OR EXISTS (
    SELECT 1 FROM public.feature_permissions fp
    WHERE fp.feature_key = 'fees'
      AND fp.can_edit = TRUE
      AND (
        fp.user_id = public.get_user_id()
        OR (fp.role = public.get_user_role() AND fp.user_id IS NULL)
      )
  )
)
WITH CHECK (
  public.is_owner()
  OR public.get_user_role() IN ('owner', 'admin', 'accounts')
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

-- ---------------------------------------------------------------------------
-- 4. fee_payments_select & fee_payments_update
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS fee_payments_select ON public.fee_payments;

CREATE POLICY fee_payments_select ON public.fee_payments FOR SELECT TO authenticated
USING (
  public.is_owner()
  OR public.get_user_role() IN ('owner', 'admin', 'accounts', 'counselor')
  OR EXISTS (
    SELECT 1 FROM public.feature_permissions fp
    WHERE fp.feature_key = 'fees'
      AND fp.can_view = TRUE
      AND (
        fp.user_id = public.get_user_id()
        OR (fp.role = public.get_user_role() AND fp.user_id IS NULL)
      )
  )
);

DROP POLICY IF EXISTS fee_payments_update ON public.fee_payments;

CREATE POLICY fee_payments_update ON public.fee_payments FOR UPDATE TO authenticated
USING (
  public.is_owner()
  OR public.get_user_role() IN ('owner', 'admin', 'accounts')
  OR EXISTS (
    SELECT 1 FROM public.feature_permissions fp
    WHERE fp.feature_key = 'fees'
      AND fp.can_edit = TRUE
      AND (
        fp.user_id = public.get_user_id()
        OR (fp.role = public.get_user_role() AND fp.user_id IS NULL)
      )
  )
)
WITH CHECK (
  public.is_owner()
  OR public.get_user_role() IN ('owner', 'admin', 'accounts')
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

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;
