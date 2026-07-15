-- =================================================================
-- KIZEN CRM — Full Schema Migration (Steps B–G)
-- RUN THIS ENTIRE FILE IN SUPABASE SQL EDITOR
-- =================================================================

-- ═══════════════════════════════════════════════════════════════
-- STEP B — leads table additions
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE IF EXISTS public.leads
  ADD COLUMN IF NOT EXISTS temperature text,
  ADD COLUMN IF NOT EXISTS budget numeric,
  ADD COLUMN IF NOT EXISTS expected_joining_date date;

-- Drop existing constraint if it exists, re-add with new values
ALTER TABLE IF EXISTS public.leads DROP CONSTRAINT IF EXISTS leads_temperature_check;
ALTER TABLE IF EXISTS public.leads ADD CONSTRAINT leads_temperature_check
  CHECK (temperature = ANY (ARRAY['hot', 'warm', 'cold']));

-- ═══════════════════════════════════════════════════════════════
-- STEP C — realign pipeline stages
-- Replace old status check constraint with the full pipeline
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE IF EXISTS public.leads DROP CONSTRAINT IF EXISTS leads_status_check;

-- Add new constraint with client's stage names and order
ALTER TABLE IF EXISTS public.leads ADD CONSTRAINT leads_status_check
  CHECK (status = ANY (ARRAY[
    'new_lead',
    'contacted',
    'follow_up',
    'demo_booked',
    'demo_attended',
    'negotiation',
    'registration_pending',
    'fee_pending',
    'converted',
    'lost'
  ]));

-- Migrate old status values to new equivalents
UPDATE public.leads SET status = 'new_lead'    WHERE status IN ('new', 'new lead');
UPDATE public.leads SET status = 'contacted'   WHERE status IN ('contacted');
UPDATE public.leads SET status = 'follow_up'   WHERE status IN ('follow_up', 'followup');
UPDATE public.leads SET status = 'demo_booked' WHERE status IN ('demo', 'demo_booked');
UPDATE public.leads SET status = 'negotiation' WHERE status IN ('negotiation', 'qualified');
UPDATE public.leads SET status = 'converted'   WHERE status IN ('converted', 'enrolled');
UPDATE public.leads SET status = 'lost'        WHERE status IN ('lost', 'closed');
-- Map any remaining to new_lead
UPDATE public.leads SET status = 'new_lead' WHERE status NOT IN (
  'new_lead','contacted','follow_up','demo_booked','demo_attended',
  'negotiation','registration_pending','fee_pending','converted','lost'
);

-- ═══════════════════════════════════════════════════════════════
-- STEP D — School & College CRM tables
-- ═══════════════════════════════════════════════════════════════
-- 1. Add 'bdm' to users.role check constraint
ALTER TABLE IF EXISTS public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE IF EXISTS public.users ADD CONSTRAINT users_role_check
  CHECK (role = ANY (ARRAY['owner','counselor','accounts','reception','bdm','faculty']));

-- 2. institutions table
CREATE TABLE IF NOT EXISTS public.institutions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  type          text NOT NULL CHECK (type IN ('school', 'college')),
  address       text,
  city          text,
  contact_person text,
  contact_phone  text,
  contact_email text,
  mou_status    text NOT NULL DEFAULT 'not_started'
                CHECK (mou_status IN ('not_started','in_discussion','signed','expired')),
  assigned_bdm_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 3. institution_meetings table
CREATE TABLE IF NOT EXISTS public.institution_meetings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  meeting_date  timestamptz NOT NULL,
  notes         text,
  outcome       text,
  created_by    uuid NOT NULL REFERENCES public.users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 4. institution_follow_ups table
CREATE TABLE IF NOT EXISTS public.institution_follow_ups (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  scheduled_at  timestamptz NOT NULL,
  notes         text,
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','completed','cancelled')),
  assigned_to   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- STEP E — Owner-only expense tracking
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.institute_expenses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category      text NOT NULL
                CHECK (category IN ('rent','salaries','electricity','marketing','misc')),
  amount        numeric NOT NULL CHECK (amount > 0),
  expense_date  date NOT NULL DEFAULT CURRENT_DATE,
  notes         text,
  created_by    uuid NOT NULL REFERENCES public.users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- STEP B–G — Add lead_score and ai_summary columns
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE IF EXISTS public.leads
  ADD COLUMN IF NOT EXISTS lead_score integer DEFAULT 0;

ALTER TABLE IF EXISTS public.lead_activities
  ADD COLUMN IF NOT EXISTS ai_summary text;

-- ═══════════════════════════════════════════════════════════════
-- RLS policies for new tables
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institute_expenses ENABLE ROW LEVEL SECURITY;

-- Institutions: BDM sees assigned, owner sees all
DROP POLICY IF EXISTS "BDM read own institutions" ON public.institutions;
CREATE POLICY "BDM read own institutions" ON public.institutions
  FOR SELECT USING (
    auth.uid() = assigned_bdm_id OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'owner')
  );

DROP POLICY IF EXISTS "Owner insert institutions" ON public.institutions;
CREATE POLICY "Owner insert institutions" ON public.institutions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'owner')
  );

DROP POLICY IF EXISTS "Owner update institutions" ON public.institutions;
CREATE POLICY "Owner update institutions" ON public.institutions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'owner')
  );

-- Institution meetings: same as institutions
DROP POLICY IF EXISTS "BDM read own meetings" ON public.institution_meetings;
CREATE POLICY "BDM read own meetings" ON public.institution_meetings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.institutions i WHERE i.id = institution_id AND (i.assigned_bdm_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'owner')))
  );

DROP POLICY IF EXISTS "Owner all meetings" ON public.institution_meetings;
CREATE POLICY "Owner all meetings" ON public.institution_meetings
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('owner','bdm'))
  );

-- Institution follow_ups
DROP POLICY IF EXISTS "BDM read own follow_ups" ON public.institution_follow_ups;
CREATE POLICY "BDM read own follow_ups" ON public.institution_follow_ups
  FOR SELECT USING (
    assigned_to = auth.uid() OR
    EXISTS (SELECT 1 FROM public.institutions i WHERE i.id = institution_id AND (i.assigned_bdm_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'owner')))
  );

-- Institute expenses: only owner
DROP POLICY IF EXISTS "Owner only expenses" ON public.institute_expenses;
CREATE POLICY "Owner only expenses" ON public.institute_expenses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'owner')
  );

-- Verify everything
SELECT 'Schema migration complete' AS status;
SELECT column_name FROM information_schema.columns WHERE table_name = 'leads' AND column_name IN ('lead_score','temperature','budget','expected_joining_date');
SELECT column_name FROM information_schema.columns WHERE table_name = 'lead_activities' AND column_name = 'ai_summary';
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('institutions','institution_meetings','institution_follow_ups','institute_expenses');
SELECT DISTINCT status FROM public.leads;
SELECT DISTINCT role FROM public.users;