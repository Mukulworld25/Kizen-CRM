import type { IncomingMessage, ServerResponse } from 'http'
import pg from 'pg'

const { Pool } = pg

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgres://postgres:tkrxsGLSiBs6PVls@db.bumjiykhgkgmqyynwtuh.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false },
})

// In-memory rate limiting store: IP -> array of request timestamps (epoch ms)
const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10 // max 10 requests per minute

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const timestamps = rateLimitMap.get(ip) || []
  const activeTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS)

  if (activeTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    rateLimitMap.set(ip, activeTimestamps)
    return true
  }

  activeTimestamps.push(now)
  rateLimitMap.set(ip, activeTimestamps)

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

export default async function handler(req: any, res: any) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')

  if (req.method === 'OPTIONS') {
    res.statusCode = 200
    res.end('ok')
    return
  }

  if (req.method !== 'POST') {
    res.statusCode = 405
    res.json({ success: false, error: 'Method not allowed' })
    return
  }

  try {
    // 1. Rate limiting by IP
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.socket?.remoteAddress ||
      'unknown-ip'

    if (clientIp !== 'unknown-ip' && isRateLimited(clientIp)) {
      res.statusCode = 429
      res.json({ success: false, error: 'Rate limit exceeded. Please try again later.' })
      return
    }

    // 2. Parse body
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    const { name, phone, email, course_interest, message } = body

    // 3. Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.statusCode = 400
      res.json({ success: false, error: 'Name is required' })
      return
    }

    if (!phone || typeof phone !== 'string') {
      res.statusCode = 400
      res.json({ success: false, error: 'Phone number is required' })
      return
    }

    const cleanPhone = normalizePhoneNumber(phone)
    if (!cleanPhone) {
      res.statusCode = 400
      res.json({ success: false, error: 'Please enter a valid 10-digit phone number' })
      return
    }

    // 4. Construct notes
    let notes = '[Website Inquiry]'
    if (course_interest && typeof course_interest === 'string' && course_interest.trim()) {
      notes += ` | Course Interest: ${course_interest.trim()}`
    }
    if (message && typeof message === 'string' && message.trim()) {
      notes += ` | Message: ${message.trim()}`
    }

    // 5. Insert directly into leads table
    const client = await pool.connect()
    try {
      await client.query(
        `INSERT INTO public.leads (
          full_name, mobile, email, source, status, assigned_counselor_id, notes, is_deleted
        ) VALUES ($1, $2, $3, 'website', 'new_lead', NULL, $4, false)`,
        [
          name.trim(),
          cleanPhone,
          typeof email === 'string' && email.trim() ? email.trim() : null,
          notes,
        ]
      )
    } finally {
      client.release()
    }

    res.statusCode = 200
    res.json({ success: true })
  } catch (err: any) {
    console.error('Lead intake handler error:', err)
    res.statusCode = 500
    res.json({ success: false, error: 'Internal server error' })
  }
}
