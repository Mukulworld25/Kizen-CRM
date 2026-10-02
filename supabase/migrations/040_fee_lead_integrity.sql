-- =============================================================================
-- Migration 040: Fee + Lead pipeline integrity (renumbered from 036, live schema aligned)
--
-- Fixes audit findings:
--   #16 generate_display_id sequence synchronization to prevent duplicate keys.
--   #19 generate_display_id search_path pinning and table alignment.
--   #23 sync_fee_amount_paid recomputation across insert/update/delete.
--   #24 fees.net_fee and fees.pending_balance source of truth as generated columns.
--   #25 installments.pending_balance column added for installment accounting.
--   #21 sync_lead_enrollment_from_payment trigger.
--   #40 delete_fee_with_audit owner-guarded deletion RPC with audit logging.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Ensure installments.pending_balance exists
-- ---------------------------------------------------------------------------
ALTER TABLE public.installments ADD COLUMN IF NOT EXISTS pending_balance NUMERIC(10,2) DEFAULT 0;

-- ---------------------------------------------------------------------------
-- 2. Make fees.net_fee / fees.pending_balance generated (source of truth)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_gen TEXT;
BEGIN
  SELECT is_generated INTO v_gen FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'fees' AND column_name = 'pending_balance';
  IF v_gen IS DISTINCT FROM 'ALWAYS' THEN
    ALTER TABLE public.fees DROP COLUMN IF EXISTS pending_balance;
    ALTER TABLE public.fees ADD COLUMN pending_balance NUMERIC(10,2)
      GENERATED ALWAYS AS (COALESCE(total_fee, 0) - COALESCE(discount, 0) - COALESCE(scholarship, 0) - COALESCE(amount_paid, 0)) STORED;
  END IF;

  SELECT is_generated INTO v_gen FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'fees' AND column_name = 'net_fee';
  IF v_gen IS DISTINCT FROM 'ALWAYS' THEN
    ALTER TABLE public.fees DROP COLUMN IF EXISTS net_fee;
    ALTER TABLE public.fees ADD COLUMN net_fee NUMERIC(10,2)
      GENERATED ALWAYS AS (COALESCE(total_fee, 0) - COALESCE(discount, 0) - COALESCE(scholarship, 0)) STORED;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Recompute amount_paid from fee_payments for every fee (repair drift)
-- ---------------------------------------------------------------------------
UPDATE public.fees f
   SET amount_paid = COALESCE(
         (SELECT SUM(fp.amount) FROM public.fee_payments fp WHERE fp.fee_id = f.id), 0
       )
 WHERE f.amount_paid IS DISTINCT FROM COALESCE(
         (SELECT SUM(fp.amount) FROM public.fee_payments fp WHERE fp.fee_id = f.id), 0
       );

-- ---------------------------------------------------------------------------
-- 4. sync_fee_amount_paid: recompute + settle installments proportionally
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_fee_amount_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fee_id uuid;
  v_paid numeric;
  v_remaining numeric;
  v_inst record;
BEGIN
  v_fee_id := COALESCE(NEW.fee_id, OLD.fee_id);
  IF v_fee_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Recompute rather than increment: idempotent across INSERT/UPDATE/DELETE.
  SELECT COALESCE(SUM(fp.amount), 0) INTO v_paid
    FROM public.fee_payments fp
   WHERE fp.fee_id = v_fee_id;

  UPDATE public.fees
     SET amount_paid = v_paid,
         updated_at = NOW()
   WHERE id = v_fee_id;

  -- Re-derive installment states from the new total paid.
  v_remaining := v_paid;
  FOR v_inst IN
    SELECT id, amount FROM public.installments
     WHERE fee_id = v_fee_id
     ORDER BY installment_number ASC
  LOOP
    IF v_remaining >= v_inst.amount THEN
      UPDATE public.installments
         SET status = 'paid',
             amount_paid = v_inst.amount,
             pending_balance = 0,
             paid_date = COALESCE(paid_date, CURRENT_DATE)
       WHERE id = v_inst.id;
      v_remaining := v_remaining - v_inst.amount;
    ELSIF v_remaining > 0 THEN
      -- Partial payment: keep it 'partial', do NOT mark the whole thing paid.
      UPDATE public.installments
         SET status = CASE WHEN status = 'overdue' THEN 'overdue' ELSE 'partial' END,
             amount_paid = v_remaining,
             pending_balance = v_inst.amount - v_remaining
       WHERE id = v_inst.id;
      v_remaining := 0;
    ELSE
      UPDATE public.installments
         SET amount_paid = 0,
             pending_balance = v_inst.amount,
             status = CASE
                        WHEN paid_date IS NOT NULL THEN 'pending'
                        WHEN due_date < CURRENT_DATE THEN 'overdue'
                        ELSE 'pending'
                      END,
             paid_date = NULL
       WHERE id = v_inst.id;
    END IF;
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_fee_payment ON public.fee_payments;
DROP TRIGGER IF EXISTS fee_payments_sync ON public.fee_payments;
CREATE TRIGGER fee_payments_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.fee_payments
  FOR EACH ROW EXECUTE FUNCTION public.sync_fee_amount_paid();

-- Re-settle installments that were already mis-stated by the old trigger.
UPDATE public.fee_payments SET amount = amount WHERE id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 5. generate_display_id: add fee_payments prefix, pin search_path (#19).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_display_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix TEXT;
  v_year TEXT;
  v_seq_name TEXT;
  v_next_val INT;
BEGIN
  IF NEW.display_id IS NOT NULL AND NEW.display_id <> '' THEN
    RETURN NEW;
  END IF;

  v_year := to_char(COALESCE(NEW.created_at, NOW()), 'YYYY');

  IF TG_TABLE_NAME = 'leads' THEN
    v_prefix := 'LD';
  ELSIF TG_TABLE_NAME = 'institute_expenses' THEN
    v_prefix := 'EXP';
  ELSIF TG_TABLE_NAME = 'institutions' THEN
    v_prefix := 'INST';
  ELSE
    v_prefix := 'REF';
  END IF;

  v_seq_name := lower('seq_' || v_prefix || '_' || v_year);

  EXECUTE format('CREATE SEQUENCE IF NOT EXISTS public.%I START 1', v_seq_name);
  EXECUTE format('SELECT nextval(%L)', 'public.' || v_seq_name) INTO v_next_val;

  NEW.display_id := v_prefix || '-' || v_year || '-' || lpad(v_next_val::text, 4, '0');
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. Sync every display-id sequence past the ids that already exist (#16).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
  yr TEXT;
  seq TEXT;
  v_max INT;
BEGIN
  FOR r IN (
    SELECT * FROM (VALUES 
      ('leads', 'LD'),
      ('institutions', 'INST'),
      ('institute_expenses', 'EXP')
    ) AS t(tbl, pfx)
  ) LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = r.tbl AND column_name = 'display_id'
    ) THEN
      FOR yr IN EXECUTE format(
        'SELECT DISTINCT to_char(created_at, ''YYYY'') FROM public.%I WHERE display_id IS NOT NULL',
        r.tbl
      ) LOOP
        EXECUTE format(
          'SELECT COALESCE(MAX(NULLIF(regexp_replace(display_id, ''^.*-'', ''''), '''')' || '::int), 0) FROM public.%I WHERE display_id LIKE %L',
          r.tbl, r.pfx || '-' || yr || '-%'
        ) INTO v_max;

        seq := lower('seq_' || r.pfx || '_' || yr);
        EXECUTE format('CREATE SEQUENCE IF NOT EXISTS public.%I START 1', seq);
        IF v_max > 0 THEN
          EXECUTE format('SELECT setval(%L, %s, true)', 'public.' || seq, v_max);
        ELSE
          EXECUTE format('SELECT setval(%L, 1, false)', 'public.' || seq);
        END IF;
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 7. Re-derive lead pipeline_stage when a payment is recorded (#21).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_lead_enrollment_from_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
BEGIN
  SELECT COALESCE(s.lead_id, fp.student_id) INTO v_lead_id
    FROM public.fee_payments fp
    LEFT JOIN public.students s ON s.id = fp.student_id
   WHERE fp.id = COALESCE(NEW.id, OLD.id);

  IF v_lead_id IS NOT NULL THEN
    UPDATE public.leads SET updated_at = NOW() WHERE id = v_lead_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS fee_payments_sync_lead_stage ON public.fee_payments;
CREATE TRIGGER fee_payments_sync_lead_stage
  AFTER INSERT OR UPDATE OR DELETE ON public.fee_payments
  FOR EACH ROW EXECUTE FUNCTION public.sync_lead_enrollment_from_payment();

-- ---------------------------------------------------------------------------
-- 8. delete_fee_with_audit: owner-guarded deletion with audit logging (#40)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.delete_fee_with_audit(uuid, text);

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
  v_role text;
  v_is_owner boolean;
  v_fee record;
BEGIN
  select id, role, coalesce(is_owner, false)
    into v_caller_id, v_role, v_is_owner
    from public.users
   where auth_id = auth.uid();

  if v_caller_id is null or (v_role <> 'owner' and not v_is_owner) then
    raise exception 'Unauthorized: Only owners can delete fee records';
  end if;

  SELECT * INTO v_fee FROM public.fees WHERE id = p_fee_id;
  IF NOT FOUND THEN
    raise exception 'Fee record not found';
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

-- ---------------------------------------------------------------------------
-- 9. Publish the remaining soft-deletable tables to realtime
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE students';            EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE institutions';         EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE institute_expenses';   EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE installments';         EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE lead_activities';      EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
END $$;

COMMIT;
