import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'fs'

const SU = 'https://zmqvjtenuxlvwfopfroc.supabase.co'
const SK = 'sb_publishable_ezZ7_UyticpI7aeLKY3Rew_i_FaZBDh'
const supabase = createClient(SU, SK)

const log = []
function l(m) { log.push(m); console.log(m) }
function finish() { writeFileSync('migration-output.txt', log.join('\n')); l('Written to migration-output.txt') }

async function main() {
  l('=== RUNNING MIGRATION 008 ===')
  l('')

  // Sign in as owner
  const si = await supabase.auth.signInWithPassword({ email: 'shivam.kizen.test@gmail.com', password: 'Shivam@123' })
  if (si.error) { l(`Signin FAIL: ${si.error.message}`); finish(); return }
  l(`Signed in as ${si.data.user.email}`)

  // Read migration SQL
  const sql = readFileSync('008_migration_step_b_g.sql', 'utf8')
  
  // Split into individual statements
  const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith('--'))
  
  // Try to call exec_sql if it exists, otherwise run each via raw SQL
  let pass = 0
  let fail = 0
  const errors = []

  for (const stmt of statements) {
    const fullStmt = stmt + ';'
    // We'll execute via the REST API's pg/sql endpoint
    try {
      // Use the supabase-js query - for ALTER/CREATE we need raw SQL
      // Try the SQL API endpoint
      const url = `${SU}/rest/v1/`
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${si.data.session.access_token}`,
          'apikey': SK,
          'Prefer': 'params=single-object',
        },
        body: JSON.stringify({ query: fullStmt })
      })
      
      if (!response.ok) {
        const text = await response.text()
        errors.push({ stmt: fullStmt.substring(0, 80), error: text.substring(0, 150) })
        l(`  FAIL: ${text.substring(0, 100)}`)
        fail++
      } else {
        l(`  OK`)
        pass++
      }
    } catch (e) {
      errors.push({ stmt: fullStmt.substring(0, 80), error: e.message })
      l(`  FAIL: ${e.message.substring(0, 100)}`)
      fail++
    }
  }

  l('')
  l(`=== MIGRATION COMPLETE: ${pass} passed, ${fail} failed ===`)
  if (errors.length > 0) {
    l('')
    l('ERRORS (run these manually in Supabase SQL Editor):')
    l('')
    for (const e of errors) {
      l(`-- ${e.error}`)
      l(e.stmt)
      l('')
    }
  }
  finish()
}

main().catch(e => { l(`FATAL: ${e.message}`); finish() })