-- Kizen Education CRM — Schema (Corrected Order)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===== TABLES FIRST =====

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('owner','admin','counselor','faculty','accounts','reception')),
  is_owner BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  duration_hours INT,
  duration_days INT,
  total_fee NUMERIC(10,2),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  batch_name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  timing TEXT,
  total_seats INT DEFAULT 30,
  enrolled_count INT DEFAULT 0,
  faculty_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming','ongoing','completed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  email TEXT,
  parent_name TEXT,
  parent_contact TEXT,
  city TEXT,
  school_college TEXT,
  class_year TEXT,
  graduation_year INT,
  graduation_degree TEXT,
  interested_course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  source TEXT CHECK (source IN ('instagram','facebook','walk_in','referral','website','whatsapp','college_visit','other')),
  assigned_counselor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'new' CHECK (status IN (
    'new','contacted','follow_up_required','demo_scheduled',
    'demo_attended','interested','negotiation','application_started',
    'admitted','lost','not_interested','future_prospect'
  )),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE lead_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  activity_type TEXT CHECK (activity_type IN ('call','whatsapp','email','meeting','note','status_change')),
  description TEXT,
  duration_mins INT,
  outcome TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE follow_ups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  type TEXT CHECK (type IN ('call','whatsapp','email','meeting','demo')),
  notes TEXT,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','completed','overdue','cancelled')),
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT CHECK (entity_type IN ('lead','student')),
  entity_id UUID NOT NULL,
  doc_name TEXT NOT NULL,
  doc_url TEXT NOT NULL,
  doc_type TEXT,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  student_id TEXT UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT,
  mobile TEXT NOT NULL,
  parent_name TEXT,
  parent_contact TEXT,
  emergency_contact TEXT,
  address TEXT,
  city TEXT,
  photo_url TEXT,
  dob DATE,
  gender TEXT,
  school_college TEXT,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
  roll_number TEXT,
  admission_date DATE DEFAULT CURRENT_DATE,
  faculty_id UUID REFERENCES users(id) ON DELETE SET NULL,
  certification_status TEXT DEFAULT 'not_started' CHECK (
    certification_status IN ('not_started','in_progress','completed','issued')
  ),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT CHECK (status IN ('present','absent','late','holiday')),
  marked_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, batch_id, date)
);

CREATE TABLE fees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  total_fee NUMERIC(10,2) NOT NULL,
  discount NUMERIC(10,2) DEFAULT 0,
  scholarship NUMERIC(10,2) DEFAULT 0,
  registration_amount NUMERIC(10,2) DEFAULT 0,
  net_fee NUMERIC(10,2) GENERATED ALWAYS AS (total_fee - discount - scholarship) STORED,
  amount_paid NUMERIC(10,2) DEFAULT 0,
  pending_balance NUMERIC(10,2) GENERATED ALWAYS AS (total_fee - discount - scholarship - amount_paid) STORED,
  gst_applicable BOOLEAN DEFAULT FALSE,
  gst_percent NUMERIC(4,2) DEFAULT 18,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE fee_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fee_id UUID REFERENCES fees(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  payment_date DATE DEFAULT CURRENT_DATE,
  payment_method TEXT CHECK (payment_method IN ('cash','upi','bank_transfer','cheque','card','other')),
  transaction_id TEXT,
  receipt_number TEXT UNIQUE,
  notes TEXT,
  recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE installments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fee_id UUID REFERENCES fees(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  installment_number INT,
  amount NUMERIC(10,2),
  due_date DATE,
  paid_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid','overdue')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT CHECK (task_type IN ('follow_up','call','meeting','demo','admin','other')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
  due_date TIMESTAMPTZ,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  related_lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  related_student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','cancelled')),
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT CHECK (type IN ('follow_up','fee_due','new_lead','task','system')),
  related_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== INDEXES =====
CREATE INDEX idx_leads_counselor ON leads(assigned_counselor_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_mobile ON leads(mobile);
CREATE INDEX idx_leads_created_at ON leads(created_at);
CREATE INDEX idx_follow_ups_scheduled ON follow_ups(scheduled_at, status);
CREATE INDEX idx_follow_ups_assigned ON follow_ups(assigned_to);
CREATE INDEX idx_students_student_id ON students(student_id);
CREATE INDEX idx_students_batch ON students(batch_id);
CREATE INDEX idx_students_course ON students(course_id);
CREATE INDEX idx_fee_payments_student ON fee_payments(student_id);
CREATE INDEX idx_installments_due ON installments(due_date, status);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id) WHERE is_read = FALSE;
CREATE INDEX idx_lead_activities_lead ON lead_activities(lead_id);
CREATE INDEX idx_documents_entity ON documents(entity_type, entity_id);
CREATE INDEX idx_attendance_student_date ON attendance(student_id, date);

-- ===== SEQUENCES =====
CREATE SEQUENCE student_id_seq START 1;
CREATE SEQUENCE receipt_seq START 1;

-- ===== HELPER FUNCTIONS (AFTER tables exist) =====
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM users WHERE auth_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_user_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION is_owner()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(is_owner, FALSE) FROM users WHERE auth_id = auth.uid() LIMIT 1;
$$;