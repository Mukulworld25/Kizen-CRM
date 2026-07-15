-- Kizen Education CRM — Fix missing RLS helper functions
-- Run this in Supabase Dashboard > SQL Editor

-- Helper: get current user's internal ID from auth.uid()
CREATE OR REPLACE FUNCTION public.get_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM users WHERE auth_id = auth.uid()
$$;

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM users WHERE auth_id = auth.uid()
$$;

-- Helper: check if current user is owner
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(is_owner, FALSE) FROM users WHERE auth_id = auth.uid()
$$;

-- Sequences needed by triggers
CREATE SEQUENCE IF NOT EXISTS public.student_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.receipt_seq START 1;