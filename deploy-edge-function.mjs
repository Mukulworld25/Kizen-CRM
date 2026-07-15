import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const SU = 'https://zmqvjtenuxlvwfopfroc.supabase.co'
const ANON = 'sb_publishable_ezZ7_UyticpI7aeLKY3Rew_i_FaZBDh'
const PROJECT_REF = 'zmqvjtenuxlvwfopfroc'

async function main() {
  const sb = createClient(SU, ANON)
  const { data: si } = await sb.auth.signInWithPassword({
    email: 'shivam.kizen.test@gmail.com',
    password: 'Shivam@123'
  })
  const token = si?.data?.session?.access_token
  console.log('✓ Logged in, token obtained:', !!token)

  const source = readFileSync('d:\\CRM CURSOR\\supabase\\functions\\ai-summary\\index.ts', 'utf8')
  console.log(`✓ Read function source (${source.length} bytes)`)

  // Try POST to create function
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/functions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: 'ai-summary',
      slug: 'ai-summary',
      body: source,
      verify_jwt: false,
      import_map: true,
    }),
  })

  if (res.status === 403) {
    console.log('Token lacks mgmt scope. Trying alternate approach (upsert)...')
    
    // Try to check if function already exists (GET)
    const getRes = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/functions`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const existing = await getRes.json()
    if (Array.isArray(existing)) {
      const fn = existing.find(f => f.slug === 'ai-summary')
      if (fn) {
        console.log('Function already exists:', fn.name, '- updating via PATCH')
        const patchRes = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/${fn.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ body: source, verify_jwt: false, import_map: true }),
        })
        const patchResult = await patchRes.json()
        if (patchRes.ok) console.log('✓ Updated:', patchResult.name, patchResult.url)
        else console.log('UPDATE FAILED:', JSON.stringify(patchResult))
        return
      }
    }
    console.log('Cannot deploy directly. Use Supabase Dashboard → Edge Functions → New Function → paste source.')
    console.log('Or ask Mukul to generate a PAT at https://supabase.com/dashboard/account/tokens')
    return
  }

  const result = await res.json()
  if (res.ok) {
    console.log('✓ Edge Function deployed!')
    console.log('  Name:', result.name)
    console.log('  URL:', result.url)
  } else {
    console.log('DEPLOY FAILED:', JSON.stringify(result, null, 2))
  }
}

main().catch(e => { console.log('FATAL:', e.message); process.exit(1) })