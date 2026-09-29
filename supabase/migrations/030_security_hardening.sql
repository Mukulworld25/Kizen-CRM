-- ==============================================================================
-- Migration 030: Security Hardening Pass 2
-- Single atomic migration for comprehensive RLS and RPC hardening
-- ==============================================================================

BEGIN;

-- 1. Ensure notifications table exists if referenced
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- 2. Dynamically enable RLS on every public table
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  ) LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.relname);
  END LOOP;
END $$;

-- 3. Add authenticated_staff_only base policy to remaining public tables
DO $$
DECLARE
  tbl TEXT;
  tables_list TEXT[] := ARRAY[
    'institutions',
    'institute_expenses',
    'notifications',
    'audit_removed_fees',
    'data_intake_settings',
    'ad_sync_connections'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables_list LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
      EXECUTE format('DROP POLICY IF EXISTS "authenticated_staff_only" ON public.%I;', tbl);
      EXECUTE format('CREATE POLICY "authenticated_staff_only" ON public.%I FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);', tbl);
    END IF;
  END LOOP;
END $$;

-- 4. Helper function: check if authenticated caller is an owner
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_id = auth.uid()
      AND (role = 'owner' OR is_owner = true)
  );
$$;

-- 5. Stricter policies on sensitive tables: feature_permissions, deletion_requests, users
-- SELECT for all authenticated; INSERT / UPDATE / DELETE restricted to owner only

-- 5a. feature_permissions
DROP POLICY IF EXISTS "authenticated_staff_only" ON public.feature_permissions;
DROP POLICY IF EXISTS "feature_permissions_select_authenticated" ON public.feature_permissions;
DROP POLICY IF EXISTS "feature_permissions_insert_owner_only" ON public.feature_permissions;
DROP POLICY IF EXISTS "feature_permissions_update_owner_only" ON public.feature_permissions;
DROP POLICY IF EXISTS "feature_permissions_delete_owner_only" ON public.feature_permissions;

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

-- 5b. deletion_requests
DROP POLICY IF EXISTS "authenticated_staff_only" ON public.deletion_requests;
DROP POLICY IF EXISTS "deletion_requests_select_authenticated" ON public.deletion_requests;
DROP POLICY IF EXISTS "deletion_requests_insert_owner_only" ON public.deletion_requests;
DROP POLICY IF EXISTS "deletion_requests_update_owner_only" ON public.deletion_requests;
DROP POLICY IF EXISTS "deletion_requests_delete_owner_only" ON public.deletion_requests;

CREATE POLICY "deletion_requests_select_authenticated"
ON public.deletion_requests
FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "deletion_requests_insert_owner_only"
ON public.deletion_requests
FOR INSERT TO authenticated
WITH CHECK (public.is_owner());

CREATE POLICY "deletion_requests_update_owner_only"
ON public.deletion_requests
FOR UPDATE TO authenticated
USING (public.is_owner())
WITH CHECK (public.is_owner());

CREATE POLICY "deletion_requests_delete_owner_only"
ON public.deletion_requests
FOR DELETE TO authenticated
USING (public.is_owner());

-- 5c. users
DROP POLICY IF EXISTS "authenticated_staff_only" ON public.users;
DROP POLICY IF EXISTS "users_select_authenticated" ON public.users;
DROP POLICY IF EXISTS "users_insert_owner_only" ON public.users;
DROP POLICY IF EXISTS "users_update_owner_only" ON public.users;
DROP POLICY IF EXISTS "users_delete_owner_only" ON public.users;

CREATE POLICY "users_select_authenticated"
ON public.users
FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "users_insert_owner_only"
ON public.users
FOR INSERT TO authenticated
WITH CHECK (public.is_owner());

CREATE POLICY "users_update_owner_only"
ON public.users
FOR UPDATE TO authenticated
USING (public.is_owner())
WITH CHECK (public.is_owner());

CREATE POLICY "users_delete_owner_only"
ON public.users
FOR DELETE TO authenticated
USING (public.is_owner());

-- 6. Helper & RPC hardening

-- 6a. normalize_phone helper function
CREATE OR REPLACE FUNCTION public.normalize_phone(p_raw TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $function$
DECLARE
  v_digits TEXT;
BEGIN
  IF p_raw IS NULL OR trim(p_raw) = '' THEN
    RETURN NULL;
  END IF;

  v_digits := regexp_replace(trim(p_raw), '[^0-9]', '', 'g');

  IF length(v_digits) = 12 AND v_digits LIKE '91%' THEN
    v_digits := substring(v_digits from 3);
  END IF;

  IF length(v_digits) = 10 THEN
    RETURN v_digits;
  ELSE
    RETURN NULL;
  END IF;
END;
$function$;

-- 6b. request_deletion: SECURITY DEFINER so staff can submit deletion requests
CREATE OR REPLACE FUNCTION public.request_deletion(
  p_table_name text,
  p_record_id uuid,
  p_requested_by uuid,
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
begin
  insert into public.deletion_requests (table_name, record_id, record_label, requested_by, reason)
  values (p_table_name, p_record_id, p_record_label, p_requested_by, p_reason)
  returning id into v_id;
  return v_id;
end;
$function$;

-- 6c. approve_deletion: ignore p_reviewer_id, enforce auth.uid() owner check
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
begin
  -- Look up caller via auth.uid() against users.auth_id, ignore p_reviewer_id for authorization
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

  if req.table_name = 'leads' then
    update public.leads set is_deleted = true, deleted_at = now() where id = req.record_id;
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

-- 6d. reject_deletion: ignore p_reviewer_id, enforce auth.uid() owner check
CREATE OR REPLACE FUNCTION public.reject_deletion(
  p_request_id uuid,
  p_reviewer_id uuid DEFAULT NULL::uuid,
  p_note text DEFAULT NULL::text
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
begin
  -- Look up caller via auth.uid() against users.auth_id, ignore p_reviewer_id for authorization
  select id, role, coalesce(is_owner, false)
  into v_caller_id, v_role, v_is_owner
  from public.users
  where auth_id = auth.uid();

  if v_caller_id is null or (v_role != 'owner' and not v_is_owner) then
    raise exception 'Unauthorized: Only owners can reject deletion requests';
  end if;

  select * into req from public.deletion_requests where id = p_request_id and status = 'pending';
  if not found then
    raise exception 'Request not found or already reviewed';
  end if;

  update public.deletion_requests
  set status = 'rejected',
      reviewed_by = v_caller_id,
      reviewed_at = now(),
      review_note = p_note
  where id = p_request_id and status = 'pending';
end;
$function$;

-- 7. Set security_invoker = true on every view in public schema
DO $$
DECLARE
  v_record RECORD;
BEGIN
  FOR v_record IN (
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'v'
  ) LOOP
    EXECUTE format('ALTER VIEW public.%I SET (security_invoker = true);', v_record.relname);
  END LOOP;
END $$;

-- 8. Function Privileges Hardening:
-- Revoke EXECUTE from PUBLIC, anon; Grant EXECUTE to authenticated, service_role
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO authenticated, service_role;

COMMIT;
