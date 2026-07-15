import { createClient } from '@supabase/supabase-js'
const SU = 'https://zmqvjtenuxlvwfopfroc.supabase.co'
const SK = 'sb_publishable_ezZ7_UyticpI7aeLKY3Rew_i_FaZBDh'

async function main() {
  const sb = createClient(SU, SK)
  const si = await sb.auth.signInWithPassword({ email: 'shivam.kizen.test@gmail.com', password: 'Shivam@123' })
  if (si.error) { console.log('LOGIN FAIL:', si.error.message); process.exit(1) }
  const token = si.data.session.access_token
  const C = createClient(SU, SK, { global: { headers: { Authorization: 'Bearer ' + token } } })

  // 1. Check lead_score column
  const { data: l } = await C.from('leads').select('lead_score, temperature, budget, expected_joining_date').limit(1).maybeSingle()
  if (l) {
    console.log('✓ lead_score exists:', 'lead_score' in l)
    console.log('✓ temperature exists:', 'temperature' in l)
    console.log('✓ budget exists:', 'budget' in l)
    console.log('✓ expected_joining_date exists:', 'expected_joining_date' in l)
  } else { console.log('? No lead rows to check') }

  // 2. Check status values
  const { data: st } = await C.from('leads').select('status').limit(20)
  const unique = [...new Set(st.map(s => s.status))]
  console.log('Statuses:', unique.join(', '))

  // 3. Check ai_summary column
  const { data: a } = await C.from('lead_activities').select('ai_summary').limit(1).maybeSingle()
  console.log('✓ ai_summary column:', a ? ('ai_summary' in a) : 'table exists but no rows')

  // 4. Count E2E test leads
  const { data: e2e } = await C.from('leads').select('id, full_name').ilike('full_name', 'E2E%')
  console.log(`E2E test leads: ${e2e?.length ?? 0}`)
  for (const l of e2e ?? []) console.log(`  - ${l.full_name} (${l.id})`)

  // 5. Check lead scores
  const { data: scores } = await C.from('leads').select('full_name, lead_score').order('lead_score', { ascending: false, nullsFirst: false }).limit(5)
  console.log('Top scored leads:')
  for (const s of scores ?? []) console.log(`  ${s.full_name}: ${s.lead_score ?? 'null'}`)

  console.log('\n=== VERIFICATION COMPLETE ===')
}
main().catch(e => { console.log('FATAL:', e.message); process.exit(1) })