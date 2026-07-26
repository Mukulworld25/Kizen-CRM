import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const secret = req.headers.get('x-webhook-secret')
    if (!secret) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing x-webhook-secret header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check sheet_connections for matching secret
    const { data: conn, error: connError } = await supabase
      .from('sheet_connections')
      .select('*')
      .eq('webhook_secret', secret)
      .eq('is_active', true)
      .single()

    if (connError || !conn) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or inactive webhook secret' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const payload = await req.json()
    const { headers = [], rows = [], filename = conn.sheet_name } = payload

    if (!Array.isArray(headers) || !Array.isArray(rows)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid payload. headers and rows array required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Call process_intake_batch RPC
    const { data: result, error: rpcError } = await supabase.rpc('process_intake_batch', {
      p_section: conn.template_section,
      p_source: 'sheets_sync',
      p_filename: filename,
      p_headers: headers,
      p_rows: rows,
      p_uploaded_by: null,
    })

    if (rpcError) {
      return new Response(
        JSON.stringify({ success: false, error: rpcError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update last synced at timestamp
    await supabase
      .from('sheet_connections')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', conn.id)

    return new Response(JSON.stringify(result), {
      status: result?.success ? 200 : 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
