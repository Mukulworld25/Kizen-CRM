-- 025_leads_sheet_columns.sql
-- Add missing columns to match "Leads for Kizen" and "Fees Tracker" sheets exactly

-- LEADS TABLE: Add sheet columns
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS tap_date DATE;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS call_status TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS disposition TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS followup_date_1 DATE;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS followup_remarks_1 TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS followup_date_2 DATE;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS followup_remarks_2 TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS followup_date_3 DATE;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS followup_remarks_3 TEXT;

-- FEES TABLE: Add registration_date column
ALTER TABLE public.fees ADD COLUMN IF NOT EXISTS registration_date DATE;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'leads' 
  AND column_name IN ('tap_date','call_status','disposition','followup_date_1','followup_date_2','followup_date_3')
ORDER BY column_name;
