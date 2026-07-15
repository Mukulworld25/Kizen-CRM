-- =====================================================
-- KIZEN CRM — MASTER MIGRATION: Steps B through G
-- Run sequentially. Do NOT re-run 001-007 first.
-- =====================================================

-- ==================== FIX: NOTIFICATION TRIGGERS ====================
-- These were missing. Notifications table existed but nothing ever wrote to it.

CREATE OR REPLACE FUNCTION notify_new_lead()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify assigned counselor
  IF NEW.assigned_counselor_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, related_id)
    VALUES (
      NEW.assigned_counselor_id,
      'New Lead Assigned',
      'Lead "' || NEW.full_name || '" has been assigned to you.',
      'new_lead',
      NEW.id
    );
  END IF;
  -- Notify all owners/admins
  INSERT INTO notifications (user_id, title, message, type, related_id)
  SELECT id, 'New Lead Created', 'Lead "' || NEW.full_name || '" has been created.', 'new_lead', NEW.id
  FROM users WHERE role IN ('owner', 'admin') AND id != COALESCE(NEW.created_by, '00000000-0000-0000-0000-000000000000');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION notify_follow_up_assigned()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, related_id)
    VALUES (
      NEW.assigned_to,
      'Follow-up Scheduled',
      'You have a ' || NEW.type || ' follow-up scheduled for ' || to_char(NEW.scheduled_at, 'Mon DD, YYYY HH:MM AM'),
      'follow_up',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION notify_fee_overdue()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'overdue' AND (OLD.status IS NULL OR OLD.status != 'overdue') THEN
    INSERT INTO notifications (user_id, title, message, type, related_id)
    SELECT id, 'Fee Installment Overdue', 'Installment #' || NEW.installment_number || ' of ₹' || NEW.amount || ' is overdue.', 'fee_due', NEW.id
    FROM users WHERE role IN ('owner', 'admin', 'accounts');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers first to avoid duplicates
DROP TRIGGER IF EXISTS leads_notify_insert ON leads;
DROP TRIGGER IF EXISTS follow_ups_notify_insert ON follow_ups;
DROP TRIGGER IF EXISTS installments_notify_overdue ON installments;

CREATE TRIGGER leads_notify_insert AFTER INSERT ON leads
  FOR EACH ROW EXECUTE FUNCTION notify_new_lead();

CREATE TRIGGER follow_ups_notify_insert AFTER INSERT ON follow_ups
  FOR EACH ROW EXECUTE FUNCTION notify_follow_up_assigned();

CREATE TRIGGER installments_notify_overdue AFTER UPDATE ON installments
  FOR EACH ROW EXECUTE FUNCTION notify_fee_overdue();

-- ==================== STEP B: SCHEMA ADDITIONS (leads) ====================

ALTER TABLE leads ADD COLUMN IF NOT EXISTS temperature TEXT CHECK (temperature IN ('hot','warm','cold'));
ALTER TABLE leads ADD COLUMN IF NOT EXISTS budget NUMERIC;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS expected_joining_date DATE;

-- ==================== STEP C: REALIGN PIPELINE STAGES ====================

-- First, migrate existing rows to new status values
UPDATE leads SET status = 'new_lead' WHERE status = 'new';
UPDATE leads SET status = 'follow_up' WHERE status = 'follow_up_required';
UPDATE leads SET status = 'demo_booked' WHERE status = 'demo_scheduled';
UPDATE leads SET status = 'registration_pending' WHERE status = 'application_started';
UPDATE leads SET status = 'converted' WHERE status = 'admitted';
UPDATE leads SET status = 'lost' WHERE status IN ('not_interested', 'future_prospect');
UPDATE leads SET status = 'negotiation' WHERE status = 'interested';

-- Now alter the constraint
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_check CHECK (
  status IN (
    'new_lead', 'contacted', 'follow_up', 'demo_booked', 'demo_attended',
    'negotiation', 'registration_pending', 'fee_pending', 'converted', 'lost'
  )
);

-- ==================== STEP D: INSTITUTIONS MODULE ====================

CREATE TABLE IF NOT EXISTS institutions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('school','college')),
  address TEXT,
  city TEXT,
  contact_person TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  mou_status TEXT DEFAULT 'not_started' CHECK (mou_status IN ('not_started','in_discussion','signed','expired')),
  mou_expiry_date DATE,
  assigned_bdm_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS institution_meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  meeting_date TIMESTAMPTZ NOT NULL,
  notes TEXT,
  outcome TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS institution_follow_ups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','completed','overdue','cancelled')),
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add bdm to users role check
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (
  role IN ('owner','admin','counselor','faculty','accounts','reception','bdm')
);

-- Indexes for institutions
CREATE INDEX IF NOT EXISTS idx_institutions_bdm ON institutions(assigned_bdm_id);
CREATE INDEX IF NOT EXISTS idx_institutions_mou ON institutions(mou_status);
CREATE INDEX IF NOT EXISTS idx_institution_meetings_inst ON institution_meetings(institution_id);
CREATE INDEX IF NOT EXISTS idx_institution_follow_ups_inst ON institution_follow_ups(institution_id);
CREATE INDEX IF NOT EXISTS idx_institution_follow_ups_assigned ON institution_follow_ups(assigned_to);

-- RLS for institutions
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE institution_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE institution_follow_ups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS institutions_select ON institutions;
DROP POLICY IF EXISTS institutions_insert ON institutions;
DROP POLICY IF EXISTS institutions_update ON institutions;
DROP POLICY IF EXISTS institutions_delete ON institutions;

CREATE POLICY institutions_select ON institutions FOR SELECT USING (
  get_user_role() IN ('owner','admin') OR assigned_bdm_id = get_user_id()
);
CREATE POLICY institutions_insert ON institutions FOR INSERT WITH CHECK (
  get_user_role() IN ('owner','admin','bdm')
);
CREATE POLICY institutions_update ON institutions FOR UPDATE USING (
  get_user_role() IN ('owner','admin') OR assigned_bdm_id = get_user_id()
);
CREATE POLICY institutions_delete ON institutions FOR DELETE USING (
  get_user_role() IN ('owner','admin')
);

DROP POLICY IF EXISTS institution_meetings_select ON institution_meetings;
DROP POLICY IF EXISTS institution_meetings_insert ON institution_meetings;

CREATE POLICY institution_meetings_select ON institution_meetings FOR SELECT USING (
  EXISTS (SELECT 1 FROM institutions i WHERE i.id = institution_meetings.institution_id AND (
    get_user_role() IN ('owner','admin') OR i.assigned_bdm_id = get_user_id()
  ))
);
CREATE POLICY institution_meetings_insert ON institution_meetings FOR INSERT WITH CHECK (
  get_user_role() IN ('owner','admin','bdm')
);

DROP POLICY IF EXISTS institution_follow_ups_select ON institution_follow_ups;
DROP POLICY IF EXISTS institution_follow_ups_insert ON institution_follow_ups;
DROP POLICY IF EXISTS institution_follow_ups_update ON institution_follow_ups;

CREATE POLICY institution_follow_ups_select ON institution_follow_ups FOR SELECT USING (
  EXISTS (SELECT 1 FROM institutions i WHERE i.id = institution_follow_ups.institution_id AND (
    get_user_role() IN ('owner','admin') OR i.assigned_bdm_id = get_user_id() OR institution_follow_ups.assigned_to = get_user_id()
  ))
);
CREATE POLICY institution_follow_ups_insert ON institution_follow_ups FOR INSERT WITH CHECK (
  get_user_role() IN ('owner','admin','bdm')
);
CREATE POLICY institution_follow_ups_update ON institution_follow_ups FOR UPDATE USING (
  get_user_role() IN ('owner','admin') OR assigned_to = get_user_id()
);

-- ==================== STEP E: FEATURE PERMISSIONS + EXPENSES ====================

CREATE TABLE IF NOT EXISTS feature_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  feature_key TEXT NOT NULL,
  role TEXT,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  can_view BOOLEAN DEFAULT FALSE,
  can_edit BOOLEAN DEFAULT FALSE,
  granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(feature_key, role, user_id)
);

CREATE OR REPLACE FUNCTION has_feature_access(feature_key TEXT, user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users u WHERE u.id = user_id AND u.is_owner = TRUE
  ) OR EXISTS (
    SELECT 1 FROM feature_permissions fp
    WHERE fp.feature_key = has_feature_access.feature_key
      AND (fp.role = (SELECT role FROM users WHERE id = user_id) OR fp.user_id = user_id)
      AND fp.can_view = TRUE
  );
$$;

-- Log changes to feature_permissions in audit_logs
CREATE OR REPLACE FUNCTION log_feature_permission_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_data, new_data)
  VALUES (
    get_user_id(),
    CASE WHEN TG_OP = 'INSERT' THEN 'grant_feature_access'
         WHEN TG_OP = 'UPDATE' THEN 'update_feature_access'
         ELSE 'revoke_feature_access' END,
    'feature_permission',
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN row_to_json(OLD)::jsonb ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN row_to_json(NEW)::jsonb ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS feature_permissions_audit ON feature_permissions;
CREATE TRIGGER feature_permissions_audit AFTER INSERT OR UPDATE OR DELETE ON feature_permissions
  FOR EACH ROW EXECUTE FUNCTION log_feature_permission_change();

-- RLS for feature_permissions (owner only)
ALTER TABLE feature_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS feature_permissions_select ON feature_permissions;
DROP POLICY IF EXISTS feature_permissions_all ON feature_permissions;
CREATE POLICY feature_permissions_select ON feature_permissions FOR SELECT USING (
  get_user_role() IS NOT NULL
);
CREATE POLICY feature_permissions_all ON feature_permissions FOR ALL USING (
  get_user_role() = 'owner'
)
WITH CHECK (get_user_role() = 'owner');

-- Institute expenses table
CREATE TABLE IF NOT EXISTS institute_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL CHECK (category IN ('rent','salaries','electricity','marketing','misc')),
  amount NUMERIC(10,2) NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE institute_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS institute_expenses_select ON institute_expenses;
DROP POLICY IF EXISTS institute_expenses_insert ON institute_expenses;
DROP POLICY IF EXISTS institute_expenses_update ON institute_expenses;
DROP POLICY IF EXISTS institute_expenses_delete ON institute_expenses;

-- Gate through has_feature_access instead of hardcoded role
CREATE POLICY institute_expenses_select ON institute_expenses FOR SELECT USING (
  has_feature_access('expense_tracking', get_user_id())
);
CREATE POLICY institute_expenses_insert ON institute_expenses FOR INSERT WITH CHECK (
  has_feature_access('expense_tracking', get_user_id()) AND get_user_role() IN ('owner','admin','accounts')
);
CREATE POLICY institute_expenses_update ON institute_expenses FOR UPDATE USING (
  has_feature_access('expense_tracking', get_user_id()) AND get_user_role() IN ('owner','accounts')
);
CREATE POLICY institute_expenses_delete ON institute_expenses FOR DELETE USING (
  has_feature_access('expense_tracking', get_user_id()) AND get_user_role() = 'owner'
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON institute_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON institute_expenses(category);

-- ==================== UPDATE get_user_role to include bdm ====================
-- The existing function already works with the new role since it just queries the table