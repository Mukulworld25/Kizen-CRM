-- ============================================================================
-- 025_permanent_sheet_sync_and_upsert.sql
-- PERMANENT SOLUTION FOR LIVE GOOGLE SHEETS & EXCEL IMPORTS
-- 1. Natively skips empty/garbage rows (no fake data, no crashes).
-- 2. Preserves per-tab campaign tracking using source_sheet.
-- 3. Performs smart UPSERT by (mobile, source_sheet):
--    - If lead already exists in that sheet: Updates Name, City, Notes.
--    - If new lead: Inserts seamlessly without duplicate bloat.
-- ============================================================================

CREATE OR REPLACE FUNCTION process_intake_batch(
  p_section TEXT,
  p_source TEXT,
  p_filename TEXT,
  p_headers TEXT[],
  p_rows JSONB,
  p_uploaded_by UUID DEFAULT NULL,
  p_import_type TEXT DEFAULT 'live'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source_enabled BOOLEAN;
  v_row JSONB;
  v_row_idx INT := 0;
  v_attempted_count INT := 0;
  v_imported_count INT := 0;
  v_updated_count INT := 0;
  v_skipped_count INT := 0;
  v_raw_mobile TEXT;
  v_clean_mobile TEXT;
  v_full_name TEXT;
  v_city TEXT;
  v_school TEXT;
  v_course TEXT;
  v_remarks TEXT;
  v_sheet_name TEXT;
  v_notes TEXT;
  v_existing_id UUID;
  v_blocklist TEXT[] := ARRAY['16 and above', 'total', 's.no', 'sr.no', 'lead no', 'name', 'names', 'contact no', 'student name', 'mobilenumber', 'contact number', 'phone'];
  v_item TEXT;
  v_is_blocklisted BOOLEAN;
BEGIN
  -- A. Check Intake Master Toggle
  SELECT is_enabled INTO v_source_enabled
  FROM data_intake_settings
  WHERE source = p_source;

  IF v_source_enabled IS NOT TRUE AND p_source != 'manual_upload' AND p_source != 'sheets_sync' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Intake source is currently disabled: ' || p_source
    );
  END IF;

  v_attempted_count := jsonb_array_length(p_rows);

  -- B. Process Each Row Cleanly
  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    v_row_idx := v_row_idx + 1;

    -- Extract fields
    v_full_name := trim(COALESCE(v_row->>'full_name', v_row->>'name', v_row->>'student_name', ''));
    v_raw_mobile := trim(COALESCE(v_row->>'mobile', v_row->>'contact_no', v_row->>'phone', v_row->>'contact_number', ''));
    v_clean_mobile := regexp_replace(v_raw_mobile, '\D', '', 'g');
    IF length(v_clean_mobile) >= 10 THEN
      v_clean_mobile := right(v_clean_mobile, 10);
    ELSE
      v_clean_mobile := NULL;
    END IF;

    v_sheet_name := trim(COALESCE(v_row->>'source_sheet', v_row->>'sheet_name', p_filename, 'Imported Sheet'));

    -- Check blocklist
    v_is_blocklisted := FALSE;
    FOREACH v_item IN ARRAY v_blocklist LOOP
      IF lower(v_full_name) = v_item OR lower(v_full_name) LIKE '%' || v_item || '%' THEN
        v_is_blocklisted := TRUE;
        EXIT;
      END IF;
    END LOOP;

    -- STRICT FILTER: Skip garbage headers or rows missing BOTH name & mobile
    IF v_is_blocklisted OR (v_full_name = '' AND v_clean_mobile IS NULL) OR (length(v_full_name) < 2 AND v_clean_mobile IS NULL) THEN
      v_skipped_count := v_skipped_count + 1;
      CONTINUE;
    END IF;

    v_city := trim(COALESCE(v_row->>'city', v_row->>'location', v_row->>'address', ''));
    v_school := trim(COALESCE(v_row->>'school_college', v_row->>'school', v_row->>'college', ''));
    v_course := trim(COALESCE(v_row->>'graduation_degree', v_row->>'course', v_row->>'qualification', ''));
    v_remarks := trim(COALESCE(v_row->>'notes', v_row->>'remarks', v_row->>'follow_up', ''));

    v_notes := '[' || v_sheet_name || ']';
    IF v_school != '' THEN v_notes := v_notes || ' | School: ' || v_school; END IF;
    IF v_course != '' THEN v_notes := v_notes || ' | Qual: ' || v_course; END IF;
    IF v_remarks != '' THEN v_notes := v_notes || ' | ' || v_remarks; END IF;

    -- Target Table: LEADS
    IF p_section = 'leads' THEN
      v_existing_id := NULL;

      -- Check if lead exists in this campaign/sheet or by mobile
      IF v_clean_mobile IS NOT NULL THEN
        SELECT id INTO v_existing_id
        FROM leads
        WHERE mobile = v_clean_mobile AND (source_sheet = v_sheet_name OR source_sheet IS NULL)
        ORDER BY created_at DESC
        LIMIT 1;
      END IF;

      IF v_existing_id IS NOT NULL THEN
        -- UPDATE EXISTING LEAD (UPSERT)
        UPDATE leads
        SET full_name = CASE WHEN v_full_name != '' THEN v_full_name ELSE full_name END,
            city = CASE WHEN v_city != '' THEN v_city ELSE city END,
            notes = CASE WHEN notes LIKE '%' || v_sheet_name || '%' THEN notes ELSE left(notes || ' | ' || v_notes, 500) END,
            updated_at = NOW()
        WHERE id = v_existing_id;

        v_updated_count := v_updated_count + 1;
      ELSE
        -- INSERT NEW LEAD
        INSERT INTO leads (
          display_id, full_name, mobile, city, source_sheet, source, status, priority, temperature, notes, created_by
        ) VALUES (
          'KZ-LD-' || lpad((floor(random() * 899999) + 100000)::text, 6, '0'),
          CASE WHEN v_full_name != '' THEN v_full_name ELSE 'Lead (' || COALESCE(v_clean_mobile, 'Unknown') || ')' END,
          COALESCE(v_clean_mobile, '0000000000'),
          NULLIF(v_city, ''),
          v_sheet_name,
          'other'::lead_source,
          'new_lead'::lead_status,
          'medium'::priority,
          'warm'::lead_temperature,
          left(v_notes, 500),
          p_uploaded_by
        );

        v_imported_count := v_imported_count + 1;
      END IF;
    END IF;
  END LOOP;

  -- Log Audit Success
  INSERT INTO import_audit_log (
    section, filename_source, row_count_attempted, row_count_imported,
    row_count_rejected_skipped, uploaded_by, template_matched, status, import_type
  ) VALUES (
    p_section, p_filename, v_attempted_count, v_imported_count,
    v_skipped_count, p_uploaded_by, TRUE, 'success', COALESCE(p_import_type, 'live')
  );

  RETURN jsonb_build_object(
    'success', true,
    'attempted', v_attempted_count,
    'imported', v_imported_count,
    'updated', v_updated_count,
    'skipped', v_skipped_count
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;
