import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// In-memory rate limiting store: IP -> array of request timestamps (epoch ms)
const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10     // max 10 requests per minute

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const timestamps = rateLimitMap.get(ip) || []

  // Filter out timestamps outside the sliding window
  const activeTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS)

  if (activeTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    rateLimitMap.set(ip, activeTimestamps)
    return true
  }

  activeTimestamps.push(now)
  rateLimitMap.set(ip, activeTimestamps)

  // Periodic cleanup if map grows large
  if (rateLimitMap.size > 5000) {
    for (const [key, times] of rateLimitMap.entries()) {
      if (times.every((t) => now - t >= RATE_LIMIT_WINDOW_MS)) {
        rateLimitMap.delete(key)
      }
    }
  }

  return false
}

function normalizePhoneNumber(rawPhone: string): string | null {
  if (!rawPhone || typeof rawPhone !== 'string') return null
  const digits = rawPhone.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.substring(2)
  }
  if (digits.length > 10) {
    return digits.slice(-10)
  }
  if (digits.length === 10) {
    return digits
  }
  return null
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // 1. Rate limiting by client IP
    const clientIp =
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      'unknown-ip'

    if (clientIp !== 'unknown-ip' && isRateLimited(clientIp)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Parse request payload
    let body: any
    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { name, phone, email, course_interest, message } = body ?? {}

    // 3. Validation: name and phone required
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!phone || typeof phone !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Phone number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const cleanPhone = normalizePhoneNumber(phone)
    if (!cleanPhone) {
      return new Response(
        JSON.stringify({ success: false, error: 'Please enter a valid 10-digit phone number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Construct lead notes & data
    let notes = '[Website Inquiry]'
    if (course_interest && typeof course_interest === 'string' && course_interest.trim()) {
      notes += ` | Course Interest: ${course_interest.trim()}`
    }
    if (message && typeof message === 'string' && message.trim()) {
      notes += ` | Message: ${message.trim()}`
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment')
      return new Response(
        JSON.stringify({ success: false, error: 'Service configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use service role internally - never exposes key to browser
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 5. Insert into leads table (RLS bypassed server-side via service role)
    const { error: insertError } = await supabase.from('leads').insert({
      full_name: name.trim(),
      mobile: cleanPhone,
      email: typeof email === 'string' && email.trim() ? email.trim() : null,
      source: 'website',
      lead_date: new Date().toISOString().split('T')[0],
      status: 'new_lead',
      assigned_counselor_id: null,
      notes: notes,
      is_deleted: false,
    })

    if (insertError) {
      console.error('Lead insertion error:', insertError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to process lead intake' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 6. Return minimal, secure response (no IDs, no secrets)
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('Unexpected intake error:', err)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
