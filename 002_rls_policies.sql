-- Kizen Education CRM — Row Level Security

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- USERS
CREATE POLICY users_select ON users FOR SELECT USING (
  auth_id = auth.uid() OR get_user_role() IN ('owner','admin')
);
CREATE POLICY users_insert ON users FOR INSERT WITH CHECK (
  get_user_role() = 'owner'
);
CREATE POLICY users_update ON users FOR UPDATE USING (
  get_user_role() = 'owner' OR auth_id = auth.uid()
);
CREATE POLICY users_delete ON users FOR DELETE USING (
  get_user_role() = 'owner' AND is_owner = FALSE
);

-- COURSES
CREATE POLICY courses_select ON courses FOR SELECT USING (
  get_user_role() IS NOT NULL
);
CREATE POLICY courses_insert ON courses FOR INSERT WITH CHECK (
  get_user_role() IN ('owner','admin')
);
CREATE POLICY courses_update ON courses FOR UPDATE USING (
  get_user_role() IN ('owner','admin')
);
CREATE POLICY courses_delete ON courses FOR DELETE USING (
  get_user_role() = 'owner'
);

-- BATCHES
CREATE POLICY batches_select ON batches FOR SELECT USING (
  get_user_role() IN ('owner','admin','counselor','accounts','reception')
  OR faculty_id = get_user_id()
);
CREATE POLICY batches_insert ON batches FOR INSERT WITH CHECK (
  get_user_role() IN ('owner','admin')
);
CREATE POLICY batches_update ON batches FOR UPDATE USING (
  get_user_role() IN ('owner','admin')
);
CREATE POLICY batches_delete ON batches FOR DELETE USING (
  get_user_role() = 'owner'
);

-- LEADS (accounts excluded per business rules)
CREATE POLICY leads_select ON leads FOR SELECT USING (
  get_user_role() IN ('owner','admin','reception')
  OR assigned_counselor_id = get_user_id()
);
CREATE POLICY leads_insert ON leads FOR INSERT WITH CHECK (
  get_user_role() IN ('owner','admin','counselor','reception')
);
CREATE POLICY leads_update ON leads FOR UPDATE USING (
  get_user_role() IN ('owner','admin')
  OR assigned_counselor_id = get_user_id()
);
CREATE POLICY leads_delete ON leads FOR DELETE USING (
  get_user_role() IN ('owner','admin')
);

-- LEAD ACTIVITIES
CREATE POLICY lead_activities_select ON lead_activities FOR SELECT USING (
  EXISTS (SELECT 1 FROM leads l WHERE l.id = lead_activities.lead_id AND (
    get_user_role() IN ('owner','admin','reception') OR l.assigned_counselor_id = get_user_id()
  ))
);
CREATE POLICY lead_activities_insert ON lead_activities FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM leads l WHERE l.id = lead_activities.lead_id AND (
    get_user_role() IN ('owner','admin') OR l.assigned_counselor_id = get_user_id()
  ))
);
CREATE POLICY lead_activities_update ON lead_activities FOR UPDATE USING (
  get_user_role() IN ('owner','admin') OR created_by = get_user_id()
);
CREATE POLICY lead_activities_delete ON lead_activities FOR DELETE USING (
  get_user_role() IN ('owner','admin')
);

-- FOLLOW UPS
CREATE POLICY follow_ups_select ON follow_ups FOR SELECT USING (
  get_user_role() IN ('owner','admin')
  OR assigned_to = get_user_id()
  OR EXISTS (SELECT 1 FROM leads l WHERE l.id = follow_ups.lead_id AND l.assigned_counselor_id = get_user_id())
);
CREATE POLICY follow_ups_insert ON follow_ups FOR INSERT WITH CHECK (
  get_user_role() IN ('owner','admin','counselor')
);
CREATE POLICY follow_ups_update ON follow_ups FOR UPDATE USING (
  get_user_role() IN ('owner','admin') OR assigned_to = get_user_id()
);
CREATE POLICY follow_ups_delete ON follow_ups FOR DELETE USING (
  get_user_role() IN ('owner','admin')
);

-- DOCUMENTS
CREATE POLICY documents_select ON documents FOR SELECT USING (
  (entity_type = 'lead' AND EXISTS (SELECT 1 FROM leads l WHERE l.id = documents.entity_id AND (get_user_role() IN ('owner','admin','reception') OR l.assigned_counselor_id = get_user_id())))
  OR (entity_type = 'student' AND EXISTS (SELECT 1 FROM students s WHERE s.id = documents.entity_id AND (get_user_role() IN ('owner','admin','counselor','accounts') OR s.faculty_id = get_user_id() OR EXISTS (SELECT 1 FROM leads l WHERE l.id = s.lead_id AND l.assigned_counselor_id = get_user_id()))))
);
CREATE POLICY documents_insert ON documents FOR INSERT WITH CHECK (
  get_user_role() IN ('owner','admin','counselor','faculty','accounts')
);
CREATE POLICY documents_delete ON documents FOR DELETE USING (
  get_user_role() IN ('owner','admin') OR uploaded_by = get_user_id()
);

-- STUDENTS
CREATE POLICY students_select ON students FOR SELECT USING (
  get_user_role() IN ('owner','admin','accounts','reception')
  OR faculty_id = get_user_id()
  OR EXISTS (SELECT 1 FROM leads l WHERE l.id = students.lead_id AND l.assigned_counselor_id = get_user_id())
);
CREATE POLICY students_insert ON students FOR INSERT WITH CHECK (
  get_user_role() IN ('owner','admin','counselor')
);
CREATE POLICY students_update ON students FOR UPDATE USING (
  get_user_role() IN ('owner','admin') OR faculty_id = get_user_id()
  OR EXISTS (SELECT 1 FROM leads l WHERE l.id = students.lead_id AND l.assigned_counselor_id = get_user_id())
);
CREATE POLICY students_delete ON students FOR DELETE USING (
  get_user_role() IN ('owner','admin')
);

-- ATTENDANCE
CREATE POLICY attendance_select ON attendance FOR SELECT USING (
  get_user_role() IN ('owner','admin','counselor','accounts')
  OR EXISTS (SELECT 1 FROM batches b WHERE b.id = attendance.batch_id AND b.faculty_id = get_user_id())
  OR EXISTS (SELECT 1 FROM students s WHERE s.id = attendance.student_id AND s.faculty_id = get_user_id())
);
CREATE POLICY attendance_insert ON attendance FOR INSERT WITH CHECK (
  get_user_role() IN ('owner','admin')
  OR EXISTS (SELECT 1 FROM batches b WHERE b.id = attendance.batch_id AND b.faculty_id = get_user_id())
);
CREATE POLICY attendance_update ON attendance FOR UPDATE USING (
  get_user_role() IN ('owner','admin')
  OR EXISTS (SELECT 1 FROM batches b WHERE b.id = attendance.batch_id AND b.faculty_id = get_user_id())
);

-- FEES
CREATE POLICY fees_select ON fees FOR SELECT USING (
  get_user_role() IN ('owner','admin','accounts')
);
CREATE POLICY fees_insert ON fees FOR INSERT WITH CHECK (
  get_user_role() IN ('owner','accounts')
);
CREATE POLICY fees_update ON fees FOR UPDATE USING (
  get_user_role() IN ('owner','accounts')
);
CREATE POLICY fees_delete ON fees FOR DELETE USING (
  get_user_role() = 'owner'
);

-- FEE PAYMENTS
CREATE POLICY fee_payments_select ON fee_payments FOR SELECT USING (
  get_user_role() IN ('owner','admin','accounts')
);
CREATE POLICY fee_payments_insert ON fee_payments FOR INSERT WITH CHECK (
  get_user_role() IN ('owner','accounts')
);
CREATE POLICY fee_payments_update ON fee_payments FOR UPDATE USING (
  get_user_role() IN ('owner','accounts')
);
CREATE POLICY fee_payments_delete ON fee_payments FOR DELETE USING (
  get_user_role() = 'owner'
);

-- INSTALLMENTS
CREATE POLICY installments_select ON installments FOR SELECT USING (
  get_user_role() IN ('owner','admin','accounts')
);
CREATE POLICY installments_insert ON installments FOR INSERT WITH CHECK (
  get_user_role() IN ('owner','accounts')
);
CREATE POLICY installments_update ON installments FOR UPDATE USING (
  get_user_role() IN ('owner','accounts')
);

-- TASKS
CREATE POLICY tasks_select ON tasks FOR SELECT USING (
  get_user_role() IN ('owner','admin') OR assigned_to = get_user_id() OR created_by = get_user_id()
);
CREATE POLICY tasks_insert ON tasks FOR INSERT WITH CHECK (
  get_user_role() IN ('owner','admin','counselor','faculty')
);
CREATE POLICY tasks_update ON tasks FOR UPDATE USING (
  get_user_role() IN ('owner','admin') OR assigned_to = get_user_id()
);
CREATE POLICY tasks_delete ON tasks FOR DELETE USING (
  get_user_role() IN ('owner','admin')
);

-- NOTIFICATIONS
CREATE POLICY notifications_select ON notifications FOR SELECT USING (
  user_id = get_user_id()
);
CREATE POLICY notifications_insert ON notifications FOR INSERT WITH CHECK (
  get_user_role() IN ('owner','admin') OR user_id = get_user_id()
);
CREATE POLICY notifications_update ON notifications FOR UPDATE USING (
  user_id = get_user_id()
);
CREATE POLICY notifications_delete ON notifications FOR DELETE USING (
  user_id = get_user_id() OR get_user_role() = 'owner'
);

-- AUDIT LOGS
CREATE POLICY audit_logs_select ON audit_logs FOR SELECT USING (
  is_owner() = TRUE
);
CREATE POLICY audit_logs_insert ON audit_logs FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND user_id = get_user_id()
);

-- SYSTEM SETTINGS
CREATE POLICY system_settings_select ON system_settings FOR SELECT USING (
  get_user_role() IS NOT NULL
);
CREATE POLICY system_settings_all ON system_settings FOR ALL USING (
  get_user_role() = 'owner'
);