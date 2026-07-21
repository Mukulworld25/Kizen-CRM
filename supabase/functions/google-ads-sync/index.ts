import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check ad_sync_connections for Google Ads
    const { data: conn } = await supabase
      .from('ad_sync_connections')
      .select('*')
      .eq('platform', 'google_ads')
      .single()

    if (!conn || !conn.access_token || !conn.is_active) {
      // Log attempt to import_audit_log
      await supabase.from('import_audit_log').insert({
        section: 'leads',
        filename_source: 'Google Ads API',
        row_count_attempted: 0,
        row_count_imported: 0,
        row_count_rejected_skipped: 0,
        template_matched: false,
        status: 'rejected',
        error_reason: 'Google Ads integration not yet authorized. Pending API approval and developer token configuration.',
      })

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Google Ads integration not yet authorized. Pending API approval and developer token configuration.',
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Wired intake pipeline placeholder for post-approval
    return new Response(
      JSON.stringify({ success: true, message: 'Google Ads sync completed (placeholder)' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
