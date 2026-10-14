-- =============================================================================
-- Migration 054: Public User Existence and Login Pre-check RPC
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.check_user_login_status(
  p_identifier TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  clean_input TEXT;
  clean_email TEXT;
  v_user public.users%ROWTYPE;
BEGIN
  IF p_identifier IS NULL OR trim(p_identifier) = '' THEN
    RETURN jsonb_build_object(
      'exists', false,
      'error', 'empty_username',
      'message', 'Username cannot be empty'
    );
  END IF;

  clean_input := trim(p_identifier);

  -- Support entering just username (e.g. "reception" -> "reception@kizen.edu")
  IF clean_input NOT LIKE '%@%' THEN
    clean_email := lower(clean_input || '@kizen.edu');
  ELSE
    clean_email := lower(clean_input);
  END IF;

  -- 1. Check in public.users
  SELECT * INTO v_user
  FROM public.users
  WHERE lower(email) = clean_email;

  -- 2. If not in public.users, check auth.users directly
  IF v_user.id IS NULL THEN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = clean_email) THEN
      RETURN jsonb_build_object(
        'exists', false,
        'resolved_email', clean_email,
        'error', 'username_not_found',
        'message', 'Username incorrect'
      );
    ELSE
      -- Exists in auth.users
      RETURN jsonb_build_object(
        'exists', true,
        'is_active', true,
        'resolved_email', clean_email
      );
    END IF;
  END IF;

  -- 3. Check active state
  IF v_user.is_active = FALSE THEN
    RETURN jsonb_build_object(
      'exists', true,
      'is_active', false,
      'resolved_email', clean_email,
      'error', 'account_inactive',
      'message', 'Account is deactivated'
    );
  END IF;

  RETURN jsonb_build_object(
    'exists', true,
    'is_active', true,
    'resolved_email', clean_email
  );
END;
$$;

-- Allow anon and authenticated to execute login pre-check
GRANT EXECUTE ON FUNCTION public.check_user_login_status(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.check_user_login_status(TEXT) TO authenticated;

COMMIT;
