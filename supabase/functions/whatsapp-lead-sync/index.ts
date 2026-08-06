import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-aisensy-signature',
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

async function verifyAiSensySignature(
  rawBody: Uint8Array,
  signatureHeader: string | null,
  secret: string
): Promise<boolean> {
  if (!signatureHeader) return false
  const expectedHex = signatureHeader.replace(/^sha256=/i, '').trim().toLowerCase()
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, rawBody)
  const hashArray = Array.from(new Uint8Array(signatureBuffer))
  const calculatedHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').toLowerCase()

  return calculatedHex === expectedHex
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

    const rawBody = new Uint8Array(await req.arrayBuffer())
    const secret = Deno.env.get('AISENSY_WEBHOOK_SECRET')
    const signatureHeader = req.headers.get('x-aisensy-signature') || req.headers.get('X-AiSensy-Signature')

    // If secret is set in env, verify HMAC signature
    if (secret) {
      const isValid = await verifyAiSensySignature(rawBody, signatureHeader, secret)
      if (!isValid) {
        console.warn('Unauthorized AiSensy webhook signature')
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized: Invalid signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const bodyText = new TextDecoder().decode(rawBody)
    const body = JSON.parse(bodyText)

    // Filter event type - process inbound user messages
    const eventType = body.type || body.topic
    if (eventType && eventType !== 'message.sender.user') {
      return new Response(
        JSON.stringify({ success: true, message: `Ignored event type: ${eventType}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const rawPhone = body.phone_number || body.from
    const userName = body.userName || body.contact_name || body.name
    const mobile = normalizePhone(rawPhone)

    if (!mobile) {
      return new Response(
        JSON.stringify({ success: false, error: 'Bad Request: Missing or invalid phone number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if lead already exists in DB by mobile number
    const { data: existingLeads, error: searchErr } = await supabase
      .from('leads')
      .select('id')
      .eq('mobile', mobile)
      .limit(1)

    if (searchErr) {
      console.error('Lead search error:', searchErr)
    }

    if (existingLeads && existingLeads.length > 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'Existing lead found. Inbound WhatsApp message skipped.', lead_id: existingLeads[0].id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Insert new lead for unknown number
    const messageText = body.message?.text || body.message_content?.text || ''
    const noteText = `Auto-created from inbound WhatsApp message via AiSensy${messageText ? `: "${messageText.substring(0, 200)}"` : ''}`

    const { data: insertedLead, error: insertErr } = await supabase
      .from('leads')
      .insert({
        full_name: userName || 'WhatsApp Lead',
        mobile: mobile,
        source: 'whatsapp',
        source_sheet: 'WhatsApp AiSensy',
        status: 'new',
        notes: noteText,
      })
      .select()
      .single()

    if (insertErr) {
      console.error('WhatsApp Lead Insert Error:', insertErr)
      await supabase.from('import_audit_log').insert({
        section: 'leads',
        filename_source: 'WhatsApp AiSensy',
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

    // Log success in audit log
    await supabase.from('import_audit_log').insert({
      section: 'leads',
      filename_source: 'WhatsApp AiSensy',
      row_count_attempted: 1,
      row_count_imported: 1,
      row_count_rejected_skipped: 0,
      template_matched: true,
      status: 'success',
    })

    // Update ad_sync_connections for platform 'whatsapp'
    await supabase
      .from('ad_sync_connections')
      .update({
        last_synced_at: new Date().toISOString(),
        sync_status: 'active',
      })
      .eq('platform', 'whatsapp')

    return new Response(
      JSON.stringify({ success: true, message: 'New WhatsApp lead ingested successfully', lead: insertedLead }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('WhatsApp Sync Handler Error:', err)
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
