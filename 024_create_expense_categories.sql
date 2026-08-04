-- 024_create_expense_categories.sql

CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grant permissions for authenticated and anon users
ALTER TABLE public.expense_categories DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.expense_categories TO authenticated, service_role, anon;

-- Seed default categories
INSERT INTO public.expense_categories (name) VALUES
  ('Rent'),
  ('Salaries'),
  ('Electricity'),
  ('Marketing'),
  ('Coffee/ Milk/ Sugar'),
  ('Miscellaneous')
ON CONFLICT (name) DO NOTHING;
