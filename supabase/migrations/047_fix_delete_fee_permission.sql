-- =============================================================================
-- Migration 047: delete_fee_with_audit — honour feature_permissions (Bug #4)
--
-- Problem:
--   Migration 040 hard-coded delete_fee_with_audit to be OWNER-ONLY:
--     if v_caller_id is null or (v_role <> 'owner' and not v_is_owner) then
--       raise exception 'Unauthorized: Only owners can delete fee records';
--   Per the master spec, Admin has full CRUD and Accounts has full fee CRUD,
--   and the owner can additionally grant a role/user elevated access through
--   the feature_permissions matrix.  None of that was honoured, so those users
--   were blocked from deleting a fee record ("Editor Access" bug).
--
-- Fix:
--   Re-create the RPC so it authorises:
--     1. Owner (is_owner flag OR role = 'owner')        — always
--     2. role IN ('admin', 'accounts')                  — full fee CRUD per spec
--     3. Explicit feature_permissions grant for feature_key = 'fees' with
--        can_edit = TRUE — user-specific override first, then role-level grant.
--   Audit-logging behaviour is unchanged.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.delete_fee_with_audit(
  p_fee_id uuid,
  p_reason text DEFAULT NULL::text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid;
  v_role      text;
  v_is_owner  boolean;
  v_allowed   boolean := false;
  v_fee       record;
BEGIN
  SELECT id, role, COALESCE(is_owner, false)
    INTO v_caller_id, v_role, v_is_owner
    FROM public.users
   WHERE auth_id = auth.uid();

  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: no matching user profile';
  END IF;

  -- 1. Owner (flag or role) is always allowed
  IF v_is_owner OR v_role = 'owner' THEN
    v_allowed := true;
  END IF;

  -- 2. Admin & Accounts hold full fee CRUD per the master spec
  IF NOT v_allowed AND v_role IN ('admin', 'accounts') THEN
    v_allowed := true;
  END IF;

  -- 3. Explicit feature_permissions grant for the 'fees' feature
  --    (user-specific override takes priority over the role-level grant)
  IF NOT v_allowed THEN
    SELECT COALESCE(
      (SELECT fp.can_edit
         FROM public.feature_permissions fp
        WHERE fp.feature_key = 'fees'
          AND fp.user_id = v_caller_id
        ORDER BY fp.granted_at DESC NULLS LAST
        LIMIT 1),
      (SELECT fp.can_edit
         FROM public.feature_permissions fp
        WHERE fp.feature_key = 'fees'
          AND fp.role = v_role
          AND fp.user_id IS NULL
        ORDER BY fp.granted_at DESC NULLS LAST
        LIMIT 1),
      false
    ) INTO v_allowed;
  END IF;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Unauthorized: you do not have permission to delete fee records';
  END IF;

  SELECT * INTO v_fee FROM public.fees WHERE id = p_fee_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fee record not found';
  END IF;

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_data)
  VALUES (
    v_caller_id,
    'delete_fee',
    'fee',
    p_fee_id,
    jsonb_build_object(
      'reason', p_reason,
      'student_id', v_fee.student_id,
      'course_id', v_fee.course_id,
      'total_fee', v_fee.total_fee,
      'discount', v_fee.discount,
      'scholarship', v_fee.scholarship,
      'amount_paid', v_fee.amount_paid,
      'payments_total', COALESCE(
        (SELECT SUM(fp.amount) FROM public.fee_payments fp WHERE fp.fee_id = p_fee_id), 0
      ),
      'deleted_at', now()
    )
  );

  DELETE FROM public.fees WHERE id = p_fee_id;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_fee_with_audit(uuid, text) TO authenticated, service_role;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;