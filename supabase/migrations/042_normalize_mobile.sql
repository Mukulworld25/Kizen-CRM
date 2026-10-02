-- =============================================================================
-- Migration 042: Normalize lead/student mobile numbers on write
-- (Renumbered from 038)
--
-- Fixes audit finding #43: the edge functions (whatsapp / meta / google ads)
-- stored phones as '+91XXXXXXXXXX' while the DB helper and every import path
-- store bare 10-digit numbers. Because deduplication compares `mobile` for
-- equality, the webhook dedupe check NEVER matched an existing lead and every
-- inbound message created a duplicate.
--
-- Normalising on write means one canonical representation for every channel.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.normalize_lead_mobile()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_digits TEXT;
BEGIN
  IF NEW.mobile IS NULL OR trim(NEW.mobile) = '' THEN
    RETURN NEW;
  END IF;

  v_digits := regexp_replace(NEW.mobile, '[^0-9]', '', 'g');
  IF v_digits = '' THEN
    -- Non-numeric placeholder (e.g. the meta fallback 'meta_<leadgen_id>'):
    -- leave it untouched rather than destroying it.
    RETURN NEW;
  END IF;

  IF length(v_digits) = 12 AND v_digits LIKE '91%' THEN
    NEW.mobile := substring(v_digits FROM 3);
  ELSIF length(v_digits) > 10 THEN
    NEW.mobile := right(v_digits, 10);
  ELSE
    NEW.mobile := v_digits;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leads_normalize_mobile ON public.leads;
CREATE TRIGGER leads_normalize_mobile
  BEFORE INSERT OR UPDATE OF mobile ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.normalize_lead_mobile();

DROP TRIGGER IF EXISTS students_normalize_mobile ON public.students;
CREATE TRIGGER students_normalize_mobile
  BEFORE INSERT OR UPDATE OF mobile ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.normalize_lead_mobile();

-- Backfill existing rows. `SET mobile = mobile` includes the column in the SET
-- list, which is enough to fire the BEFORE UPDATE OF mobile trigger, so the
-- normalising logic lives in exactly one place.
UPDATE public.leads
   SET mobile = mobile
 WHERE length(regexp_replace(mobile, '[^0-9]', '', 'g')) > 10;

UPDATE public.students
   SET mobile = mobile
 WHERE length(regexp_replace(mobile, '[^0-9]', '', 'g')) > 10;

COMMIT;
