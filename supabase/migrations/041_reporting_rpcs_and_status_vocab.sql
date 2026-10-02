-- =============================================================================
-- Migration 041: Missing reporting RPCs + lead status vocabulary + notification scoping
-- (Renumbered from 037, aligned with live schema and search_path pinning)
--
-- Fixes audit findings:
--   #41 Reports.tsx get_lead_pipeline_stages() and get_lead_source_counts().
--   #42 compute_lead_scores() implementation.
--   #45 leads.status CHECK constraint widened to full operational vocabulary.
--   #20 search_path pinning on get_monthly_financial_health and reporting RPCs.
--   #47 notifications table scoping to self-or-owner read/write.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Widen leads.status to the union of all vocabularies in use.
-- ---------------------------------------------------------------------------
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_status_check CHECK (
  status IS NULL OR status IN (
    -- legacy (001_schema.sql)
    'new','contacted','follow_up_required','demo_scheduled','demo_attended',
    'interested','negotiation','application_started','admitted','lost',
    'not_interested','future_prospect','closed','enrolled',
    -- current app vocabulary (types/index.ts)
    'new_lead','follow_up','demo_booked','registration_pending','fee_pending','converted',
    -- introduced by 020_relax_status_constraints.sql
    'pending','unpicked'
  )
);

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_source_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_source_check CHECK (
  source IS NULL OR source IN (
    'instagram','facebook','walk_in','referral','website',
    'whatsapp','college_visit','google_ads','other'
  )
);

-- ---------------------------------------------------------------------------
-- 2. get_lead_pipeline_stages - lead funnel for the Reports page.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_lead_pipeline_stages(text, text);
DROP FUNCTION IF EXISTS public.get_lead_pipeline_stages(timestamptz, timestamptz);

CREATE OR REPLACE FUNCTION public.get_lead_pipeline_stages(
  p_start timestamptz DEFAULT NULL,
  p_end timestamptz DEFAULT NULL
)
RETURNS TABLE(status text, count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(l.status, 'new_lead')::text AS status, COUNT(*)::bigint
    FROM public.leads l
   WHERE l.is_deleted = false
     AND (p_start IS NULL OR l.created_at >= p_start)
     AND (p_end   IS NULL OR l.created_at <= p_end)
   GROUP BY COALESCE(l.status, 'new_lead')
   ORDER BY 2 DESC;
$$;

-- ---------------------------------------------------------------------------
-- 3. get_lead_source_counts - lead source breakdown for the Reports page.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_lead_source_counts(text, text);
DROP FUNCTION IF EXISTS public.get_lead_source_counts(timestamptz, timestamptz);

CREATE OR REPLACE FUNCTION public.get_lead_source_counts(
  p_start timestamptz DEFAULT NULL,
  p_end timestamptz DEFAULT NULL
)
RETURNS TABLE(name text, value bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(l.source, 'other')::text AS name, COUNT(*)::bigint
    FROM public.leads l
   WHERE l.is_deleted = false
     AND (p_start IS NULL OR l.created_at >= p_start)
     AND (p_end   IS NULL OR l.created_at <= p_end)
   GROUP BY COALESCE(l.source, 'other')
   ORDER BY 2 DESC;
$$;

-- ---------------------------------------------------------------------------
-- 4. compute_lead_scores - recompute leads.lead_score (0-100).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.compute_lead_scores()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.leads l
     SET lead_score = LEAST(100, GREATEST(0,
            (CASE WHEN l.temperature = 'hot'   THEN 35
                  WHEN l.temperature = 'warm' THEN 22
                  ELSE 5 END)
          + (CASE WHEN l.status IN ('new_lead','new') THEN 20 ELSE 0 END)
          + (CASE WHEN l.status IN ('demo_attended','negotiation','registration_pending','interested') THEN 25 ELSE 0 END)
          + (CASE WHEN l.status IN ('converted','admitted','enrolled') THEN 40 ELSE 0 END)
          + (CASE WHEN EXISTS (SELECT 1 FROM public.follow_ups f
                               WHERE f.lead_id = l.id AND f.status = 'pending') THEN 10
                  ELSE 0 END)
          - (CASE WHEN l.created_at < now() - interval '30 days' THEN 15 ELSE 0 END)
     ))
   WHERE l.is_deleted = false;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Pin search_path on get_monthly_financial_health (#20)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_monthly_financial_health') THEN
    ALTER FUNCTION public.get_monthly_financial_health(text, text) SET search_path = public;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 6. Scope notifications table to self or owner (#47)
-- ---------------------------------------------------------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_staff_only" ON public.notifications;
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete" ON public.notifications;

CREATE POLICY notifications_select ON public.notifications FOR SELECT TO authenticated
  USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
    OR is_owner()
  );

CREATE POLICY notifications_insert ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
    OR is_owner()
  );

CREATE POLICY notifications_update ON public.notifications FOR UPDATE TO authenticated
  USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
    OR is_owner()
  );

CREATE POLICY notifications_delete ON public.notifications FOR DELETE TO authenticated
  USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
    OR is_owner()
  );

GRANT EXECUTE ON FUNCTION public.get_lead_pipeline_stages(timestamptz, timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_lead_source_counts(timestamptz, timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.compute_lead_scores() TO authenticated, service_role;

COMMIT;
