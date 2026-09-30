-- Migration 031: Column Label Overrides and Filter Bar Configuration
-- Feature 1: Editable Column Header Labels (display-only, never touches DB schema)
CREATE TABLE IF NOT EXISTS public.column_label_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_key TEXT NOT NULL,
    column_key TEXT NOT NULL,
    custom_label TEXT NOT NULL,
    updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_column_label_overrides UNIQUE (table_key, column_key)
);

-- Feature 2: Customizable Filter Bar
CREATE TABLE IF NOT EXISTS public.filter_bar_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_key TEXT NOT NULL UNIQUE,
    filter_order JSONB NOT NULL,
    updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.column_label_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.filter_bar_config ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.column_label_overrides TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.filter_bar_config TO authenticated;

-- Policies for column_label_overrides
DROP POLICY IF EXISTS "column_label_overrides_select" ON public.column_label_overrides;
CREATE POLICY "column_label_overrides_select" ON public.column_label_overrides
    FOR SELECT TO authenticated
    USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "column_label_overrides_insert" ON public.column_label_overrides;
CREATE POLICY "column_label_overrides_insert" ON public.column_label_overrides
    FOR INSERT TO authenticated
    WITH CHECK (public.is_owner());

DROP POLICY IF EXISTS "column_label_overrides_update" ON public.column_label_overrides;
CREATE POLICY "column_label_overrides_update" ON public.column_label_overrides
    FOR UPDATE TO authenticated
    USING (public.is_owner())
    WITH CHECK (public.is_owner());

DROP POLICY IF EXISTS "column_label_overrides_delete" ON public.column_label_overrides;
CREATE POLICY "column_label_overrides_delete" ON public.column_label_overrides
    FOR DELETE TO authenticated
    USING (public.is_owner());

-- Policies for filter_bar_config
DROP POLICY IF EXISTS "filter_bar_config_select" ON public.filter_bar_config;
CREATE POLICY "filter_bar_config_select" ON public.filter_bar_config
    FOR SELECT TO authenticated
    USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "filter_bar_config_insert" ON public.filter_bar_config;
CREATE POLICY "filter_bar_config_insert" ON public.filter_bar_config
    FOR INSERT TO authenticated
    WITH CHECK (public.is_owner());

DROP POLICY IF EXISTS "filter_bar_config_update" ON public.filter_bar_config;
CREATE POLICY "filter_bar_config_update" ON public.filter_bar_config
    FOR UPDATE TO authenticated
    USING (public.is_owner())
    WITH CHECK (public.is_owner());

DROP POLICY IF EXISTS "filter_bar_config_delete" ON public.filter_bar_config;
CREATE POLICY "filter_bar_config_delete" ON public.filter_bar_config
    FOR DELETE TO authenticated
    USING (public.is_owner());
