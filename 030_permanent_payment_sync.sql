-- ============================================================================
-- 030_permanent_payment_sync.sql
-- Kizen Education CRM: Permanent Real-time Payment & Fee State Synchronization
-- ============================================================================

-- 1. Main Synchronization Function
CREATE OR REPLACE FUNCTION sync_fee_and_installments_state(p_fee_id UUID)
RETURNS VOID AS $$
DECLARE
  v_fee RECORD;
  v_total_paid NUMERIC := 0;
  v_net_fee NUMERIC := 0;
  v_pending NUMERIC := 0;
  v_status TEXT := 'pending';
  v_remaining NUMERIC := 0;
  v_inst RECORD;
  v_next_due_date DATE := NULL;
  v_next_due_amount NUMERIC := NULL;
  v_has_overdue BOOLEAN := FALSE;
BEGIN
  IF p_fee_id IS NULL THEN
    RETURN;
  END IF;

  -- Fetch current fee
  SELECT id, total_fee, discount, scholarship, registration_amount, amount_paid
  INTO v_fee
  FROM public.fees
  WHERE id = p_fee_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Recompute total payments from fee_payments table
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_paid
  FROM public.fee_payments
  WHERE fee_id = p_fee_id;

  -- Calculate net fee (total_fee - discount - scholarship)
  v_net_fee := COALESCE(v_fee.total_fee, 0) - COALESCE(v_fee.discount, 0) - COALESCE(v_fee.scholarship, 0);
  v_pending := GREATEST(0, v_net_fee - v_total_paid);

  -- Allocate payments across installments in chronological order
  v_remaining := v_total_paid;

  -- If entire fee is fully paid (v_pending = 0 and net_fee > 0), all installments are marked paid!
  IF v_net_fee > 0 AND v_total_paid >= v_net_fee THEN
    UPDATE public.installments
    SET status = 'paid',
        amount_paid = amount,
        pending_balance = 0,
        paid_date = COALESCE(paid_date, CURRENT_DATE)
    WHERE fee_id = p_fee_id;
  ELSE
    -- Allocate incrementally to installments
    FOR v_inst IN
      SELECT id, amount, due_date, status, paid_date
      FROM public.installments
      WHERE fee_id = p_fee_id
      ORDER BY installment_number ASC
    LOOP
      IF v_remaining >= v_inst.amount THEN
        UPDATE public.installments
        SET status = 'paid',
            amount_paid = v_inst.amount,
            pending_balance = 0,
            paid_date = COALESCE(v_inst.paid_date, CURRENT_DATE)
        WHERE id = v_inst.id;
        v_remaining := v_remaining - v_inst.amount;
      ELSIF v_remaining > 0 THEN
        UPDATE public.installments
        SET status = 'partial',
            amount_paid = v_remaining,
            pending_balance = v_inst.amount - v_remaining
        WHERE id = v_inst.id;
        v_remaining := 0;
      ELSE
        UPDATE public.installments
        SET amount_paid = 0,
            pending_balance = v_inst.amount,
            status = CASE
                       WHEN v_inst.due_date IS NOT NULL AND v_inst.due_date < CURRENT_DATE THEN 'overdue'
                       ELSE 'pending'
                     END,
            paid_date = NULL
        WHERE id = v_inst.id;
      END IF;
    END LOOP;
  END IF;

  -- Check if any installment is overdue
  SELECT EXISTS(
    SELECT 1 FROM public.installments
    WHERE fee_id = p_fee_id AND status = 'overdue'
  ) INTO v_has_overdue;

  -- Determine fee payment_status
  IF v_net_fee <= 0 THEN
    v_status := 'paid';
  ELSIF v_total_paid >= v_net_fee THEN
    v_status := 'paid';
  ELSIF v_total_paid > 0 THEN
    v_status := 'partial';
  ELSIF v_has_overdue THEN
    v_status := 'due';
  ELSE
    v_status := 'pending';
  END IF;

  -- Determine next due date and next due amount
  IF v_status = 'paid' THEN
    v_next_due_date := NULL;
    v_next_due_amount := 0;
  ELSE
    SELECT due_date, pending_balance
    INTO v_next_due_date, v_next_due_amount
    FROM public.installments
    WHERE fee_id = p_fee_id AND status != 'paid'
    ORDER BY installment_number ASC
    LIMIT 1;
  END IF;

  -- Update fees table with new computed state
  UPDATE public.fees
  SET amount_paid = v_total_paid,
      payment_status = v_status,
      next_due_date = v_next_due_date,
      next_due_amount = COALESCE(v_next_due_amount, 0),
      updated_at = NOW()
  WHERE id = p_fee_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Trigger Function on fee_payments
CREATE OR REPLACE FUNCTION trigger_sync_fee_payments()
RETURNS TRIGGER AS $$
DECLARE
  v_target_id UUID;
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_target_id := COALESCE(NEW.fee_id, OLD.fee_id);
  IF v_target_id IS NOT NULL THEN
    PERFORM sync_fee_and_installments_state(v_target_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS fee_payments_sync ON public.fee_payments;
CREATE TRIGGER fee_payments_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.fee_payments
  FOR EACH ROW EXECUTE FUNCTION trigger_sync_fee_payments();


-- 3. Trigger Function on installments
CREATE OR REPLACE FUNCTION trigger_sync_installments()
RETURNS TRIGGER AS $$
DECLARE
  v_target_id UUID;
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_target_id := COALESCE(NEW.fee_id, OLD.fee_id);
  IF v_target_id IS NOT NULL THEN
    PERFORM sync_fee_and_installments_state(v_target_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS installments_sync ON public.installments;
CREATE TRIGGER installments_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.installments
  FOR EACH ROW EXECUTE FUNCTION trigger_sync_installments();


-- 4. Trigger Function on fees total_fee/discount/scholarship updates
CREATE OR REPLACE FUNCTION trigger_sync_fees_recalc()
RETURNS TRIGGER AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF (OLD.total_fee IS DISTINCT FROM NEW.total_fee) OR
     (OLD.discount IS DISTINCT FROM NEW.discount) OR
     (OLD.scholarship IS DISTINCT FROM NEW.scholarship) THEN
    PERFORM sync_fee_and_installments_state(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS fees_recalc_sync ON public.fees;
CREATE TRIGGER fees_recalc_sync
  AFTER UPDATE OF total_fee, discount, scholarship ON public.fees
  FOR EACH ROW EXECUTE FUNCTION trigger_sync_fees_recalc();



-- 5. Realtime Publication & Replica Identity
DO $$
BEGIN
  -- Add fees
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'fees'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fees;
  END IF;

  -- Add fee_payments
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'fee_payments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fee_payments;
  END IF;

  -- Add installments
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'installments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.installments;
  END IF;

  -- Add leads
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'leads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
  END IF;

  -- Add follow_ups
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'follow_ups'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.follow_ups;
  END IF;

  -- Add notifications
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

ALTER TABLE public.fees REPLICA IDENTITY FULL;
ALTER TABLE public.fee_payments REPLICA IDENTITY FULL;
ALTER TABLE public.installments REPLICA IDENTITY FULL;
ALTER TABLE public.leads REPLICA IDENTITY FULL;
ALTER TABLE public.follow_ups REPLICA IDENTITY FULL;

-- 6. Reconcile ALL existing fees across the database immediately
DO $$
DECLARE
  f_row RECORD;
BEGIN
  FOR f_row IN SELECT id FROM public.fees LOOP
    PERFORM sync_fee_and_installments_state(f_row.id);
  END LOOP;
END $$;
