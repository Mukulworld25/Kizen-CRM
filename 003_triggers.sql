-- Kizen Education CRM — Triggers & Business Logic

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER students_updated_at BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER fees_updated_at BEFORE UPDATE ON fees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Student ID: KIZ-YYYY-NNN
CREATE OR REPLACE FUNCTION generate_student_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.student_id IS NULL OR NEW.student_id = '' THEN
    NEW.student_id := 'KIZ-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
      LPAD(nextval('student_id_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER students_generate_id BEFORE INSERT ON students
  FOR EACH ROW EXECUTE FUNCTION generate_student_id();

-- Receipt number: RCPT-YYYYMMDD-NNN
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.receipt_number IS NULL OR NEW.receipt_number = '' THEN
    NEW.receipt_number := 'RCPT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
      LPAD(nextval('receipt_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fee_payments_receipt BEFORE INSERT ON fee_payments
  FOR EACH ROW EXECUTE FUNCTION generate_receipt_number();

-- Sync fees.amount_paid on payment insert
CREATE OR REPLACE FUNCTION sync_fee_amount_paid()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE fees
  SET amount_paid = amount_paid + NEW.amount
  WHERE id = NEW.fee_id;

  UPDATE installments
  SET status = 'paid', paid_date = NEW.payment_date
  WHERE fee_id = NEW.fee_id
    AND status IN ('pending','overdue')
    AND id = (
      SELECT id FROM installments
      WHERE fee_id = NEW.fee_id AND status IN ('pending','overdue')
      ORDER BY installment_number ASC
      LIMIT 1
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fee_payments_sync AFTER INSERT ON fee_payments
  FOR EACH ROW EXECUTE FUNCTION sync_fee_amount_paid();

-- Batch enrolled_count maintenance
CREATE OR REPLACE FUNCTION update_batch_enrolled_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.batch_id IS NOT NULL THEN
    UPDATE batches SET enrolled_count = enrolled_count + 1 WHERE id = NEW.batch_id;
  ELSIF TG_OP = 'DELETE' AND OLD.batch_id IS NOT NULL THEN
    UPDATE batches SET enrolled_count = GREATEST(0, enrolled_count - 1) WHERE id = OLD.batch_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.batch_id IS DISTINCT FROM NEW.batch_id THEN
      IF OLD.batch_id IS NOT NULL THEN
        UPDATE batches SET enrolled_count = GREATEST(0, enrolled_count - 1) WHERE id = OLD.batch_id;
      END IF;
      IF NEW.batch_id IS NOT NULL THEN
        UPDATE batches SET enrolled_count = enrolled_count + 1 WHERE id = NEW.batch_id;
      END IF;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER students_batch_count AFTER INSERT OR UPDATE OR DELETE ON students
  FOR EACH ROW EXECUTE FUNCTION update_batch_enrolled_count();

-- Lead status change audit activity
CREATE OR REPLACE FUNCTION log_lead_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO lead_activities (lead_id, activity_type, description, created_by)
    VALUES (
      NEW.id,
      'status_change',
      'Status changed from ' || OLD.status || ' to ' || NEW.status,
      get_user_id()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_status_audit AFTER UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION log_lead_status_change();

-- Owner protection
CREATE OR REPLACE FUNCTION protect_owner_user()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_owner = TRUE THEN
    IF NEW.is_active = FALSE OR NEW.role <> OLD.role OR NEW.is_owner = FALSE THEN
      RAISE EXCEPTION 'Owner user cannot be deactivated or role-changed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_protect_owner BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION protect_owner_user();

-- Max 10 users cap
CREATE OR REPLACE FUNCTION enforce_user_cap()
RETURNS TRIGGER AS $$
DECLARE
  user_count INT;
BEGIN
  SELECT COUNT(*) INTO user_count FROM users;
  IF user_count >= 10 THEN
    RAISE EXCEPTION 'Maximum 10 users allowed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_cap BEFORE INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION enforce_user_cap();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE leads;
ALTER PUBLICATION supabase_realtime ADD TABLE follow_ups;
ALTER PUBLICATION supabase_realtime ADD TABLE fee_payments;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;