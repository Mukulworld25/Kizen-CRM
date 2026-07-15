-- =================================================================
-- KIZEN CRM — Soft Delete Migration
-- RUN THIS IN SUPABASE SQL EDITOR
-- =================================================================

-- Add soft-delete columns to all deletable tables
ALTER TABLE IF EXISTS public.leads
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE IF EXISTS public.students
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE IF EXISTS public.institutions
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE IF EXISTS public.institute_expenses
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Create indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_leads_is_deleted ON public.leads(is_deleted) WHERE is_deleted = true;
CREATE INDEX IF NOT EXISTS idx_students_is_deleted ON public.students(is_deleted) WHERE is_deleted = true;
CREATE INDEX IF NOT EXISTS idx_institutions_is_deleted ON public.institutions(is_deleted) WHERE is_deleted = true;
CREATE INDEX IF NOT EXISTS idx_institute_expenses_is_deleted ON public.institute_expenses(is_deleted) WHERE is_deleted = true;

-- Verify
SELECT 'Soft delete migration complete' AS status;
SELECT table_name, column_name FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('leads','students','institutions','institute_expenses')
  AND column_name IN ('is_deleted','deleted_at')
ORDER BY table_name, column_name;