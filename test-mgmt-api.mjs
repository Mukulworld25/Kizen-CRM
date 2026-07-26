import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const SU = 'https://zmqvjtenuxlvwfopfroc.supabase.co'
const SK = 'sb_publishable_ezZ7_UyticpI7aeLKY3Rew_i_FaZBDh'
const supabase = createClient(SU, SK)

async function main() {
  const si = await supabase.auth.signInWithPassword({ email: 'shivam.kizen.test@gmail.com', password: 'Shivam@123' })
  const token = si.data?.session?.access_token
  console.log('✓ Token obtained:', !!token)

  // Try Management API database query endpoint
  const res = await fetch(`https://api.supabase.com/v1/projects/zmqvjtenuxlvwfopfroc/database/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ query: 'SELECT 1' }),
  })

  console.log('Management API status:', res.status)
  console.log('Management API response:', await res.text())
}

main().catch(console.error)
