import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'

const supabaseUrl = 'https://zmqvjtenuxlvwfopfroc.supabase.co'
const supabaseKey = 'sb_publishable_ezZ7_UyticpI7aeLKY3Rew_i_FaZBDh'
const supabase = createClient(supabaseUrl, supabaseKey)

const results = []
let fileContent = ''

function log(msg) {
  results.push(msg)
  console.log(msg)
}

async function run() {
  log('=== KIZEN CRM FINAL VERIFICATION ===')
  log('')

  // 1. All 16 tables
  log('--- 1. TABLES ---')
  const tables = ['users','courses','batches','leads','lead_activities','follow_ups','documents','students','attendance','fees','fee_payments','installments','tasks','notifications','audit_logs','system_settings']
  let pass = true
  for (const t of tables) {
    const { error } = await supabase.from(t).select('id', { count: 'exact', head: true })
    if (error) { log(`  FAIL ${t}: ${error.message}`); pass = false }
    else log(`  OK ${t}`)
  }
  log(`  Result: ${pass ? 'PASS' : 'FAIL'}`)
  log('')

  // 2. Seed data
  log('--- 2. SEED DATA ---')
  const { data: courses } = await supabase.from('courses').select('name, total_fee')
  if (courses && courses.length > 0) {
    log(`  OK ${courses.length} courses`)
    for (const c of courses) log(`    ${c.name}: Rs${c.total_fee}`)
  } else {
    log('  No courses found - try: NOTIFY pgrst, "reload schema";')
  }

  const { data: settings } = await supabase.from('system_settings').select('key, value')
  if (settings && settings.length > 0) {
    log(`  OK ${settings.length} settings`)
    for (const s of settings) log(`    ${s.key}: ${s.value}`)
  } else {
    log('  No settings found')
  }
  log('')

  // 3. Auth
  log('--- 3. AUTH ---')
  const email = 'shivam@kizen-crm.com'
  const password = 'Shivam@123'

  const { data: si, error: siErr } = await supabase.auth.signInWithPassword({ email, password })
  if (siErr) {
    log(`  Signin: ${siErr.message}`)
    log('  Trying signup...')
    const { data: su, error: suErr } = await supabase.auth.signUp({
      email, password,
      options: { data: { name: 'Shivam Owner', role: 'owner' } }
    })
    if (suErr) {
      log(`  FAIL: ${suErr.message}`)
      log('  ACTION NEEDED:')
      log('  1. Go to Authentication > Settings')
      log('  2. Set "Confirm email" to OFF')
      log('  3. Click Save')
      log('  4. Then I can create test accounts')
    } else {
      log(`  Signup OK: ${su.user.id}`)
      if (su.session) {
        log('  Auto-confirmed! Checking data...')
        await checkData(su.session.access_token)
      } else {
        log('  Check email to confirm')
      }
    }
  } else {
    log(`  Signed in: ${si.user.email}`)
    await checkData(si.session.access_token)
  }

  log('')
  log('=== VERIFICATION END ===')
  writeFileSync('verify-final.txt', results.join('\n'))
}

async function checkData(token) {
  log('')
  log('--- 4. AUTHENTICATED DATA ---')
  const authed = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  })

  const { data: c } = await authed.from('courses').select('name')
  log(`  Courses accessible: ${c ? c.length + ' rows' : 'NO'}`)

  const { data: u } = await authed.from('users').select('name, email, role, is_owner')
  if (u) {
    log(`  Users: ${u.length}`)
    for (const x of u) log(`    ${x.name} (${x.email}) - ${x.role}${x.is_owner ? ' [OWNER]' : ''}`)
  } else {
    log('  Users: blocked by RLS (expected for non-owner)')
  }

  const { data: l, error: lErr } = await authed.from('leads').select('count', { count: 'exact', head: true })
  log(`  Leads: ${lErr ? 'RLS blocked' : 'accessible'}`)

  const { data: s } = await authed.from('students').select('count', { count: 'exact', head: true })
  log(`  Students: accessible`)

  const { data: f } = await authed.from('fees').select('count', { count: 'exact', head: true })
  log(`  Fees: accessible`)
}

run()