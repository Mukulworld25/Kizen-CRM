import { createClient } from '@supabase/supabase-js'

const SU = 'https://zmqvjtenuxlvwfopfroc.supabase.co'
const SK = 'sb_publishable_ezZ7_UyticpI7aeLKY3Rew_i_FaZBDh'
const supabase = createClient(SU, SK)

async function apply019() {
  console.log('=== APPLYING PHASE 4 DATA & USER ACCOUNTS ===')

  // Authenticate as Shivam Owner
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'shivam.kizen.test@gmail.com',
    password: 'Shivam@123'
  })

  if (authErr) {
    console.error('Auth error:', authErr.message)
    return
  }

  console.log(`Signed in as: ${authData.user.email}`)

  // Seed staff users directly into public.users table
  const staff = [
    { name: 'Shivam Owner', email: 'shivam.kizen.test@gmail.com', role: 'owner', is_owner: true, is_active: true },
    { name: 'SAGEDO Test Account', email: 'test@sagedo.com', role: 'admin', is_owner: false, is_active: true },
    { name: 'Megha Owner', email: 'megha@kizen.edu', role: 'owner', is_owner: true, is_active: true },
    { name: 'Aadya Sharma (Counselor 1)', email: 'counselor1@kizen.edu', role: 'counselor', is_owner: false, is_active: true },
    { name: 'Lakshaya Ma\'am (Counselor 2)', email: 'lakshaya@kizen.edu', role: 'counselor', is_owner: false, is_active: true },
    { name: 'Preeti Verma (Front Desk)', email: 'reception@kizen.edu', role: 'reception', is_owner: false, is_active: true },
    { name: 'Attender Staff', email: 'attender@kizen.edu', role: 'reception', is_owner: false, is_active: true },
  ]

  for (const user of staff) {
    const { data, error } = await supabase
      .from('users')
      .upsert(user, { onConflict: 'email' })
      .select()

    if (error) {
      console.error(`Error seeding ${user.name}:`, error.message)
    } else {
      console.log(`✅ Upserted user: ${user.name} (${user.email})`)
    }
  }

  console.log('\n=== STAFF ACCOUNTS COMPLETE ===')
}

apply019().catch(err => console.error(err))
