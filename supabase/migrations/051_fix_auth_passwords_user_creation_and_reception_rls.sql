-- =============================================================================
-- Migration 051: Permanent Fix for Password Resets, Direct User Creation,
--                Auto-Linking Auth IDs, and Reception/Staff RLS Access
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Helper function: auto-link current user's auth_id on login
--    SECURITY DEFINER allows any authenticated user to link their own public.users record
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_current_user_auth_id()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_auth_id UUID := auth.uid();
  v_email TEXT;
  v_user public.users%ROWTYPE;
BEGIN
  IF v_auth_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- 1. Check if public.users already has this auth_id
  SELECT * INTO v_user FROM public.users WHERE auth_id = v_auth_id;
  IF v_user.id IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'linked', true, 'user', row_to_json(v_user));
  END IF;

  -- 2. Find auth email
  SELECT lower(trim(email)) INTO v_email FROM auth.users WHERE id = v_auth_id;
  IF v_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No email in auth.users');
  END IF;

  -- 3. Match by email in public.users and update auth_id
  UPDATE public.users
  SET auth_id = v_auth_id, updated_at = NOW()
  WHERE lower(trim(email)) = v_email;

  IF FOUND THEN
    SELECT * INTO v_user FROM public.users WHERE auth_id = v_auth_id;
    RETURN jsonb_build_object('success', true, 'linked', true, 'user', row_to_json(v_user));
  END IF;

  -- 4. If not found in public.users at all, create profile
  INSERT INTO public.users (auth_id, email, name, role, is_active)
  SELECT 
    v_auth_id, 
    v_email, 
    COALESCE(raw_user_meta_data->>'name', split_part(v_email, '@', 1)),
    COALESCE(raw_user_meta_data->>'role', 'counselor'),
    TRUE
  FROM auth.users
  WHERE id = v_auth_id
  ON CONFLICT (email) DO UPDATE SET auth_id = v_auth_id
  RETURNING * INTO v_user;

  RETURN jsonb_build_object('success', true, 'linked', true, 'user', row_to_json(v_user));
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_current_user_auth_id() TO authenticated;


-- ---------------------------------------------------------------------------
-- 2. Admin set password RPC: Owner updates password of ANY user directly
--    Directly updates auth.users.encrypted_password using pgcrypto bcrypt
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_user_password(
  target_user_id UUID,
  new_password TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_caller_id UUID;
  v_role TEXT;
  v_is_owner BOOLEAN;
  v_auth_user_id UUID;
  v_target_email TEXT;
  v_target_name TEXT;
  v_encrypted_pwd TEXT;
BEGIN
  -- 1. Owner guard: verify caller via auth.uid() against public.users
  SELECT id, role, coalesce(is_owner, false)
  INTO v_caller_id, v_role, v_is_owner
  FROM public.users
  WHERE auth_id = auth.uid();

  IF v_caller_id IS NULL OR (v_role != 'owner' AND NOT v_is_owner) THEN
    RAISE EXCEPTION 'Unauthorized: Only owners can update passwords';
  END IF;

  IF new_password IS NULL OR length(trim(new_password)) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters';
  END IF;

  -- 2. Find target user in public.users or auth.users
  SELECT auth_id, email, name INTO v_auth_user_id, v_target_email, v_target_name
  FROM public.users
  WHERE id = target_user_id OR auth_id = target_user_id;

  -- If auth_id was not in public.users, look up by email in auth.users
  IF v_auth_user_id IS NULL AND v_target_email IS NOT NULL THEN
    SELECT id INTO v_auth_user_id FROM auth.users WHERE lower(email) = lower(v_target_email);
  END IF;

  -- If target_user_id was already an auth.users id
  IF v_auth_user_id IS NULL THEN
    SELECT id, email INTO v_auth_user_id, v_target_email FROM auth.users WHERE id = target_user_id;
  END IF;

  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found in authentication system';
  END IF;

  -- 3. Hash the new password with bcrypt via pgcrypto
  v_encrypted_pwd := extensions.crypt(new_password, extensions.gen_salt('bf'));

  -- 4. Update auth.users with new password, confirmed status, and clean tokens
  UPDATE auth.users
  SET 
    encrypted_password = v_encrypted_pwd,
    email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
    updated_at = NOW(),
    confirmation_token = '',
    recovery_token = ''
  WHERE id = v_auth_user_id;

  -- Also ensure auth_id in public.users is linked
  UPDATE public.users
  SET 
    auth_id = v_auth_user_id,
    updated_at = NOW()
  WHERE (id = target_user_id OR auth_id = target_user_id OR lower(email) = lower(v_target_email))
    AND (auth_id IS NULL OR auth_id != v_auth_user_id);

  -- 5. Audit log
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_data)
  VALUES (
    v_caller_id,
    'password_reset_admin',
    'user',
    target_user_id,
    jsonb_build_object(
      'target_email', v_target_email,
      'target_name', v_target_name,
      'target_auth_id', v_auth_user_id,
      'reset_by', v_caller_id,
      'reset_at', NOW()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Password updated successfully for ' || COALESCE(v_target_email, 'user'),
    'email', v_target_email
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_password(UUID, TEXT) TO authenticated;


-- ---------------------------------------------------------------------------
-- 3. Admin create user RPC: Owner creates staff account with direct password
--    Guarantees auth.users, auth.identities, and public.users are atomic & confirmed
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_create_user(
  new_name TEXT,
  new_email TEXT,
  new_role TEXT,
  initial_password TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_caller_id UUID;
  v_role TEXT;
  v_is_owner BOOLEAN;
  v_user_count INT;
  clean_email TEXT;
  clean_name TEXT;
  clean_role TEXT;
  v_new_id UUID;
  v_encrypted_pwd TEXT;
BEGIN
  -- 1. Owner guard
  SELECT id, role, coalesce(is_owner, false)
  INTO v_caller_id, v_role, v_is_owner
  FROM public.users
  WHERE auth_id = auth.uid();

  IF v_caller_id IS NULL OR (v_role != 'owner' AND NOT v_is_owner) THEN
    RAISE EXCEPTION 'Unauthorized: Only owners can create users';
  END IF;

  -- 2. Validate inputs
  clean_name := trim(new_name);
  clean_email := lower(trim(new_email));
  clean_role := lower(trim(new_role));

  IF clean_name = '' THEN
    RAISE EXCEPTION 'Name is required';
  END IF;
  IF clean_email = '' OR clean_email NOT LIKE '%@%.%' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  IF initial_password IS NULL OR length(trim(initial_password)) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters';
  END IF;
  IF clean_role NOT IN ('owner', 'admin', 'counselor', 'faculty', 'accounts', 'reception', 'bdm', 'hod') THEN
    RAISE EXCEPTION 'Invalid role: %', clean_role;
  END IF;

  -- 3. Check user cap (max 15 users)
  SELECT count(*) INTO v_user_count FROM public.users WHERE is_active = TRUE;
  IF v_user_count >= 15 THEN
    RAISE EXCEPTION 'Maximum 15 active users reached. Deactivate a user before creating a new one.';
  END IF;

  -- 4. Check email uniqueness
  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = clean_email) THEN
    RAISE EXCEPTION 'Email % is already in use in authentication system', clean_email;
  END IF;
  IF EXISTS (SELECT 1 FROM public.users WHERE lower(email) = clean_email) THEN
    RAISE EXCEPTION 'Email % already exists in CRM staff directory', clean_email;
  END IF;

  -- 5. Create user in auth.users and auth.identities
  v_new_id := gen_random_uuid();
  v_encrypted_pwd := extensions.crypt(initial_password, extensions.gen_salt('bf'));

  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    email_change_token_current,
    email_change_confirm_status,
    is_sso_user,
    is_anonymous,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    v_new_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    clean_email,
    v_encrypted_pwd,
    NOW(),
    '',
    '',
    '',
    '',
    '',
    0,
    FALSE,
    FALSE,
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    jsonb_build_object('name', clean_name, 'role', clean_role),
    NOW(),
    NOW()
  );

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_new_id,
    jsonb_build_object('sub', v_new_id::text, 'email', clean_email, 'email_verified', true, 'phone_verified', false),
    'email',
    v_new_id::text,
    NOW(),
    NOW(),
    NOW()
  );

  -- 6. Insert into public.users
  INSERT INTO public.users (
    id,
    auth_id,
    name,
    email,
    role,
    is_active,
    is_owner,
    created_at,
    updated_at
  ) VALUES (
    v_new_id,
    v_new_id,
    clean_name,
    clean_email,
    clean_role,
    TRUE,
    (clean_role = 'owner'),
    NOW(),
    NOW()
  );

  -- 7. Audit log
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_data)
  VALUES (
    v_caller_id,
    'user_create_admin',
    'user',
    v_new_id,
    jsonb_build_object(
      'email', clean_email,
      'name', clean_name,
      'role', clean_role,
      'created_by', v_caller_id,
      'created_at', NOW()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_new_id,
    'email', clean_email,
    'name', clean_name,
    'role', clean_role
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_user(TEXT, TEXT, TEXT, TEXT) TO authenticated;


-- ---------------------------------------------------------------------------
-- 4. Deduplicate feature_permissions & add proper partial unique indexes
--    Prevents the bug where NULL user_id allows infinite conflicting duplicate entries
-- ---------------------------------------------------------------------------

-- Keep only the newest entry for each (feature_key, role) where user_id IS NULL
DELETE FROM public.feature_permissions fp1
WHERE fp1.user_id IS NULL
  AND fp1.id NOT IN (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (
        PARTITION BY feature_key, role 
        ORDER BY granted_at DESC NULLS LAST, id DESC
      ) as rn
      FROM public.feature_permissions
      WHERE user_id IS NULL
    ) ranked
    WHERE ranked.rn = 1
  );

-- Keep only the newest entry for each (feature_key, user_id) where user_id IS NOT NULL
DELETE FROM public.feature_permissions fp2
WHERE fp2.user_id IS NOT NULL
  AND fp2.id NOT IN (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (
        PARTITION BY feature_key, user_id 
        ORDER BY granted_at DESC NULLS LAST, id DESC
      ) as rn
      FROM public.feature_permissions
      WHERE user_id IS NOT NULL
    ) ranked
    WHERE ranked.rn = 1
  );

-- Create partial unique indexes so duplicate rows CANNOT be inserted again
DROP INDEX IF EXISTS idx_feature_permissions_role_unique;
CREATE UNIQUE INDEX idx_feature_permissions_role_unique
  ON public.feature_permissions (feature_key, role)
  WHERE user_id IS NULL;

DROP INDEX IF EXISTS idx_feature_permissions_user_unique;
CREATE UNIQUE INDEX idx_feature_permissions_user_unique
  ON public.feature_permissions (feature_key, user_id)
  WHERE user_id IS NOT NULL;


-- ---------------------------------------------------------------------------
-- 5. Seed clean feature permissions for Reception
--    Ensure Reception has full can_view=true and can_edit=true on their core tabs
-- ---------------------------------------------------------------------------
INSERT INTO public.feature_permissions (feature_key, role, user_id, can_view, can_edit, granted_at)
VALUES
  ('leads',             'reception', NULL, true, true, NOW()),
  ('students',          'reception', NULL, true, true, NOW()),
  ('tasks',             'reception', NULL, true, true, NOW()),
  ('calendar',          'reception', NULL, true, true, NOW()),
  ('batches',           'reception', NULL, true, false, NOW()),
  ('faculty_timetable', 'reception', NULL, true, false, NOW()),
  ('dashboard',         'reception', NULL, true, true, NOW())
ON CONFLICT (feature_key, role) WHERE user_id IS NULL
DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_edit = EXCLUDED.can_edit,
  granted_at = NOW();


-- ---------------------------------------------------------------------------
-- 6. RLS Policies: Grant Reception and staff roles native permissions
-- ---------------------------------------------------------------------------

-- 6a. LEADS UPDATE
-- Reception must be natively able to update leads (status, notes, counselor assignment)
DROP POLICY IF EXISTS leads_update ON public.leads;

CREATE POLICY leads_update ON public.leads FOR UPDATE TO authenticated
USING (
  public.is_owner()
  OR public.get_user_role() IN ('owner', 'admin', 'reception')
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
  OR public.get_user_role() IN ('owner', 'admin', 'reception')
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

-- 6b. STUDENTS UPDATE
-- Reception can update student details
DROP POLICY IF EXISTS students_update ON public.students;

CREATE POLICY students_update ON public.students FOR UPDATE TO authenticated
USING (
  public.is_owner()
  OR public.get_user_role() IN ('owner', 'admin', 'reception')
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
  OR public.get_user_role() IN ('owner', 'admin', 'reception')
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

-- 6c. TASKS INSERT, SELECT, UPDATE
DROP POLICY IF EXISTS tasks_insert ON public.tasks;
CREATE POLICY tasks_insert ON public.tasks FOR INSERT TO authenticated
WITH CHECK (
  public.is_owner()
  OR public.get_user_role() IN ('owner', 'admin', 'counselor', 'faculty', 'reception', 'bdm')
  OR EXISTS (
    SELECT 1 FROM public.feature_permissions fp
    WHERE fp.feature_key = 'tasks'
      AND (fp.can_edit = TRUE OR fp.can_view = TRUE)
      AND (
        fp.user_id = public.get_user_id()
        OR (fp.role = public.get_user_role() AND fp.user_id IS NULL)
      )
  )
);

DROP POLICY IF EXISTS tasks_select ON public.tasks;
CREATE POLICY tasks_select ON public.tasks FOR SELECT TO authenticated
USING (
  public.is_owner()
  OR public.get_user_role() IN ('owner', 'admin', 'reception')
  OR assigned_to = public.get_user_id()
  OR created_by  = public.get_user_id()
  OR EXISTS (
    SELECT 1 FROM public.feature_permissions fp
    WHERE fp.feature_key = 'tasks'
      AND fp.can_view = TRUE
      AND (
        fp.user_id = public.get_user_id()
        OR (fp.role = public.get_user_role() AND fp.user_id IS NULL)
      )
  )
);

-- 6d. FOLLOW_UPS INSERT, SELECT, UPDATE
DROP POLICY IF EXISTS follow_ups_insert ON public.follow_ups;
CREATE POLICY follow_ups_insert ON public.follow_ups FOR INSERT TO authenticated
WITH CHECK (
  public.is_owner()
  OR public.get_user_role() IN ('owner', 'admin', 'counselor', 'reception', 'bdm')
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

DROP POLICY IF EXISTS follow_ups_select ON public.follow_ups;
CREATE POLICY follow_ups_select ON public.follow_ups FOR SELECT TO authenticated
USING (
  public.is_owner()
  OR public.get_user_role() IN ('owner', 'admin', 'reception')
  OR assigned_to = public.get_user_id()
  OR EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = follow_ups.lead_id
      AND (
        l.assigned_counselor_id = public.get_user_id()
        OR public.get_user_role() IN ('owner', 'admin', 'reception')
      )
  )
);

-- Notify schema reload
NOTIFY pgrst, 'reload schema';

COMMIT;
