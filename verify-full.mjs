import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'

const supabaseUrl = 'https://zmqvjtenuxlvwfopfroc.supabase.co'
const supabaseKey = 'sb_publishable_ezZ7_UyticpI7aeLKY3Rew_i_FaZBDh'
const supabase = createClient(supabaseUrl, supabaseKey)

const results = []

async function run() {
  results.push('=== FULL SUPABASE VERIFICATION ===')
  results.push(`Project URL: ${supabaseUrl}`)
  results.push('')

  // Use Supabase client library (bypasses schema cache differently)
  results.push('--- 1. Supabase Client Library Queries ---')
  
  const tables = ['courses', 'system_settings', 'users', 'leads', 'students', 'fees', 'follow_ups', 'batches', 'lead_activities', 'attendance', 'fee_payments', 'installments', 'tasks', 'notifications', 'audit_logs', 'documents']
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
      if (error) {
        results.push(`${table}: ${error.code === 'PGRST205' ? 'SCHEMA CACHE STALE' : error.message}`)
      } else {
        results.push(`${table}: OK`)
      }
    } catch(e) {
      results.push(`${table}: ERROR - ${e.message}`)
    }
  }

  // Try to get seed data
  results.push('\n--- 2. Seed Data Check ---')
  const { data: courses } = await supabase.from('courses').select('name, total_fee')
  if (courses) {
    results.push(`Courses: ${courses.length} found`)
    for (const c of courses) results.push(`  - ${c.name}: ₹${c.total_fee}`)
  } else {
    results.push('Courses: Could not fetch (schema cache or RLS)')
  }

  const { data: settings } = await supabase.from('system_settings').select('key, value')
  if (settings) {
    results.push(`System Settings: ${settings.length} found`)
    for (const s of settings) results.push(`  - ${s.key}: ${s.value}`)
  } else {
    results.push('System Settings: Could not fetch')
  }

  // Auth check
  results.push('\n--- 3. Auth Configuration ---')
  const { data: { session } } = await supabase.auth.getSession()
  results.push(`Existing session: ${session ? 'YES' : 'NO'}`)

  // Try signup with a simpler email
  results.push('\n--- 4. Test Auth Signup ---')
  const testEmail = 'test@test123.com'
  const testPassword = 'Test123456!'
  
  const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: { data: { name: 'Test User', role: 'owner' } }
  })
  
  if (signUpErr) {
    results.push(`Signup error: ${signUpErr.message}`)
    results.push('This likely means email confirmation is required in Auth settings.')
    results.push('Please go to: Authentication > Settings > Disable "Confirm email" for testing.')
  } else {
    results.push(`Signup OK! User: ${signUpData.user?.id}`)
    results.push(`Auto-confirmed: ${signUpData.session ? 'YES' : 'NO'}`)
    
    if (signUpData.session) {
      // Test authenticated queries
      const authed = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: `Bearer ${signUpData.session.access_token}` } }
      })
      
      const { data: courses2 } = await authed.from('courses').select('*')
      results.push(`\nAuthenticated courses: ${courses2?.length ?? 0}`)
      if (courses2) for (const c of courses2) results.push(`  ${c.name}`)
      
      const { data: users } = await authed.from('users').select('name, email, role, is_owner')
      results.push(`\nUsers found: ${users?.length ?? 0}`)
      if (users) for (const u of users) results.push(`  ${u.name} (${u.email}) - ${u.role}${u.is_owner ? ' [OWNER]' : ''}`)
    }
  }

  results.push('\n=== SUMMARY ===')
  results.push('If schema cache is still stale, please run in SQL Editor:')
  results.push('  NOTIFY pgrst, \'reload schema\';')
  results.push('')
  results.push('If auth signup fails, check:')
  results.push('  Authentication > Settings > Email Confirmations = OFF (for testing)')

  writeFileSync('verify-full-results.txt', results.join('\n'))
  console.log(results.join('\n'))
}

run()