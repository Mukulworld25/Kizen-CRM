import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const SU = 'https://zmqvjtenuxlvwfopfroc.supabase.co'
const SK = 'sb_publishable_ezZ7_UyticpI7aeLKY3Rew_i_FaZBDh'
const supabase = createClient(SU, SK)

async function runSql(sql, token) {
  const res = await fetch(`${SU}/sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': SK,
      'Prefer': 'params=single-object',
    },
    body: JSON.stringify({ query: sql }),
  })
  const text = await res.text()
  return { ok: res.ok, text }
}

async function main() {
  console.log('=== APPLYING MIGRATIONS 012, 013, 014, 015 ===\n')

  const si = await supabase.auth.signInWithPassword({ email: 'shivam.kizen.test@gmail.com', password: 'Shivam@123' })
  if (si.error) {
    console.error('Sign-in failed:', si.error.message)
    process.exit(1)
  }
  console.log('✓ Signed in as:', si.data.user.email)
  const token = si.data.session.access_token

  const files = [
    '012_auto_intake_system.sql',
    '013_entity_linking_historical_import.sql',
    '014_display_ids_name_search.sql',
    '015_phase3c_schema_corrections.sql',
  ]

  for (const file of files) {
    console.log(`\n--- Applying ${file} ---`)
    const sql = readFileSync(file, 'utf8')
    const res = await runSql(sql, token)
    if (res.ok) {
      console.log(`✓ ${file} applied successfully!`)
    } else {
      console.log(`⚠️ Endpoint response for ${file}:`, res.text.substring(0, 300))
    }
  }
}

main().catch(console.error)
