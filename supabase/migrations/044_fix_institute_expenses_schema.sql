-- 044_fix_institute_expenses_schema.sql
-- Aligns institute_expenses with frontend contract: category, created_by, foreign keys, and triggers.

-- 1. Ensure category and created_by columns exist
ALTER TABLE public.institute_expenses ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.institute_expenses ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- 2. Ensure explicit foreign key constraint name matches frontend join hint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'institute_expenses_created_by_fkey'
  ) THEN
    ALTER TABLE public.institute_expenses 
    ADD CONSTRAINT institute_expenses_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Trigger to maintain bidirectional sync between category <-> category_id and created_by <-> recorded_by
CREATE OR REPLACE FUNCTION public.sync_institute_expenses_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync created_by and recorded_by
  IF NEW.created_by IS NOT NULL AND NEW.recorded_by IS NULL THEN
    NEW.recorded_by := NEW.created_by;
  ELSIF NEW.recorded_by IS NOT NULL AND NEW.created_by IS NULL THEN
    NEW.created_by := NEW.recorded_by;
  END IF;

  -- Sync category and category_id
  IF NEW.category IS NOT NULL AND NEW.category_id IS NULL THEN
    SELECT id INTO NEW.category_id
    FROM public.expense_categories
    WHERE LOWER(name) = LOWER(NEW.category)
       OR LOWER(REPLACE(name, ' ', '_')) = LOWER(NEW.category)
    LIMIT 1;
  ELSIF NEW.category_id IS NOT NULL AND NEW.category IS NULL THEN
    SELECT LOWER(REPLACE(name, ' ', '_')) INTO NEW.category
    FROM public.expense_categories
    WHERE id = NEW.category_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_institute_expenses ON public.institute_expenses;
CREATE TRIGGER trg_sync_institute_expenses
  BEFORE INSERT OR UPDATE ON public.institute_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_institute_expenses_fields();

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
