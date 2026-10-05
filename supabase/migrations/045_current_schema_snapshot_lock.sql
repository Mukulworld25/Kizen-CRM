-- ==============================================================================
-- 045_current_schema_snapshot_lock.sql
-- CANONICAL SCHEMA SNAPSHOT & LOCK
-- Generated: 2026-10-05T07:50:09.301Z
-- Database: bumjiykhgkgmqyynwtuh (Live Production)
-- Scope: users, institutions, leads, students, fees, installments, institute_expenses
-- 
-- GOING FORWARD: Every schema change must be a new versioned migration file
-- (046_..., 047_...), applied sequentially. NEVER execute ad-hoc scratch scripts
-- against the live database directly.
-- ==============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- -----------------------------------------------------------------------------
-- TABLE: public.users
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.users (
  id UUID DEFAULT uuid_generate_v4() NOT NULL,
  auth_id UUID,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL,
  is_owner BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_hod BOOLEAN DEFAULT false,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_auth_id_key;
ALTER TABLE public.users ADD CONSTRAINT users_auth_id_key UNIQUE (auth_id);
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE public.users ADD CONSTRAINT users_email_key UNIQUE (email);

DROP TRIGGER IF EXISTS users_guard_privileged_columns ON public.users;
CREATE TRIGGER users_guard_privileged_columns BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION guard_user_privileged_columns();
DROP TRIGGER IF EXISTS users_protect_owner_delete ON public.users;
CREATE TRIGGER users_protect_owner_delete BEFORE DELETE ON public.users FOR EACH ROW EXECUTE FUNCTION protect_owner_user_delete();

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_delete_owner_only" ON public.users;
CREATE POLICY "users_delete_owner_only" ON public.users
  FOR DELETE
  TO authenticated
  USING (is_owner())
;
DROP POLICY IF EXISTS "users_insert_owner_only" ON public.users;
CREATE POLICY "users_insert_owner_only" ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (is_owner())
;
DROP POLICY IF EXISTS "users_select_authenticated" ON public.users;
CREATE POLICY "users_select_authenticated" ON public.users
  FOR SELECT
  TO authenticated
  USING ((auth.uid() IS NOT NULL))
;
DROP POLICY IF EXISTS "users_update_owner_only" ON public.users;
CREATE POLICY "users_update_owner_only" ON public.users
  FOR UPDATE
  TO authenticated
  USING (is_owner())
  WITH CHECK (is_owner())
;


-- -----------------------------------------------------------------------------
-- TABLE: public.institutions
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.institutions (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  display_id TEXT,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  contact_person TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  gst_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  type TEXT,
  mou_status TEXT DEFAULT 'not_started'::text,
  mou_expiry_date DATE,
  assigned_bdm_id UUID,
  CONSTRAINT institutions_pkey PRIMARY KEY (id)
);

ALTER TABLE public.institutions DROP CONSTRAINT IF EXISTS institutions_assigned_bdm_fkey;
ALTER TABLE public.institutions ADD CONSTRAINT institutions_assigned_bdm_fkey FOREIGN KEY (assigned_bdm_id) REFERENCES users(id);

DROP TRIGGER IF EXISTS trg_institutions_display_id ON public.institutions;
CREATE TRIGGER trg_institutions_display_id BEFORE INSERT ON public.institutions FOR EACH ROW EXECUTE FUNCTION generate_display_id();

ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_staff_only" ON public.institutions;
CREATE POLICY "authenticated_staff_only" ON public.institutions
  FOR ALL
  TO authenticated
  USING ((auth.uid() IS NOT NULL))
  WITH CHECK ((auth.uid() IS NOT NULL))
;


-- -----------------------------------------------------------------------------
-- TABLE: public.leads
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.leads (
  id UUID DEFAULT uuid_generate_v4() NOT NULL,
  full_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  email TEXT,
  parent_name TEXT,
  parent_contact TEXT,
  city TEXT,
  school_college TEXT,
  class_year TEXT,
  graduation_year INTEGER,
  graduation_degree TEXT,
  interested_course_id UUID,
  source TEXT,
  assigned_counselor_id UUID,
  status TEXT DEFAULT 'new_lead'::text,
  priority TEXT DEFAULT 'medium'::text,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  temperature TEXT,
  budget NUMERIC,
  expected_joining_date DATE,
  lead_score INTEGER DEFAULT 0,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,
  display_id TEXT,
  counselor_name TEXT,
  hot_lead_status TEXT,
  pipeline_stage TEXT,
  interest_level TEXT,
  disposition TEXT,
  lead_date DATE DEFAULT CURRENT_DATE,
  tap_date DATE,
  days_to_first_contact INTEGER,
  call_status TEXT,
  referred_by_lead_id UUID,
  referral_code TEXT,
  source_sheet TEXT,
  referred_by_student_id UUID,
  followup_date_1 DATE,
  followup_remarks_1 TEXT,
  followup_date_2 DATE,
  followup_remarks_2 TEXT,
  followup_date_3 DATE,
  followup_remarks_3 TEXT,
  is_cold_flag BOOLEAN DEFAULT false,
  CONSTRAINT leads_pkey PRIMARY KEY (id)
);

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_assigned_counselor_id_fkey;
ALTER TABLE public.leads ADD CONSTRAINT leads_assigned_counselor_id_fkey FOREIGN KEY (assigned_counselor_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_created_by_fkey;
ALTER TABLE public.leads ADD CONSTRAINT leads_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_interested_course_id_fkey;
ALTER TABLE public.leads ADD CONSTRAINT leads_interested_course_id_fkey FOREIGN KEY (interested_course_id) REFERENCES courses(id) ON DELETE SET NULL;
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_source_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_source_check CHECK (((source IS NULL) OR (source = ANY (ARRAY['instagram'::text, 'facebook'::text, 'walk_in'::text, 'referral'::text, 'website'::text, 'whatsapp'::text, 'college_visit'::text, 'google_ads'::text, 'other'::text]))));
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_status_check CHECK (((status IS NULL) OR (status = ANY (ARRAY['new'::text, 'contacted'::text, 'follow_up_required'::text, 'demo_scheduled'::text, 'demo_attended'::text, 'interested'::text, 'negotiation'::text, 'application_started'::text, 'admitted'::text, 'lost'::text, 'not_interested'::text, 'future_prospect'::text, 'closed'::text, 'enrolled'::text, 'new_lead'::text, 'follow_up'::text, 'demo_booked'::text, 'registration_pending'::text, 'fee_pending'::text, 'converted'::text, 'pending'::text, 'unpicked'::text]))));

CREATE INDEX idx_leads_display_id ON public.leads USING btree (display_id);

DROP TRIGGER IF EXISTS leads_normalize_mobile ON public.leads;
CREATE TRIGGER leads_normalize_mobile BEFORE INSERT OR UPDATE OF mobile ON public.leads FOR EACH ROW EXECUTE FUNCTION normalize_lead_mobile();
DROP TRIGGER IF EXISTS trg_derive_lead_analytics ON public.leads;
CREATE TRIGGER trg_derive_lead_analytics BEFORE INSERT OR UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION derive_lead_analytics();
DROP TRIGGER IF EXISTS trg_handle_website_lead_dedup ON public.leads;
CREATE TRIGGER trg_handle_website_lead_dedup BEFORE INSERT ON public.leads FOR EACH ROW EXECUTE FUNCTION handle_website_lead_dedup();
DROP TRIGGER IF EXISTS trg_leads_display_id ON public.leads;
CREATE TRIGGER trg_leads_display_id BEFORE INSERT ON public.leads FOR EACH ROW EXECUTE FUNCTION generate_display_id();
DROP TRIGGER IF EXISTS trg_set_default_lead_date ON public.leads;
CREATE TRIGGER trg_set_default_lead_date BEFORE INSERT ON public.leads FOR EACH ROW EXECUTE FUNCTION set_default_lead_date();

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leads_delete" ON public.leads;
CREATE POLICY "leads_delete" ON public.leads
  FOR DELETE
  TO authenticated
  USING ((is_owner() OR (get_user_role() = ANY (ARRAY['owner'::text, 'admin'::text]))))
;
DROP POLICY IF EXISTS "leads_insert" ON public.leads;
CREATE POLICY "leads_insert" ON public.leads
  FOR INSERT
  TO authenticated
  WITH CHECK ((is_owner() OR (get_user_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'reception'::text, 'counselor'::text]))))
;
DROP POLICY IF EXISTS "leads_select" ON public.leads;
CREATE POLICY "leads_select" ON public.leads
  FOR SELECT
  TO authenticated
  USING ((is_owner() OR (get_user_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'reception'::text])) OR ((get_user_role() = 'counselor'::text) AND (assigned_counselor_id = get_user_id()))))
;
DROP POLICY IF EXISTS "leads_update" ON public.leads;
CREATE POLICY "leads_update" ON public.leads
  FOR UPDATE
  TO authenticated
  USING ((is_owner() OR (get_user_role() = ANY (ARRAY['owner'::text, 'admin'::text])) OR ((get_user_role() = 'counselor'::text) AND (assigned_counselor_id = get_user_id()))))
  WITH CHECK ((is_owner() OR (get_user_role() = ANY (ARRAY['owner'::text, 'admin'::text])) OR ((get_user_role() = 'counselor'::text) AND (assigned_counselor_id = get_user_id()))))
;


-- -----------------------------------------------------------------------------
-- TABLE: public.students
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.students (
  id UUID DEFAULT uuid_generate_v4() NOT NULL,
  lead_id UUID,
  student_code TEXT,
  full_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  email TEXT,
  course_id UUID,
  batch_id UUID,
  assigned_counselor_id UUID,
  faculty_id UUID,
  enrollment_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'active'::text,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  address TEXT,
  admission_date DATE,
  certification_status TEXT,
  city TEXT,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,
  student_id TEXT,
  parent_name TEXT,
  parent_contact TEXT,
  emergency_contact TEXT,
  photo_url TEXT,
  dob DATE,
  gender TEXT,
  school_college TEXT,
  roll_number TEXT,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE,
  referred_by_student_id UUID,
  referred_by_lead_id UUID,
  display_id TEXT,
  CONSTRAINT students_pkey PRIMARY KEY (id)
);

ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_student_code_key;
ALTER TABLE public.students ADD CONSTRAINT students_student_code_key UNIQUE (student_code);
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_assigned_counselor_id_fkey;
ALTER TABLE public.students ADD CONSTRAINT students_assigned_counselor_id_fkey FOREIGN KEY (assigned_counselor_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_batch_id_fkey;
ALTER TABLE public.students ADD CONSTRAINT students_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL;
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_course_id_fkey;
ALTER TABLE public.students ADD CONSTRAINT students_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL;
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_faculty_id_fkey;
ALTER TABLE public.students ADD CONSTRAINT students_faculty_id_fkey FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_lead_id_fkey;
ALTER TABLE public.students ADD CONSTRAINT students_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL;

CREATE INDEX idx_students_display_id ON public.students USING btree (display_id);
CREATE INDEX idx_students_student_id ON public.students USING btree (student_id);

DROP TRIGGER IF EXISTS students_normalize_mobile ON public.students;
CREATE TRIGGER students_normalize_mobile BEFORE INSERT OR UPDATE OF mobile ON public.students FOR EACH ROW EXECUTE FUNCTION normalize_lead_mobile();
DROP TRIGGER IF EXISTS trg_students_display_id ON public.students;
CREATE TRIGGER trg_students_display_id BEFORE INSERT ON public.students FOR EACH ROW EXECUTE FUNCTION generate_display_id();

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "students_delete" ON public.students;
CREATE POLICY "students_delete" ON public.students
  FOR DELETE
  TO authenticated
  USING (is_owner())
;
DROP POLICY IF EXISTS "students_insert" ON public.students;
CREATE POLICY "students_insert" ON public.students
  FOR INSERT
  TO authenticated
  WITH CHECK ((is_owner() OR (get_user_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'counselor'::text, 'reception'::text]))))
;
DROP POLICY IF EXISTS "students_select" ON public.students;
CREATE POLICY "students_select" ON public.students
  FOR SELECT
  TO authenticated
  USING ((is_owner() OR (get_user_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'counselor'::text, 'accounts'::text, 'reception'::text, 'faculty'::text, 'hod'::text]))))
;
DROP POLICY IF EXISTS "students_update" ON public.students;
CREATE POLICY "students_update" ON public.students
  FOR UPDATE
  TO authenticated
  USING ((is_owner() OR (get_user_role() = ANY (ARRAY['owner'::text, 'admin'::text]))))
  WITH CHECK ((is_owner() OR (get_user_role() = ANY (ARRAY['owner'::text, 'admin'::text]))))
;


-- -----------------------------------------------------------------------------
-- TABLE: public.fees
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.fees (
  id UUID DEFAULT uuid_generate_v4() NOT NULL,
  student_id UUID,
  course_id UUID,
  total_fee NUMERIC NOT NULL,
  discount NUMERIC DEFAULT 0,
  scholarship NUMERIC DEFAULT 0,
  registration_amount NUMERIC DEFAULT 0,
  amount_paid NUMERIC DEFAULT 0,
  gst_applicable BOOLEAN DEFAULT false,
  gst_percent NUMERIC DEFAULT 18,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  receipt_url TEXT,
  payment_status TEXT DEFAULT 'pending'::text,
  subject TEXT,
  duration TEXT,
  next_due_date DATE,
  next_due_amount NUMERIC,
  registration_date DATE,
  flag_reason TEXT,
  step6_flagged_fields TEXT[],
  pending_balance NUMERIC GENERATED ALWAYS AS ((((COALESCE(total_fee, (0)::numeric) - COALESCE(discount, (0)::numeric)) - COALESCE(scholarship, (0)::numeric)) - COALESCE(amount_paid, (0)::numeric))) STORED,
  net_fee NUMERIC GENERATED ALWAYS AS (((COALESCE(total_fee, (0)::numeric) - COALESCE(discount, (0)::numeric)) - COALESCE(scholarship, (0)::numeric))) STORED,
  CONSTRAINT fees_pkey PRIMARY KEY (id)
);

ALTER TABLE public.fees DROP CONSTRAINT IF EXISTS fees_student_id_key;
ALTER TABLE public.fees ADD CONSTRAINT fees_student_id_key UNIQUE (student_id);
ALTER TABLE public.fees DROP CONSTRAINT IF EXISTS fees_course_id_fkey;
ALTER TABLE public.fees ADD CONSTRAINT fees_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL;
ALTER TABLE public.fees DROP CONSTRAINT IF EXISTS fees_student_id_fkey;
ALTER TABLE public.fees ADD CONSTRAINT fees_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

ALTER TABLE public.fees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fees_delete" ON public.fees;
CREATE POLICY "fees_delete" ON public.fees
  FOR DELETE
  TO authenticated
  USING (is_owner())
;
DROP POLICY IF EXISTS "fees_insert" ON public.fees;
CREATE POLICY "fees_insert" ON public.fees
  FOR INSERT
  TO authenticated
  WITH CHECK ((is_owner() OR (get_user_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'accounts'::text, 'counselor'::text]))))
;
DROP POLICY IF EXISTS "fees_select" ON public.fees;
CREATE POLICY "fees_select" ON public.fees
  FOR SELECT
  TO authenticated
  USING ((is_owner() OR (get_user_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'accounts'::text, 'counselor'::text]))))
;
DROP POLICY IF EXISTS "fees_update" ON public.fees;
CREATE POLICY "fees_update" ON public.fees
  FOR UPDATE
  TO authenticated
  USING ((is_owner() OR (get_user_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'accounts'::text]))))
  WITH CHECK ((is_owner() OR (get_user_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'accounts'::text]))))
;


-- -----------------------------------------------------------------------------
-- TABLE: public.installments
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.installments (
  id UUID DEFAULT uuid_generate_v4() NOT NULL,
  fee_id UUID,
  student_id UUID,
  installment_number INTEGER NOT NULL,
  amount NUMERIC NOT NULL,
  due_date DATE,
  paid_date DATE,
  status TEXT DEFAULT 'pending'::text,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  payment_method TEXT,
  amount_paid NUMERIC DEFAULT 0,
  transaction_reference TEXT,
  recorded_by UUID,
  pending_balance NUMERIC DEFAULT 0,
  CONSTRAINT installments_pkey PRIMARY KEY (id)
);

ALTER TABLE public.installments DROP CONSTRAINT IF EXISTS uq_installments_fee_number;
ALTER TABLE public.installments ADD CONSTRAINT uq_installments_fee_number UNIQUE (fee_id, installment_number);
ALTER TABLE public.installments DROP CONSTRAINT IF EXISTS installments_fee_id_fkey;
ALTER TABLE public.installments ADD CONSTRAINT installments_fee_id_fkey FOREIGN KEY (fee_id) REFERENCES fees(id) ON DELETE CASCADE;
ALTER TABLE public.installments DROP CONSTRAINT IF EXISTS installments_student_id_fkey;
ALTER TABLE public.installments ADD CONSTRAINT installments_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "installments_delete" ON public.installments;
CREATE POLICY "installments_delete" ON public.installments
  FOR DELETE
  TO authenticated
  USING ((is_owner() OR (get_user_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'accounts'::text]))))
;
DROP POLICY IF EXISTS "installments_insert" ON public.installments;
CREATE POLICY "installments_insert" ON public.installments
  FOR INSERT
  TO authenticated
  WITH CHECK ((is_owner() OR (get_user_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'accounts'::text, 'counselor'::text]))))
;
DROP POLICY IF EXISTS "installments_select" ON public.installments;
CREATE POLICY "installments_select" ON public.installments
  FOR SELECT
  TO authenticated
  USING ((is_owner() OR (get_user_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'accounts'::text, 'counselor'::text]))))
;
DROP POLICY IF EXISTS "installments_update" ON public.installments;
CREATE POLICY "installments_update" ON public.installments
  FOR UPDATE
  TO authenticated
  USING ((is_owner() OR (get_user_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'accounts'::text, 'counselor'::text]))))
  WITH CHECK ((is_owner() OR (get_user_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'accounts'::text, 'counselor'::text]))))
;


-- -----------------------------------------------------------------------------
-- TABLE: public.institute_expenses
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.institute_expenses (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  display_id TEXT,
  institution_id UUID,
  category_id UUID,
  amount NUMERIC NOT NULL,
  description TEXT,
  expense_date DATE DEFAULT CURRENT_DATE NOT NULL,
  payment_method TEXT,
  recorded_by UUID,
  receipt_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT,
  category TEXT,
  created_by UUID,
  CONSTRAINT expenses_pkey PRIMARY KEY (id)
);

ALTER TABLE public.institute_expenses DROP CONSTRAINT IF EXISTS expenses_category_id_fkey;
ALTER TABLE public.institute_expenses ADD CONSTRAINT expenses_category_id_fkey FOREIGN KEY (category_id) REFERENCES expense_categories(id);
ALTER TABLE public.institute_expenses DROP CONSTRAINT IF EXISTS expenses_institution_id_fkey;
ALTER TABLE public.institute_expenses ADD CONSTRAINT expenses_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id);
ALTER TABLE public.institute_expenses DROP CONSTRAINT IF EXISTS expenses_recorded_by_fkey;
ALTER TABLE public.institute_expenses ADD CONSTRAINT expenses_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES users(id);
ALTER TABLE public.institute_expenses DROP CONSTRAINT IF EXISTS institute_expenses_created_by_fkey;
ALTER TABLE public.institute_expenses ADD CONSTRAINT institute_expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

DROP TRIGGER IF EXISTS trg_expenses_display_id ON public.institute_expenses;
CREATE TRIGGER trg_expenses_display_id BEFORE INSERT ON public.institute_expenses FOR EACH ROW EXECUTE FUNCTION generate_display_id();
DROP TRIGGER IF EXISTS trg_sync_institute_expenses ON public.institute_expenses;
CREATE TRIGGER trg_sync_institute_expenses BEFORE INSERT OR UPDATE ON public.institute_expenses FOR EACH ROW EXECUTE FUNCTION sync_institute_expenses_fields();

ALTER TABLE public.institute_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_staff_only" ON public.institute_expenses;
CREATE POLICY "authenticated_staff_only" ON public.institute_expenses
  FOR ALL
  TO authenticated
  USING ((auth.uid() IS NOT NULL))
  WITH CHECK ((auth.uid() IS NOT NULL))
;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
