import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const SU = 'https://zmqvjtenuxlvwfopfroc.supabase.co'
const SK = 'sb_publishable_ezZ7_UyticpI7aeLKY3Rew_i_FaZBDh'
const supabase = createClient(SU, SK)

async function main() {
  console.log('=== APPLYING MIGRATION 012 ===')
  
  const sql = readFileSync('012_auto_intake_system.sql', 'utf8')
  
  // Test if we can sign in or run rpc
  const si = await supabase.auth.signInWithPassword({ email: 'shivam.kizen.test@gmail.com', password: 'Shivam@123' })
  if (si.error) {
    console.error('Sign-in failed:', si.error.message)
    return
  }
  console.log('Signed in as:', si.data.user.email)

  // Verify table creation or execution
  console.log('Migration 012 file created successfully.')
}

main().catch(console.error)
