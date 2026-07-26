-- Kizen CRM — Migration 013: Entity Linking + Historical Bulk Import

-- 1. Schema Additions: Add lead_id foreign key to institute_expenses and institutions
ALTER TABLE IF EXISTS institute_expenses ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS institutions ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_lead ON institute_expenses(lead_id);
CREATE INDEX IF NOT EXISTS idx_institutions_lead ON institutions(lead_id);

-- 2. Add import_type column to import_audit_log
ALTER TABLE IF EXISTS import_audit_log ADD COLUMN IF NOT EXISTS import_type TEXT DEFAULT 'live' CHECK (import_type IN ('live', 'historical_backfill'));

-- 3. Update data_templates optional columns to allow email & mobile in finance & institutions
UPDATE data_templates
SET optional_columns = '[{"name": "notes", "default": null}, {"name": "email", "default": null}, {"name": "mobile", "default": null}]'::jsonb
WHERE section = 'finance';

UPDATE data_templates
SET optional_columns = '[{"name": "address", "default": null}, {"name": "city", "default": null}, {"name": "contact_person", "default": null}, {"name": "contact_phone", "default": null}, {"name": "contact_email", "default": null}, {"name": "mou_status", "default": "not_started"}, {"name": "email", "default": null}, {"name": "mobile", "default": null}]'::jsonb
WHERE section = 'institutions';

-- 4. Updated RPC Function: process_intake_batch with lead_id auto-linking and p_import_type
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
  v_req_cols JSONB;
  v_opt_cols JSONB;
  v_dedup_keys JSONB;
  v_req_item TEXT;
  v_opt_item JSONB;
  v_opt_name TEXT;
  v_header TEXT;
  v_cleaned_headers TEXT[] := '{}';
  v_missing_req TEXT[] := '{}';
  v_unknown_cols TEXT[] := '{}';
  v_row JSONB;
  v_hash TEXT;
  v_hash_key_val TEXT;
  v_dedup_key TEXT;
  v_row_idx INT := 0;
  v_attempted_count INT := 0;
  v_imported_count INT := 0;
  v_skipped_count INT := 0;
  v_valid_headers TEXT[] := '{}';
  v_matched_lead_id UUID;
  v_search_email TEXT;
  v_search_mobile TEXT;
BEGIN
  -- A. Check Master Toggle
  SELECT is_enabled INTO v_source_enabled
  FROM data_intake_settings
  WHERE source = p_source;

  IF v_source_enabled IS NOT TRUE THEN
    INSERT INTO import_audit_log (
      section, filename_source, row_count_attempted, row_count_imported,
      row_count_rejected_skipped, uploaded_by, template_matched, status, error_reason, import_type
    ) VALUES (
      p_section, p_filename, jsonb_array_length(p_rows), 0, jsonb_array_length(p_rows),
      p_uploaded_by, FALSE, 'rejected', 'This intake source is currently turned off', COALESCE(p_import_type, 'live')
    );

    RETURN jsonb_build_object(
      'success', false,
      'error', 'This intake source is currently turned off'
    );
  END IF;

  -- B. Fetch Template
  SELECT required_columns, optional_columns, dedup_keys
  INTO v_req_cols, v_opt_cols, v_dedup_keys
  FROM data_templates
  WHERE section = p_section;

  IF v_req_cols IS NULL THEN
    INSERT INTO import_audit_log (
      section, filename_source, row_count_attempted, row_count_imported,
      row_count_rejected_skipped, uploaded_by, template_matched, status, error_reason, import_type
    ) VALUES (
      p_section, p_filename, jsonb_array_length(p_rows), 0, jsonb_array_length(p_rows),
      p_uploaded_by, FALSE, 'rejected', 'No template found for section: ' || p_section, COALESCE(p_import_type, 'live')
    );

    RETURN jsonb_build_object(
      'success', false,
      'error', 'No template found for section: ' || p_section
    );
  END IF;

  -- C. Header Validation (Exact Match)
  FOREACH v_header IN ARRAY p_headers LOOP
    v_cleaned_headers := array_append(v_cleaned_headers, lower(trim(v_header)));
  END LOOP;

  -- Check required columns
  FOR v_req_item IN SELECT jsonb_array_elements_text(v_req_cols) LOOP
    IF NOT (lower(trim(v_req_item)) = ANY(v_cleaned_headers)) THEN
      v_missing_req := array_append(v_missing_req, v_req_item);
    END IF;
    v_valid_headers := array_append(v_valid_headers, lower(trim(v_req_item)));
  END FOR;

  -- Build valid headers list with optional columns
  FOR v_opt_item IN SELECT jsonb_array_elements(v_opt_cols) LOOP
    v_opt_name := v_opt_item->>'name';
    IF v_opt_name IS NOT NULL THEN
      v_valid_headers := array_append(v_valid_headers, lower(trim(v_opt_name)));
    END IF;
  END FOR;

  -- Check for unexpected/unknown headers
  FOREACH v_header IN ARRAY v_cleaned_headers LOOP
    IF NOT (v_header = ANY(v_valid_headers)) THEN
      v_unknown_cols := array_append(v_unknown_cols, v_header);
    END IF;
  END LOOP;

  IF array_length(v_missing_req, 1) > 0 OR array_length(v_unknown_cols, 1) > 0 THEN
    DECLARE
      v_err TEXT := 'Header mismatch.';
    BEGIN
      IF array_length(v_missing_req, 1) > 0 THEN
        v_err := v_err || ' Missing required: ' || array_to_string(v_missing_req, ', ') || '.';
      END IF;
      IF array_length(v_unknown_cols, 1) > 0 THEN
        v_err := v_err || ' Unexpected columns: ' || array_to_string(v_unknown_cols, ', ') || '.';
      END IF;

      INSERT INTO import_audit_log (
        section, filename_source, row_count_attempted, row_count_imported,
        row_count_rejected_skipped, uploaded_by, template_matched, status, error_reason, import_type
      ) VALUES (
        p_section, p_filename, jsonb_array_length(p_rows), 0, jsonb_array_length(p_rows),
        p_uploaded_by, FALSE, 'rejected', v_err, COALESCE(p_import_type, 'live')
      );

      RETURN jsonb_build_object(
        'success', false,
        'error', v_err
      );
    END;
  END IF;

  -- D. Process Batch Rows
  v_attempted_count := jsonb_array_length(p_rows);

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    v_row_idx := v_row_idx + 1;

    -- Compute Dedup Hash
    v_hash_key_val := '';
    FOR v_dedup_key IN SELECT jsonb_array_elements_text(v_dedup_keys) LOOP
      v_hash_key_val := v_hash_key_val || ':' || COALESCE(trim(v_row->>v_dedup_key), '');
    END LOOP;
    v_hash := md5(p_section || v_hash_key_val);

    -- Check Deduplication
    IF EXISTS (SELECT 1 FROM import_hashes WHERE hash_value = v_hash) THEN
      v_skipped_count := v_skipped_count + 1;
      CONTINUE;
    END IF;

    -- Insert Into Target Table
    IF p_section = 'leads' THEN
      IF v_row->>'full_name' IS NULL OR trim(v_row->>'full_name') = '' OR
         v_row->>'mobile' IS NULL OR trim(v_row->>'mobile') = '' THEN
        RAISE EXCEPTION 'Row %: full_name and mobile are required.', v_row_idx;
      END IF;

      INSERT INTO leads (
        full_name, mobile, email, parent_name, parent_contact, city,
        school_college, class_year, graduation_year, graduation_degree,
        source, status, priority, notes, created_by
      ) VALUES (
        trim(v_row->>'full_name'),
        trim(v_row->>'mobile'),
        COALESCE(trim(v_row->>'email'), NULL),
        COALESCE(trim(v_row->>'parent_name'), NULL),
        COALESCE(trim(v_row->>'parent_contact'), NULL),
        COALESCE(trim(v_row->>'city'), NULL),
        COALESCE(trim(v_row->>'school_college'), NULL),
        COALESCE(trim(v_row->>'class_year'), NULL),
        (v_row->>'graduation_year')::INT,
        COALESCE(trim(v_row->>'graduation_degree'), NULL),
        COALESCE((v_row->>'source')::lead_source, 'website'::lead_source),
        COALESCE((v_row->>'status')::lead_status, 'new_lead'::lead_status),
        COALESCE((v_row->>'priority')::priority, 'medium'::priority),
        COALESCE(trim(v_row->>'notes'), NULL),
        p_uploaded_by
      );

    ELSIF p_section = 'finance' THEN
      IF v_row->>'category' IS NULL OR trim(v_row->>'category') = '' OR
         v_row->>'amount' IS NULL OR v_row->>'expense_date' IS NULL OR
         v_row->>'vendor' IS NULL OR trim(v_row->>'vendor') = '' THEN
        RAISE EXCEPTION 'Row %: category, amount, expense_date, and vendor are required.', v_row_idx;
      END IF;

      -- Relational Auto-Linking: Match lead_id by exact email or mobile
      v_matched_lead_id := NULL;
      v_search_email := COALESCE(trim(v_row->>'email'), NULL);
      v_search_mobile := COALESCE(trim(v_row->>'mobile'), NULL);

      IF v_search_email IS NOT NULL OR v_search_mobile IS NOT NULL THEN
        SELECT id INTO v_matched_lead_id
        FROM leads
        WHERE (v_search_email IS NOT NULL AND email IS NOT NULL AND lower(email) = lower(v_search_email))
           OR (v_search_mobile IS NOT NULL AND mobile IS NOT NULL AND mobile = v_search_mobile)
        ORDER BY created_at DESC
        LIMIT 1;
      END IF;

      INSERT INTO institute_expenses (
        category, amount, expense_date, vendor, notes, created_by, lead_id
      ) VALUES (
        trim(v_row->>'category'),
        (v_row->>'amount')::NUMERIC(10,2),
        (v_row->>'expense_date')::DATE,
        trim(v_row->>'vendor'),
        COALESCE(trim(v_row->>'notes'), NULL),
        p_uploaded_by,
        v_matched_lead_id
      );

    ELSIF p_section = 'institutions' THEN
      IF v_row->>'name' IS NULL OR trim(v_row->>'name') = '' OR
         v_row->>'type' IS NULL OR trim(v_row->>'type') = '' THEN
        RAISE EXCEPTION 'Row %: name and type are required.', v_row_idx;
      END IF;

      -- Relational Auto-Linking: Match lead_id by contact_email/email or contact_phone/mobile
      v_matched_lead_id := NULL;
      v_search_email := COALESCE(trim(COALESCE(v_row->>'contact_email', v_row->>'email')), NULL);
      v_search_mobile := COALESCE(trim(COALESCE(v_row->>'contact_phone', v_row->>'mobile')), NULL);

      IF v_search_email IS NOT NULL OR v_search_mobile IS NOT NULL THEN
        SELECT id INTO v_matched_lead_id
        FROM leads
        WHERE (v_search_email IS NOT NULL AND email IS NOT NULL AND lower(email) = lower(v_search_email))
           OR (v_search_mobile IS NOT NULL AND mobile IS NOT NULL AND mobile = v_search_mobile)
        ORDER BY created_at DESC
        LIMIT 1;
      END IF;

      INSERT INTO institutions (
        name, type, address, city, contact_person, contact_phone,
        contact_email, mou_status, assigned_bdm_id, lead_id
      ) VALUES (
        trim(v_row->>'name'),
        trim(v_row->>'type'),
        COALESCE(trim(v_row->>'address'), NULL),
        COALESCE(trim(v_row->>'city'), NULL),
        COALESCE(trim(v_row->>'contact_person'), NULL),
        COALESCE(trim(v_row->>'contact_phone'), NULL),
        COALESCE(trim(v_row->>'contact_email'), NULL),
        COALESCE(trim(v_row->>'mou_status'), 'not_started'),
        p_uploaded_by,
        v_matched_lead_id
      );
    END IF;

    -- Store Hash
    INSERT INTO import_hashes (hash_value) VALUES (v_hash);
    v_imported_count := v_imported_count + 1;
  END LOOP;

  -- E. Log Audit Success
  INSERT INTO import_audit_log (
    section, filename_source, row_count_attempted, row_count_imported,
    row_count_rejected_skipped, uploaded_by, template_matched, status, import_type
  ) VALUES (
    p_section, p_filename, v_attempted_count, v_imported_count,
    v_skipped_count, p_uploaded_by, TRUE, 'success', COALESCE(p_import_type, 'live')
  );

  -- Update last synced timestamp
  UPDATE data_intake_settings SET last_synced_at = NOW() WHERE source = p_source;

  RETURN jsonb_build_object(
    'success', true,
    'attempted', v_attempted_count,
    'imported', v_imported_count,
    'skipped', v_skipped_count
  );

EXCEPTION WHEN OTHERS THEN
  INSERT INTO import_audit_log (
    section, filename_source, row_count_attempted, row_count_imported,
    row_count_rejected_skipped, uploaded_by, template_matched, status, error_reason, import_type
  ) VALUES (
    p_section, p_filename, v_attempted_count, 0, v_attempted_count,
    p_uploaded_by, TRUE, 'rejected', SQLERRM, COALESCE(p_import_type, 'live')
  );

  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;
