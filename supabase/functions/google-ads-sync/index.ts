import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function normalizePhone(raw?: string): string | null {
  if (!raw) return null
  const digits = raw.replace(/[^0-9]/g, '')
  if (!digits) return null
  // Standardize 10-digit Indian numbers or include country code
  if (digits.length === 10) return '+91' + digits
  if (digits.length === 12 && digits.startsWith('91')) return '+' + digits
  return digits.startsWith('+') ? digits : '+' + digits
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()

    // 1. Verify Google Key authentication
    const expectedKey = Deno.env.get('GOOGLE_ADS_WEBHOOK_KEY')
    const receivedKey = body?.google_key

    if (!expectedKey || receivedKey !== expectedKey) {
      console.warn('Unauthorized Google Ads webhook attempt')
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: Invalid google_key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Extract column data from user_column_data array
    const userColumnData = body.user_column_data ?? []
    let fullName = ''
    let rawPhone = ''
    let email = ''

    for (const item of userColumnData) {
      const colId = (item.column_id ?? '').toUpperCase()
      const val = item.string_value ?? ''
      if (colId === 'FULL_NAME' || colId === 'FIRST_NAME' || colId === 'NAME') {
        fullName = fullName ? `${fullName} ${val}`.trim() : val
      } else if (colId === 'LAST_NAME') {
        fullName = fullName ? `${fullName} ${val}`.trim() : val
      } else if (colId === 'PHONE_NUMBER' || colId === 'USER_PHONE' || colId === 'PHONE') {
        rawPhone = val
      } else if (colId === 'EMAIL' || colId === 'USER_EMAIL') {
        email = val
      }
    }

    const mobile = normalizePhone(rawPhone)
    if (!fullName && !mobile) {
      return new Response(
        JSON.stringify({ success: false, error: 'Bad Request: Missing name and phone number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Insert Lead
    const leadId = body.lead_id ?? 'N/A'
    const campaignId = body.campaign_id ?? 'N/A'
    const formId = body.form_id ?? 'N/A'

    const { data: insertedLead, error: insertErr } = await supabase
      .from('leads')
      .insert({
        full_name: fullName || 'Google Ads Lead',
        mobile: mobile || rawPhone,
        email: email || null,
        source: 'google_ads',
        source_sheet: 'Google Ads Lead Form',
        status: 'new',
        notes: `Auto-populated from Google Ads Lead Form (Form ID: ${formId}, Campaign ID: ${campaignId}, Lead ID: ${leadId})`,
      })
      .select()
      .single()

    if (insertErr) {
      console.error('Google Ads Lead Insert Error:', insertErr)
      await supabase.from('import_audit_log').insert({
        section: 'leads',
        filename_source: 'Google Ads Lead Form',
        row_count_attempted: 1,
        row_count_imported: 0,
        row_count_rejected_skipped: 1,
        template_matched: true,
        status: 'rejected',
        error_reason: insertErr.message,
      })
      return new Response(
        JSON.stringify({ success: false, error: insertErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Update audit log and ad_sync_connections
    await supabase.from('import_audit_log').insert({
      section: 'leads',
      filename_source: 'Google Ads Lead Form',
      row_count_attempted: 1,
      row_count_imported: 1,
      row_count_rejected_skipped: 0,
      template_matched: true,
      status: 'success',
    })

    await supabase
      .from('ad_sync_connections')
      .update({
        last_synced_at: new Date().toISOString(),
        sync_status: 'active',
      })
      .eq('platform', 'google_ads')

    return new Response(
      JSON.stringify({ success: true, message: 'Google Ads lead ingested successfully', lead: insertedLead }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Google Ads Sync Handler Error:', err)
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
