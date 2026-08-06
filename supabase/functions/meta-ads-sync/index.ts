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

async function verifyMetaSignature(
  rawBody: Uint8Array,
  signatureHeader: string | null,
  appSecret: string
): Promise<boolean> {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return false
  }

  const expectedHex = signatureHeader.substring(7).trim().toLowerCase()
  const encoder = new TextEncoder()
  const keyData = encoder.encode(appSecret)

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

  const url = new URL(req.url)

  // 1. Meta Webhook Verification (GET Request)
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')

    const verifyToken = Deno.env.get('META_WEBHOOK_VERIFY_TOKEN') ?? 'kizen_meta_lead_sync_token'

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('Meta Webhook Verified Successfully')
      return new Response(challenge, { status: 200 })
    } else {
      return new Response('Forbidden: Verification token mismatch', { status: 403 })
    }
  }

  // 2. Meta Lead Payload Ingestion (POST Request)
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check ad_sync_connections for Meta Ads connection
    const { data: conn } = await supabase
      .from('ad_sync_connections')
      .select('*')
      .eq('platform', 'meta')
      .maybeSingle()

    const accessToken = conn?.access_token || Deno.env.get('META_ACCESS_TOKEN')
    const appSecret = Deno.env.get('META_APP_SECRET') || conn?.app_secret

    // Read raw body bytes for signature verification
    const rawBodyBuffer = await req.arrayBuffer()
    const rawBodyBytes = new Uint8Array(rawBodyBuffer)
    const signatureHeader = req.headers.get('x-hub-signature-256')

    // Webhook Signature Verification Check
    if (appSecret || signatureHeader) {
      if (!appSecret) {
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized: META_APP_SECRET is not configured on server.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const isValidSignature = await verifyMetaSignature(rawBodyBytes, signatureHeader, appSecret)
      if (!isValidSignature) {
        console.error('Meta Webhook signature verification failed.')
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized: Invalid X-Hub-Signature-256 signature.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const bodyText = new TextDecoder().decode(rawBodyBytes)
    const body = JSON.parse(bodyText || '{}')

    // Check if this is a valid Meta leadgen webhook entry
    const entries = body.entry ?? []
    let importedCount = 0

    for (const entry of entries) {
      const changes = entry.changes ?? []
      for (const change of changes) {
        if (change.field === 'leadgen') {
          const leadgenId = change.value?.leadgen_id
          const pageId = change.value?.page_id

          if (leadgenId && accessToken) {
            // Fetch lead details from Meta Graph API
            const metaRes = await fetch(
              `https://graph.facebook.com/v19.0/${leadgenId}?access_token=${accessToken}`
            )

            if (metaRes.ok) {
              const leadData = await metaRes.json()
              const fieldData = leadData.field_data ?? []

              let fullName = 'Meta Lead'
              let rawPhone = ''
              let email: string | null = null

              for (const field of fieldData) {
                const name = (field.name ?? '').toLowerCase()
                const val = Array.isArray(field.values) ? field.values[0] : field.values

                if (name.includes('full_name') || name.includes('name')) {
                  fullName = val
                } else if (name.includes('phone') || name.includes('mobile')) {
                  rawPhone = val
                } else if (name.includes('email')) {
                  email = val
                }
              }

              const mobile = normalizePhone(rawPhone) || rawPhone || `meta_${leadgenId}`
              const source = (leadData.platform ?? 'facebook').toLowerCase() === 'instagram' ? 'instagram' : 'facebook'

              // Insert Lead directly into DB
              const { error: insertErr } = await supabase.from('leads').insert({
                full_name: fullName,
                mobile,
                email,
                source,
                source_sheet: 'Meta Lead Ads',
                status: 'new',
                notes: `Auto-populated from Meta Lead Ad (Form ID: ${change.value?.form_id ?? 'N/A'}, Lead ID: ${leadgenId})`,
              })

              if (!insertErr) {
                importedCount++
              } else {
                console.error('Lead Insert Error:', insertErr)
              }
            } else {
              console.error('Failed to fetch lead details from Meta Graph API:', await metaRes.text())
            }
          }
        }
      }
    }

    // Update connection last_synced_at & status if active
    if (conn) {
      await supabase
        .from('ad_sync_connections')
        .update({ last_synced_at: new Date().toISOString(), sync_status: 'active' })
        .eq('id', conn.id)
    }

    // Log to import_audit_log
    await supabase.from('import_audit_log').insert({
      section: 'leads',
      filename_source: 'Meta Lead Ads Webhook',
      row_count_attempted: entries.length,
      row_count_imported: importedCount,
      row_count_rejected_skipped: entries.length - importedCount,
      template_matched: true,
      status: importedCount > 0 ? 'success' : conn && accessToken ? 'completed_zero' : 'pending_token',
      error_reason: accessToken ? null : 'Meta access token not configured in ad_sync_connections or environment.',
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed Meta Lead webhook. ${importedCount} lead(s) imported.`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

