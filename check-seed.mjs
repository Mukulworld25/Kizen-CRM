import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'

const supabaseUrl = 'https://zmqvjtenuxlvwfopfroc.supabase.co'
const supabaseKey = 'sb_publishable_ezZ7_UyticpI7aeLKY3Rew_i_FaZBDh'
const supabase = createClient(supabaseUrl, supabaseKey)

const results = []

async function run() {
  // First test: raw REST API with anon key (no auth) - should fail with RLS
  results.push('=== TEST 1: Anon key (unauthenticated) ===')
  try {
    const resp = await fetch(`${supabaseUrl}/rest/v1/courses?select=name,total_fee&limit=10`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      }
    })
    const text = await resp.text()
    results.push(`Status ${resp.status}: ${text.slice(0, 300)}`)
  } catch(e) {
    results.push(`ERROR: ${e.message}`)
  }

  // Second test: Try to sign up a test user
  results.push('\n=== TEST 2: Auth signup ===')
  const testEmail = `test-${Date.now()}@kizen-test.com`
  const testPassword = 'Test123456!'
  
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: { data: { name: 'Test User', role: 'owner' } }
  })
  
  if (signUpError) {
    results.push(`Signup error: ${signUpError.message}`)
    // Try sign in instead (user may already exist or signup may be disabled)
    results.push('Trying sign-in with test credentials...')
  } else {
    results.push(`Signup success! User: ${signUpData.user?.id}`)
    results.push(`Session: ${signUpData.session ? 'YES' : 'NO (email confirmation required)'}`)
    
    if (signUpData.session) {
      // We have a session! Now test with auth
      const authedClient = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: `Bearer ${signUpData.session.access_token}` } }
      })
      
      const { data: courses, error: coursesErr } = await authedClient.from('courses').select('name, total_fee')
      results.push(`\n=== TEST 3: Authenticated query ===`)
      results.push(`Courses: ${coursesErr ? `ERROR: ${coursesErr.message}` : JSON.stringify(courses)}`)
      
      const { data: users } = await authedClient.from('users').select('name, email, role')
      results.push(`Users: ${users ? JSON.stringify(users) : 'no data'}`)
    }
  }

  results.push('\n=== SUMMARY ===')
  results.push('To fully verify the database, please run verify-supabase.sql in the Supabase Dashboard SQL Editor.')
  results.push(`Test email used: ${testEmail}`)
  results.push(`Test password: ${testPassword}`)

  writeFileSync('seed-check-results.txt', results.join('\n'))
  console.log(results.join('\n'))
}

run()