-- Migration 032: Admin Update User (Email, Name, Role, Status) with Auth Sync
-- Synchronizes auth.users, auth.identities, and public.users atomically

CREATE OR REPLACE FUNCTION public.admin_update_user(
  target_user_id UUID,
  new_name TEXT,
  new_email TEXT,
  new_role TEXT DEFAULT NULL,
  new_is_active BOOLEAN DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_id UUID;
  v_role TEXT;
  v_is_owner BOOLEAN;
  target_is_owner BOOLEAN;
  clean_email TEXT;
  existing_user_id UUID;
  old_email TEXT;
BEGIN
  -- Look up caller via auth.uid() against users.auth_id, enforcing owner-only guard (same pattern as approve_deletion)
  SELECT id, role, coalesce(is_owner, false)
  INTO v_caller_id, v_role, v_is_owner
  FROM public.users
  WHERE auth_id = auth.uid();

  IF v_caller_id IS NULL OR (v_role != 'owner' AND NOT v_is_owner) THEN
    RAISE EXCEPTION 'Unauthorized: Only owners can update users';
  END IF;

  -- 2. Fetch target user
  SELECT email, is_owner INTO old_email, target_is_owner FROM public.users WHERE id = target_user_id OR auth_id = target_user_id;
  IF old_email IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  clean_email := lower(trim(new_email));
  IF clean_email = '' OR clean_email NOT LIKE '%@%.%' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;

  -- 3. If email is changing, check uniqueness across auth.users and public.users
  IF clean_email <> lower(old_email) THEN
    SELECT id INTO existing_user_id FROM auth.users WHERE lower(email) = clean_email AND id <> target_user_id;
    IF existing_user_id IS NOT NULL THEN
      RAISE EXCEPTION 'Email % is already in use by another account', clean_email;
    END IF;

    SELECT id INTO existing_user_id FROM public.users WHERE lower(email) = clean_email AND id <> target_user_id AND auth_id <> target_user_id;
    IF existing_user_id IS NOT NULL THEN
      RAISE EXCEPTION 'Email % is already in use in public.users', clean_email;
    END IF;

    -- Update auth.users (keep confirmed status so no email verification lockout occurs)
    UPDATE auth.users
    SET 
      email = clean_email,
      email_change = '',
      email_change_token_new = '',
      email_change_confirm_status = 0,
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      updated_at = NOW(),
      raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{email}', to_jsonb(clean_email))
    WHERE id = target_user_id;

    -- Update auth.identities so auth.users and auth.identities stay in sync!
    -- Note: email column in auth.identities is a GENERATED ALWAYS column from identity_data->>'email'
    UPDATE auth.identities
    SET 
      identity_data = jsonb_set(
        jsonb_set(COALESCE(identity_data, '{}'::jsonb), '{email}', to_jsonb(clean_email)),
        '{sub}', to_jsonb(target_user_id::text)
      ),
      updated_at = NOW()
    WHERE user_id = target_user_id;
  END IF;

  -- 4. Update public.users
  IF target_is_owner THEN
    UPDATE public.users
    SET 
      name = COALESCE(NULLIF(trim(new_name), ''), name),
      email = clean_email,
      updated_at = NOW()
    WHERE id = target_user_id OR auth_id = target_user_id;
  ELSE
    UPDATE public.users
    SET 
      name = COALESCE(NULLIF(trim(new_name), ''), name),
      email = clean_email,
      role = COALESCE(new_role::user_role, role),
      is_active = COALESCE(new_is_active, is_active),
      updated_at = NOW()
    WHERE id = target_user_id OR auth_id = target_user_id;
  END IF;

  -- 5. Record audit log
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_data)
  VALUES (
    v_caller_id,
    'user_update',
    'user',
    target_user_id,
    jsonb_build_object(
      'old_email', old_email,
      'new_email', clean_email,
      'name', new_name,
      'updated_by', v_caller_id
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'user_id', target_user_id,
    'email', clean_email,
    'name', new_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_user(UUID, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_user(UUID, TEXT, TEXT, TEXT, BOOLEAN) TO service_role;
