-- =============================================================================
-- Migration 053: User Self-Password Change & Security Activity Logging
--                (Enforcing bcrypt cost 10 for GoTrue compatibility)
-- =============================================================================

BEGIN;

-- Ensure password_plain exists on public.users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_plain TEXT;

-- ---------------------------------------------------------------------------
-- 1. User Self-Password Change RPC
--    Allows any authenticated user to update their own password securely.
--    Atomically updates auth.users (cost 10), public.users.password_plain, and logs to audit_logs.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_change_own_password(
  new_password TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_auth_id UUID := auth.uid();
  v_user public.users%ROWTYPE;
  v_email TEXT;
  v_encrypted_pwd TEXT;
BEGIN
  IF v_auth_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF new_password IS NULL OR length(trim(new_password)) < 6 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Password must be at least 6 characters long');
  END IF;

  -- Find profile in public.users
  SELECT * INTO v_user FROM public.users WHERE auth_id = v_auth_id;
  IF v_user.id IS NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = v_auth_id;
    SELECT * INTO v_user FROM public.users WHERE lower(email) = lower(v_email);
  ELSE
    v_email := v_user.email;
  END IF;

  -- Bcrypt hash the new password with cost 10 (required by GoTrue)
  v_encrypted_pwd := extensions.crypt(trim(new_password), extensions.gen_salt('bf', 10));

  -- Update auth.users credentials & reset token state
  UPDATE auth.users
  SET 
    encrypted_password = v_encrypted_pwd,
    updated_at = NOW(),
    recovery_token = '',
    confirmation_token = '',
    email_confirmed_at = COALESCE(email_confirmed_at, NOW())
  WHERE id = v_auth_id;

  -- Update public.users plain password cache and timestamp
  IF v_user.id IS NOT NULL THEN
    UPDATE public.users
    SET 
      password_plain = trim(new_password),
      updated_at = NOW()
    WHERE id = v_user.id;
  END IF;

  -- Security Activity Logging
  INSERT INTO public.audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    new_data
  ) VALUES (
    v_user.id,
    'password_change',
    'auth',
    v_user.id,
    jsonb_build_object(
      'message', 'User changed their own password',
      'email', COALESCE(v_email, v_user.email),
      'user_name', v_user.name,
      'role', v_user.role,
      'timestamp', NOW()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Your password has been changed successfully'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_change_own_password(TEXT) TO authenticated;


-- ---------------------------------------------------------------------------
-- 2. Enhanced Admin Set Password RPC with Cost 10 & Security Audit
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
    -- Log unauthorized privilege escalation attempt
    IF v_caller_id IS NOT NULL THEN
      INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_data)
      VALUES (
        v_caller_id,
        'unauthorized_attempt',
        'auth',
        target_user_id,
        jsonb_build_object(
          'message', 'Unauthorized attempt to reset another user password',
          'attempted_by', v_caller_id,
          'target_user_id', target_user_id,
          'timestamp', NOW()
        )
      );
    END IF;
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Only owners can update passwords');
  END IF;

  IF new_password IS NULL OR length(trim(new_password)) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters';
  END IF;

  -- 2. Find target user in public.users or auth.users
  SELECT auth_id, email, name INTO v_auth_user_id, v_target_email, v_target_name
  FROM public.users
  WHERE id = target_user_id OR auth_id = target_user_id;

  IF v_auth_user_id IS NULL AND v_target_email IS NOT NULL THEN
    SELECT id INTO v_auth_user_id FROM auth.users WHERE lower(email) = lower(v_target_email);
  END IF;

  IF v_auth_user_id IS NULL THEN
    SELECT id, email INTO v_auth_user_id, v_target_email FROM auth.users WHERE id = target_user_id;
  END IF;

  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found in system';
  END IF;

  -- 3. Encrypt password with standard bcrypt cost 10
  v_encrypted_pwd := extensions.crypt(trim(new_password), extensions.gen_salt('bf', 10));

  -- 4. Update auth.users with new password, confirmed status, and clean tokens
  UPDATE auth.users
  SET 
    encrypted_password = v_encrypted_pwd,
    email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
    updated_at = NOW(),
    confirmation_token = '',
    recovery_token = ''
  WHERE id = v_auth_user_id;

  -- Update public.users
  UPDATE public.users
  SET 
    auth_id = v_auth_user_id,
    password_plain = trim(new_password),
    updated_at = NOW()
  WHERE (id = target_user_id OR auth_id = target_user_id OR lower(email) = lower(v_target_email));

  -- 5. Audit log
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_data)
  VALUES (
    v_caller_id,
    'password_reset_admin',
    'auth',
    target_user_id,
    jsonb_build_object(
      'message', 'Owner updated user password',
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
-- 3. Enhanced Admin Create User RPC with Cost 10
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
    RAISE EXCEPTION 'Unauthorized: Only owners can create users directly';
  END IF;

  -- 2. Validate inputs
  clean_email := lower(trim(new_email));
  clean_name := trim(new_name);
  clean_role := lower(trim(new_role));

  IF clean_email = '' OR clean_email NOT LIKE '%_@__%.__%' THEN
    RAISE EXCEPTION 'Invalid email address';
  END IF;

  IF clean_name = '' THEN
    RAISE EXCEPTION 'Name cannot be empty';
  END IF;

  IF initial_password IS NULL OR length(trim(initial_password)) < 6 THEN
    RAISE EXCEPTION 'Initial password must be at least 6 characters';
  END IF;

  -- 3. Check user cap (only active users)
  SELECT count(*) INTO v_user_count FROM public.users WHERE is_active = TRUE;
  IF v_user_count >= 25 THEN
    RAISE EXCEPTION 'User limit reached (maximum 25 active users).';
  END IF;

  -- 4. Check if email already exists in public.users
  IF EXISTS (SELECT 1 FROM public.users WHERE lower(email) = clean_email) THEN
    -- If already exists, update password and activate
    SELECT id, auth_id INTO v_new_id FROM public.users WHERE lower(email) = clean_email LIMIT 1;
    PERFORM public.admin_set_user_password(v_new_id, initial_password);
    UPDATE public.users SET is_active = TRUE, role = clean_role, name = clean_name WHERE id = v_new_id;
    RETURN jsonb_build_object('success', true, 'message', 'User reactivated with new password', 'user_id', v_new_id, 'email', clean_email);
  END IF;

  -- 5. Generate bcrypt password with cost 10
  v_encrypted_pwd := extensions.crypt(trim(initial_password), extensions.gen_salt('bf', 10));
  v_new_id := gen_random_uuid();

  -- 6. Insert into auth.users directly
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_token,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_new_id,
    'authenticated',
    'authenticated',
    clean_email,
    v_encrypted_pwd,
    NOW(),
    '',
    jsonb_build_object('provider', 'email', 'providers', array['email']),
    jsonb_build_object('name', clean_name, 'role', clean_role),
    NOW(),
    NOW(),
    ''
  );

  -- 7. Insert into auth.identities
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    v_new_id,
    v_new_id,
    jsonb_build_object('sub', v_new_id::text, 'email', clean_email),
    'email',
    NOW(),
    NOW(),
    NOW()
  );

  -- 8. Insert into public.users
  INSERT INTO public.users (
    id,
    auth_id,
    name,
    email,
    role,
    is_active,
    password_plain,
    created_at,
    updated_at
  ) VALUES (
    v_new_id,
    v_new_id,
    clean_name,
    clean_email,
    clean_role,
    TRUE,
    trim(initial_password),
    NOW(),
    NOW()
  );

  -- 9. Audit log
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_data)
  VALUES (
    v_caller_id,
    'create_user_direct',
    'auth',
    v_new_id,
    jsonb_build_object(
      'message', 'Owner created direct staff account',
      'email', clean_email,
      'name', clean_name,
      'role', clean_role,
      'created_by', v_caller_id,
      'timestamp', NOW()
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

COMMIT;
