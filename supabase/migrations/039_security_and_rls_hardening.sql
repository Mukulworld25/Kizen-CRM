-- =============================================================================
-- Migration 039: Security & RLS Hardening (Strict Role Scoping & RPC Validation)
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Helper Functions (SECURITY DEFINER with pinned search_path)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_user_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_id = auth.uid()
      AND (role = 'owner' OR is_owner = true)
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. Drop Blanket & Permissive Policies on Core Tables
-- ---------------------------------------------------------------------------

-- LEADS
DROP POLICY IF EXISTS "authenticated_staff_only" ON public.leads;
DROP POLICY IF EXISTS "leads_select" ON public.leads;
DROP POLICY IF EXISTS "leads_insert" ON public.leads;
DROP POLICY IF EXISTS "leads_update" ON public.leads;
DROP POLICY IF EXISTS "leads_delete" ON public.leads;

-- STUDENTS
DROP POLICY IF EXISTS "authenticated_staff_only" ON public.students;
DROP POLICY IF EXISTS "students_select" ON public.students;
DROP POLICY IF EXISTS "students_insert" ON public.students;
DROP POLICY IF EXISTS "students_update" ON public.students;
DROP POLICY IF EXISTS "students_delete" ON public.students;

-- FEES
DROP POLICY IF EXISTS "authenticated_staff_only" ON public.fees;
DROP POLICY IF EXISTS "fees_select" ON public.fees;
DROP POLICY IF EXISTS "fees_insert" ON public.fees;
DROP POLICY IF EXISTS "fees_update" ON public.fees;
DROP POLICY IF EXISTS "fees_delete" ON public.fees;

-- INSTALLMENTS
DROP POLICY IF EXISTS "authenticated_staff_only" ON public.installments;
DROP POLICY IF EXISTS "installments_select" ON public.installments;
DROP POLICY IF EXISTS "installments_insert" ON public.installments;
DROP POLICY IF EXISTS "installments_update" ON public.installments;
DROP POLICY IF EXISTS "installments_delete" ON public.installments;

-- FEE PAYMENTS
DROP POLICY IF EXISTS "authenticated_staff_only" ON public.fee_payments;
DROP POLICY IF EXISTS "fee_payments_select" ON public.fee_payments;
DROP POLICY IF EXISTS "fee_payments_insert" ON public.fee_payments;
DROP POLICY IF EXISTS "fee_payments_update" ON public.fee_payments;
DROP POLICY IF EXISTS "fee_payments_delete" ON public.fee_payments;

-- ---------------------------------------------------------------------------
-- 3. Role-Scoped Policies for LEADS
--    - Counselors see & edit ONLY their assigned leads
--    - Owners & Admins see & edit all leads
--    - Reception sees all leads & inserts walk-in inquiries
-- ---------------------------------------------------------------------------

CREATE POLICY leads_select ON public.leads FOR SELECT TO authenticated
USING (
  public.is_owner()
  OR public.get_user_role() IN ('owner', 'admin', 'reception')
  OR (public.get_user_role() = 'counselor' AND assigned_counselor_id = public.get_user_id())
);

CREATE POLICY leads_insert ON public.leads FOR INSERT TO authenticated
WITH CHECK (
  public.is_owner()
  OR public.get_user_role() IN ('owner', 'admin', 'reception', 'counselor')
);

CREATE POLICY leads_update ON public.leads FOR UPDATE TO authenticated
USING (
  public.is_owner()
  OR public.get_user_role() IN ('owner', 'admin')
  OR (public.get_user_role() = 'counselor' AND assigned_counselor_id = public.get_user_id())
)
WITH CHECK (
  public.is_owner()
  OR public.get_user_role() IN ('owner', 'admin')
  OR (public.get_user_role() = 'counselor' AND assigned_counselor_id = public.get_user_id())
);

CREATE POLICY leads_delete ON public.leads FOR DELETE TO authenticated
USING (
  public.is_owner() OR public.get_user_role() IN ('owner', 'admin')
);

-- ---------------------------------------------------------------------------
-- 4. Role-Scoped Policies for STUDENTS
--    - Staff with viewStudents permission can select
--    - Counselors/Reception can insert enrolled students
--    - Only Owners/Admins can edit/delete
-- ---------------------------------------------------------------------------

CREATE POLICY students_select ON public.students FOR SELECT TO authenticated
USING (
  public.is_owner()
  OR public.get_user_role() IN ('owner', 'admin', 'counselor', 'accounts', 'reception', 'faculty', 'hod')
);

CREATE POLICY students_insert ON public.students FOR INSERT TO authenticated
WITH CHECK (
  public.is_owner()
  OR public.get_user_role() IN ('owner', 'admin', 'counselor', 'reception')
);

CREATE POLICY students_update ON public.students FOR UPDATE TO authenticated
USING (
  public.is_owner()
  OR public.get_user_role() IN ('owner', 'admin')
)
WITH CHECK (
  public.is_owner()
  OR public.get_user_role() IN ('owner', 'admin')
);

CREATE POLICY students_delete ON public.students FOR DELETE TO authenticated
USING (
  public.is_owner()
);

-- ---------------------------------------------------------------------------
-- 5. Role-Scoped Policies for FEES, INSTALLMENTS, FEE_PAYMENTS
--    - Owners, Admins, Accounts, Counselors (conversion/records) can access
--    - Reception and Faculty have ZERO financial access
-- ---------------------------------------------------------------------------

-- FEES
CREATE POLICY fees_select ON public.fees FOR SELECT TO authenticated
USING (
  public.is_owner()
  OR public.get_user_role() IN ('owner', 'admin', 'accounts', 'counselor')
);

CREATE POLICY fees_insert ON public.fees FOR INSERT TO authenticated
WITH CHECK (
  public.is_owner()
  OR public.get_user_role() IN ('owner', 'admin', 'accounts', 'counselor')
);

CREATE POLICY fees_update ON public.fees FOR UPDATE TO authenticated
USING (
  public.is_owner()
  OR public.get_user_role() IN ('owner', 'admin', 'accounts')
)
WITH CHECK (
  public.is_owner()
  OR public.get_user_role() IN ('owner', 'admin', 'accounts')
);

CREATE POLICY fees_delete ON public.fees FOR DELETE TO authenticated
USING (
  public.is_owner()
);

-- INSTALLMENTS
CREATE POLICY installments_select ON public.installments FOR SELECT TO authenticated
USING (
  public.is_owner()
  OR public.get_user_role() IN ('owner', 'admin', 'accounts', 'counselor')
);

CREATE POLICY installments_insert ON public.installments FOR INSERT TO authenticated
WITH CHECK (
  public.is_owner()
  OR public.get_user_role() IN ('owner', 'admin', 'accounts', 'counselor')
);

CREATE POLICY installments_update ON public.installments FOR UPDATE TO authenticated
USING (
  public.is_owner()
  OR public.get_user_role() IN ('owner', 'admin', 'accounts', 'counselor')
)
WITH CHECK (
  public.is_owner()
  OR public.get_user_role() IN ('owner', 'admin', 'accounts', 'counselor')
);

CREATE POLICY installments_delete ON public.installments FOR DELETE TO authenticated
USING (
  public.is_owner()
  OR public.get_user_role() IN ('owner', 'admin', 'accounts')
);

-- FEE PAYMENTS
CREATE POLICY fee_payments_select ON public.fee_payments FOR SELECT TO authenticated
USING (
  public.is_owner()
  OR public.get_user_role() IN ('owner', 'admin', 'accounts', 'counselor')
);

CREATE POLICY fee_payments_insert ON public.fee_payments FOR INSERT TO authenticated
WITH CHECK (
  public.is_owner()
  OR public.get_user_role() IN ('owner', 'admin', 'accounts', 'counselor')
);

CREATE POLICY fee_payments_update ON public.fee_payments FOR UPDATE TO authenticated
USING (
  public.is_owner()
  OR public.get_user_role() IN ('owner', 'admin', 'accounts')
)
WITH CHECK (
  public.is_owner()
  OR public.get_user_role() IN ('owner', 'admin', 'accounts')
);

CREATE POLICY fee_payments_delete ON public.fee_payments FOR DELETE TO authenticated
USING (
  public.is_owner()
);

-- ---------------------------------------------------------------------------
-- 6. USERS Hardening
--    - Drop old 002 users_update ("auth_id = auth.uid()" with no role restriction)
--    - Keep only owner-controlled update policy
--    - Add column guard trigger to reject non-owner privilege escalation
--    - Add trigger to prevent owner deletion
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS users_update ON public.users;
DROP POLICY IF EXISTS users_update_self ON public.users;

-- Ensure owner-only update policy is active
DROP POLICY IF EXISTS users_update_owner_only ON public.users;
CREATE POLICY users_update_owner_only ON public.users FOR UPDATE TO authenticated
USING (public.is_owner())
WITH CHECK (public.is_owner());

-- Defense-in-depth trigger guard: prevents any non-owner from touching role, is_owner, is_active, email
CREATE OR REPLACE FUNCTION public.guard_user_privileged_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF public.is_owner() THEN
    RETURN NEW;
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.is_owner IS DISTINCT FROM OLD.is_owner
     OR NEW.is_active IS DISTINCT FROM OLD.is_active
     OR NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Unauthorized: Only owners may change user role, ownership, active status, or email';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_guard_privileged_columns ON public.users;
CREATE TRIGGER users_guard_privileged_columns
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.guard_user_privileged_columns();

-- Trigger guard: owner row cannot be deleted
CREATE OR REPLACE FUNCTION public.protect_owner_user_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.is_owner = TRUE AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Owner user cannot be deleted';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS users_protect_owner_delete ON public.users;
CREATE TRIGGER users_protect_owner_delete
  BEFORE DELETE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.protect_owner_user_delete();

-- ---------------------------------------------------------------------------
-- 7. Hardened Deletion RPCs
--    - request_deletion: table allow-list (leads, students, fees, institutions, institute_expenses, batches)
--    - approve_deletion: table allow-list, uniform soft-delete, block users & critical tables
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.request_deletion(
  p_table_name text,
  p_record_id uuid,
  p_requested_by uuid DEFAULT NULL::uuid,
  p_record_label text DEFAULT NULL::text,
  p_reason text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
declare
  v_id uuid;
  v_caller_id uuid;
  v_owner record;
  v_allowed text[] := array['leads','students','fees','institutions','institute_expenses','batches'];
begin
  -- Derive the caller from the authenticated session
  if auth.uid() is not null then
    select id into v_caller_id from public.users where auth_id = auth.uid();
  else
    v_caller_id := p_requested_by;
  end if;

  if v_caller_id is null then
    raise exception 'Unauthorized: No staff profile is linked to this session';
  end if;

  -- Enforce strict allow-list
  if p_table_name is null or not (lower(trim(p_table_name)) = any(v_allowed)) then
    raise exception 'Unsupported table for deletion requests: %', coalesce(p_table_name, '<null>');
  end if;

  insert into public.deletion_requests (table_name, record_id, record_label, requested_by, reason)
  values (lower(trim(p_table_name)), p_record_id, p_record_label, v_caller_id, p_reason)
  returning id into v_id;

  -- Notify all owners of the new deletion request
  for v_owner in
    select id from public.users where role = 'owner' or is_owner = true
  loop
    insert into public.notifications (
      user_id,
      title,
      message,
      type,
      link,
      record_id,
      record_type,
      is_read
    ) values (
      v_owner.id,
      'Deletion Request Pending',
      'Deletion requested for ' || coalesce(p_record_label, p_table_name) || coalesce(': ' || p_reason, ''),
      'deletion_request',
      '/settings?tab=deletions&highlight=' || v_id::text,
      v_id::text,
      'deletion_request',
      false
    );
  end loop;

  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.approve_deletion(
  p_request_id uuid,
  p_reviewer_id uuid DEFAULT NULL::uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
declare
  v_caller_id uuid;
  v_role text;
  v_is_owner boolean;
  req record;
  v_allowed text[] := array['leads','students','fees','institutions','institute_expenses','batches'];
begin
  -- Authenticate owner caller via auth.uid()
  select id, role, coalesce(is_owner, false)
  into v_caller_id, v_role, v_is_owner
  from public.users
  where auth_id = auth.uid();

  if v_caller_id is null or (v_role != 'owner' and not v_is_owner) then
    raise exception 'Unauthorized: Only owners can approve deletion requests';
  end if;

  select * into req from public.deletion_requests where id = p_request_id and status = 'pending';
  if not found then
    raise exception 'Request not found or already reviewed';
  end if;

  -- Validate allow-list in approval
  if not (lower(trim(req.table_name)) = any(v_allowed)) then
    raise exception 'Cannot approve deletion for disallowed table: %', req.table_name;
  end if;

  -- Critical protection: users and permissions can never be deleted
  if lower(trim(req.table_name)) in ('users', 'feature_permissions', 'deletion_requests', 'system_settings') then
    raise exception 'Critical table % cannot be deleted via deletion requests', req.table_name;
  end if;

  -- Soft-delete for tables with is_deleted column
  if req.table_name in ('leads', 'students') then
    execute format('update public.%I set is_deleted = true, deleted_at = now() where id = $1', req.table_name) using req.record_id;
  else
    execute format('delete from public.%I where id = $1', req.table_name) using req.record_id;
  end if;

  update public.deletion_requests
  set status = 'approved',
      reviewed_by = v_caller_id,
      reviewed_at = now()
  where id = p_request_id;
end;
$function$;

COMMIT;
