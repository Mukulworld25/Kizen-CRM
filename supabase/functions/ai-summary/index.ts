import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const CLAUDE_API = 'https://api.anthropic.com/v1/messages'
const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY') ?? ''

serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Authorization, Content-Type' } })
  }

  try {
    const { note } = await req.json()
    if (!note || typeof note !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing note text' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }

    if (!CLAUDE_API_KEY) {
      return new Response(JSON.stringify({ error: 'CLAUDE_API_KEY not configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }

    const res = await fetch(CLAUDE_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `You are a CRM assistant. Given this call/meeting note, produce exactly 2 lines:
Line 1: A 1-sentence summary (max 100 chars)
Line 2: A suggested next action starting with "Next action:"

Note: "${note}"`,
        }],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return new Response(JSON.stringify({ error: err }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }

    const data = await res.json()
    const content = data.content?.[0]?.text ?? ''

    return new Response(JSON.stringify({ summary: content }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})