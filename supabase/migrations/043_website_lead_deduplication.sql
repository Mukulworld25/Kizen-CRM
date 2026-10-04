-- Migration 043: Website Lead Deduplication Trigger (5-minute sliding window)
-- If a lead with source='website' and identical mobile number was inserted within the last 5 minutes,
-- append the new course interest (and message) to the existing lead's notes and cancel the duplicate insert.

CREATE OR REPLACE FUNCTION public.handle_website_lead_dedup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id uuid;
  v_existing_notes text;
  v_new_interest text;
  v_new_msg text;
  v_appended_notes text;
  v_clean_interest text;
BEGIN
  -- Only deduplicate leads with source='website' and non-empty mobile
  IF NEW.source = 'website' AND NEW.mobile IS NOT NULL AND NEW.mobile <> '' THEN
    SELECT id, notes INTO v_existing_id, v_existing_notes
    FROM public.leads
    WHERE mobile = NEW.mobile
      AND source = 'website'
      AND is_deleted = false
      AND created_at >= (NOW() - INTERVAL '5 minutes')
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      v_appended_notes := COALESCE(v_existing_notes, '[Website Inquiry]');

      -- Case A: NEW.notes contains "Interested in ..."
      IF NEW.notes ~* 'Interested in [^|]+' THEN
        v_new_interest := trim(substring(NEW.notes from '(?i)Interested in ([^|]+)'));
        v_clean_interest := v_new_interest;
        -- If existing notes doesn't contain this interest
        IF position(lower(v_clean_interest) in lower(v_appended_notes)) = 0 THEN
          IF v_appended_notes ~* 'Interested in ' OR v_appended_notes ~* 'Course Interest:' THEN
            v_appended_notes := v_appended_notes || ' & ' || v_clean_interest;
          ELSE
            v_appended_notes := v_appended_notes || ' | Interested in ' || v_clean_interest;
          END IF;
        END IF;
      -- Case B: NEW.notes contains "Course Interest: ..."
      ELSIF NEW.notes ~* 'Course Interest:\s*([^|]+)' THEN
        v_new_interest := trim(substring(NEW.notes from '(?i)Course Interest:\s*([^|]+)'));
        v_clean_interest := regexp_replace(v_new_interest, '^(?i)Interested in\s+', '');
        IF position(lower(v_clean_interest) in lower(v_appended_notes)) = 0 THEN
          IF v_appended_notes ~* 'Course Interest:' OR v_appended_notes ~* 'Interested in ' THEN
            v_appended_notes := v_appended_notes || ' & ' || v_clean_interest;
          ELSE
            v_appended_notes := v_appended_notes || ' | Course Interest: ' || v_clean_interest;
          END IF;
        END IF;
      END IF;

      -- Check for Message
      IF NEW.notes ~* 'Message:\s*(.+)$' THEN
        v_new_msg := trim(substring(NEW.notes from '(?i)Message:\s*(.+)$'));
        IF v_new_msg IS NOT NULL AND v_new_msg <> '' AND position(lower(v_new_msg) in lower(v_appended_notes)) = 0 THEN
          v_appended_notes := v_appended_notes || ' | Message: ' || v_new_msg;
        END IF;
      END IF;

      -- Update the existing lead
      UPDATE public.leads
      SET notes = v_appended_notes,
          email = COALESCE(leads.email, NEW.email),
          updated_at = NOW()
      WHERE id = v_existing_id;

      -- Cancel the insert for the duplicate row
      RETURN NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_website_lead_dedup ON public.leads;

CREATE TRIGGER trg_handle_website_lead_dedup
BEFORE INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.handle_website_lead_dedup();
