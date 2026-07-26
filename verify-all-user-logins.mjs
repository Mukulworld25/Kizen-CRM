import { createClient } from '@supabase/supabase-js'

const SU = 'https://zmqvjtenuxlvwfopfroc.supabase.co'
const SK = 'sb_publishable_ezZ7_UyticpI7aeLKY3Rew_i_FaZBDh'
const supabase = createClient(SU, SK)

const testAccounts = [
  { email: 'shivam.kizen.test@gmail.com', password: 'Shivam@123', role: 'owner' },
  { email: 'sagedo.test@kizen.edu', password: 'Shivam@123', role: 'owner' },
  { email: 'counselor1@kizen.edu', password: 'Shivam@123', role: 'counselor' },
  { email: 'reception@kizen.edu', password: 'Shivam@123', role: 'reception' },
  { email: 'attender@kizen.edu', password: 'Shivam@123', role: 'faculty' },
]

async function checkLogins() {
  console.log('=== TESTING ALL LIVE USER CREDENTIALS ===')

  for (const acc of testAccounts) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: acc.email,
      password: acc.password,
    })

    if (error) {
      console.log(`❌ FAILED: ${acc.email} (${acc.role}) -> Error: ${error.message}`)
    } else {
      console.log(`✅ SUCCESS: ${acc.email} (${acc.role}) -> Auth ID: ${data.user.id}`)
      await supabase.auth.signOut()
    }
  }
}

checkLogins().catch(err => console.error(err))
