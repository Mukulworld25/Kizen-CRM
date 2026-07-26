import { createClient } from '@supabase/supabase-js'

const SU = 'https://zmqvjtenuxlvwfopfroc.supabase.co'
const SK = 'sb_publishable_ezZ7_UyticpI7aeLKY3Rew_i_FaZBDh'
const supabase = createClient(SU, SK)

async function main() {
  console.log('=== UPDATING LIVE USER ACCOUNTS ===')

  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'shivam.kizen.test@gmail.com',
    password: 'Shivam@123'
  })

  if (authErr) {
    console.error('Auth error:', authErr.message)
    return
  }

  // Update shivam@kizen.edu to SAGEDO Test Account
  const { error: updErr } = await supabase
    .from('users')
    .update({
      name: 'SAGEDO Test Account',
      email: 'sagedo.test@kizen.edu'
    })
    .eq('email', 'shivam@kizen.edu')

  if (updErr) {
    console.error('Update error:', updErr.message)
  } else {
    console.log('✓ Successfully updated shivam@kizen.edu -> SAGEDO Test Account (sagedo.test@kizen.edu)')
  }

  // Also clean up any extra standalone test user
  await supabase.from('users').delete().eq('email', 'test@sagedo.com')

  // Verify all users
  const { data: users } = await supabase.from('users').select('id, name, email, role, is_owner, is_active')
  console.log('\n--- CURRENT LIVE USERS ---')
  users?.forEach(u => console.log(` [${u.role}] ${u.name} (${u.email}) owner=${u.is_owner} active=${u.is_active}`))
}

main().catch(err => console.error(err))
