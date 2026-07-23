import { createClient } from '@supabase/supabase-js'

const SU = 'https://zmqvjtenuxlvwfopfroc.supabase.co'
const SK = 'sb_publishable_ezZ7_UyticpI7aeLKY3Rew_i_FaZBDh'
const supabase = createClient(SU, SK)

const PASSWORD = 'Shivam@123'

const userAuthIds = {
  'shivam.kizen.test@gmail.com': '0f61169a-acf4-430e-bc0f-9bf28adfb28c',
  'sagedo.test@kizen.edu': '213c01cb-12dc-403b-84c1-97cdf13f75f0',
  'megha@kizen.edu': '1cdad194-6663-4d7b-93da-f06e9ea912b7',
  'counselor1@kizen.edu': '8eb37160-1fc2-43f7-915e-e0c31d67322b',
  'lakshaya@kizen.edu': '9360f5af-00e5-4864-9bd7-6c215d3d7f46',
  'reception@kizen.edu': 'a14b234e-f5a8-46d0-bc75-a4376151d4a8',
  'attender@kizen.edu': '944f4395-e21b-41b2-b0b7-2e27c002ce4e',
}

async function linkAuthIds() {
  console.log('=== LINKING AUTH IDs IN PUBLIC.USERS AS OWNER ===')

  // Sign in as Owner
  const { data: ownerAuth, error: ownerErr } = await supabase.auth.signInWithPassword({
    email: 'shivam.kizen.test@gmail.com',
    password: PASSWORD
  })

  if (ownerErr) {
    console.error('Owner auth failed:', ownerErr.message)
    return
  }

  for (const [email, authId] of Object.entries(userAuthIds)) {
    const { error } = await supabase
      .from('users')
      .update({ auth_id: authId, is_active: true })
      .eq('email', email)

    if (error) {
      console.error(`❌ Failed to link ${email}:`, error.message)
    } else {
      console.log(`✅ Successfully linked ${email} -> auth_id: ${authId}`)
    }
  }

  // Check all users in public.users
  const { data: users } = await supabase.from('users').select('id, name, email, role, auth_id, is_active')
  console.log('\n--- VERIFIED PUBLIC.USERS TABLE ---')
  users?.forEach(u => console.log(` [${u.role}] ${u.name} (${u.email}) -> auth_id: ${u.auth_id}`))
}

linkAuthIds().catch(err => console.error(err))
