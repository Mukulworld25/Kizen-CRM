-- =============================================================================
-- Migration 046: Fix Lead Access & Task/Follow-up Security
--
-- Bug #1: Owner grants counselor lead access via feature_permissions,
--         but RLS policy on `leads` still blocks counselors from seeing
--         leads not assigned to them.  Update leads_select/leads_update
--         to honour the elevated-access grant stored in feature_permissions.
--
-- Bug #2: tasks & follow_ups tables still carry the blanket
--         "authenticated_staff_only" policy from migration 029, allowing
--         ANY authenticated user to read/edit/delete EVERY record.
--         Replace with proper role-scoped policies (matching migration 002's
--         original intent) and add the missing is_private column to tasks.
--
-- Also: formally define the feature_permissions table that the application
-- code already depends on but was never created via a migration.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. feature_permissions — define the table the app already uses
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.feature_permissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key     TEXT NOT NULL,
  role            TEXT,
  user_id         UUID REFERENCES public.users(id) ON DELETE CASCADE,
  can_view        BOOLEAN DEFAULT FALSE,
  can_edit        BOOLEAN DEFAULT FALSE,
  granted_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  granted_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (feature_key, role, user_id)
);

CREATE INDEX IF NOT EXISTS idx_feature_permissions_lookup
  ON public.feature_permissions (feature_key, role, user_id);

-- Enable RLS (idempotent)
ALTER TABLE public.feature_permissions ENABLE ROW LEVEL SECURITY;

-- Replace blanket policy (from migration 029) with proper role-scoped policies
DROP POLICY IF EXISTS "authenticated_staff_only" ON public.feature_permissions;

CREATE POLICY "feature_permissions_select_authenticated"
  ON public.feature_permissions
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "feature_permissions_insert_owner_only"
  ON public.feature_permissions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_owner());

CREATE POLICY "feature_permissions_update_owner_only"
  ON public.feature_permissions
  FOR UPDATE TO authenticated
  USING (public.is_owner())
  WITH CHECK (public.is_owner());

CREATE POLICY "feature_permissions_delete_owner_only"
  ON public.feature_permissions
  FOR DELETE TO authenticated
  USING (public.is_owner());

-- ---------------------------------------------------------------------------
-- 2. tasks — add missing is_private column
-- ---------------------------------------------------------------------------
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;

-- ---------------------------------------------------------------------------
-- 3. tasks — drop blanket policy (migration 029) and recreate with
--    proper role-scoped policies (matching migration 002 intent)
--    SELECT: owner/admin OR assigned_to OR created_by
--    INSERT: owner/admin/counselor/faculty (staff can create tasks)
--    UPDATE: owner/admin OR assigned_to OR created_by
--    DELETE: owner/admin ONLY
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "authenticated_staff_only" ON public.tasks;

DROP POLICY IF EXISTS "tasks_select"    ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert"    ON public.tasks;
DROP POLICY IF EXISTS "tasks_update"    ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete"    ON public.tasks;

CREATE POLICY tasks_select
  ON public.tasks FOR SELECT TO authenticated
  USING (
    public.is_owner()
    OR public.get_user_role() IN ('owner', 'admin')
    OR assigned_to = public.get_user_id()
    OR created_by  = public.get_user_id()
  );

CREATE POLICY tasks_insert
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (
    public.is_owner()
    OR public.get_user_role() IN ('owner', 'admin', 'counselor', 'faculty')
  );

CREATE POLICY tasks_update
  ON public.tasks FOR UPDATE TO authenticated
  USING (
    public.is_owner()
    OR public.get_user_role() IN ('owner', 'admin')
    OR assigned_to = public.get_user_id()
    OR created_by  = public.get_user_id()
  )
  WITH CHECK (
    public.is_owner()
    OR public.get_user_role() IN ('owner', 'admin')
    OR assigned_to = public.get_user_id()
    OR created_by  = public.get_user_id()
  );

CREATE POLICY tasks_delete
  ON public.tasks FOR DELETE TO authenticated
  USING (
    public.is_owner()
    OR public.get_user_role() IN ('owner', 'admin')
  );

-- ---------------------------------------------------------------------------
-- 4. follow_ups — drop blanket policy (migration 029) and recreate with
--    proper role-scoped policies (matching migration 002 intent)
--    SELECT: owner/admin OR assigned_to OR counselor owns the linked lead
--    INSERT: owner/admin/counselor
--    UPDATE: owner/admin OR assigned_to
--    DELETE: owner/admin ONLY
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "authenticated_staff_only" ON public.follow_ups;

DROP POLICY IF EXISTS "follow_ups_select" ON public.follow_ups;
DROP POLICY IF EXISTS "follow_ups_insert" ON public.follow_ups;
DROP POLICY IF EXISTS "follow_ups_update" ON public.follow_ups;
DROP POLICY IF EXISTS "follow_ups_delete" ON public.follow_ups;

CREATE POLICY follow_ups_select
  ON public.follow_ups FOR SELECT TO authenticated
  USING (
    public.is_owner()
    OR public.get_user_role() IN ('owner', 'admin')
    OR assigned_to = public.get_user_id()
    OR EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = follow_ups.lead_id
      AND l.assigned_counselor_id = public.get_user_id()
    )
  );

CREATE POLICY follow_ups_insert
  ON public.follow_ups FOR INSERT TO authenticated
  WITH CHECK (
    public.is_owner()
    OR public.get_user_role() IN ('owner', 'admin', 'counselor')
  );

CREATE POLICY follow_ups_update
  ON public.follow_ups FOR UPDATE TO authenticated
  USING (
    public.is_owner()
    OR public.get_user_role() IN ('owner', 'admin')
    OR assigned_to = public.get_user_id()
  )
  WITH CHECK (
    public.is_owner()
    OR public.get_user_role() IN ('owner', 'admin')
    OR assigned_to = public.get_user_id()
  );

CREATE POLICY follow_ups_delete
  ON public.follow_ups FOR DELETE TO authenticated
  USING (
    public.is_owner()
    OR public.get_user_role() IN ('owner', 'admin')
  );

-- ---------------------------------------------------------------------------
-- 5. leads — replace leads_select & leads_update to honour elevated counselor
--    access granted via feature_permissions (Bug #1)
--    The frontend hasElevatedLeadAccess() checks:
--      (a) user-specific row: feature_key='leads' AND user_id=<id> AND can_view
--      (b) role-level row:    feature_key='leads' AND role=<role> AND user_id IS NULL AND can_view
--    The SQL EXISTS below mirrors that logic.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS leads_select ON public.leads;

CREATE POLICY leads_select ON public.leads FOR SELECT TO authenticated
USING (
  public.is_owner()
  OR public.get_user_role() IN ('owner', 'admin', 'reception')
  -- Counselors see their own assigned leads
  OR (public.get_user_role() = 'counselor' AND assigned_counselor_id = public.get_user_id())
  -- OR counselors with elevated access (owner granted feature_permission)
  OR (public.get_user_role() = 'counselor' AND EXISTS (
    SELECT 1 FROM public.feature_permissions fp
    WHERE fp.feature_key = 'leads'
      AND fp.can_view = TRUE
      AND (
        fp.user_id = public.get_user_id()
        OR (fp.role = public.get_user_role() AND fp.user_id IS NULL)
      )
  ))
);

DROP POLICY IF EXISTS leads_update ON public.leads;

CREATE POLICY leads_update ON public.leads FOR UPDATE TO authenticated
USING (
  public.is_owner()
  OR public.get_user_role() IN ('owner', 'admin')
  -- Counselors edit their own assigned leads
  OR (public.get_user_role() = 'counselor' AND assigned_counselor_id = public.get_user_id())
  -- OR counselors with elevated access (owner granted feature_permission)
  OR (public.get_user_role() = 'counselor' AND EXISTS (
    SELECT 1 FROM public.feature_permissions fp
    WHERE fp.feature_key = 'leads'
      AND fp.can_view = TRUE
      AND (
        fp.user_id = public.get_user_id()
        OR (fp.role = public.get_user_role() AND fp.user_id IS NULL)
      )
  ))
)
WITH CHECK (
  public.is_owner()
  OR public.get_user_role() IN ('owner', 'admin')
  -- Counselors edit their own assigned leads
  OR (public.get_user_role() = 'counselor' AND assigned_counselor_id = public.get_user_id())
  -- OR counselors with elevated access (owner granted feature_permission)
  OR (public.get_user_role() = 'counselor' AND EXISTS (
    SELECT 1 FROM public.feature_permissions fp
    WHERE fp.feature_key = 'leads'
      AND fp.can_view = TRUE
      AND (
        fp.user_id = public.get_user_id()
        OR (fp.role = public.get_user_role() AND fp.user_id IS NULL)
      )
  ))
);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;
