import { createClient } from '@supabase/supabase-js'

const SU = 'https://zmqvjtenuxlvwfopfroc.supabase.co'
const SK = 'sb_publishable_ezZ7_UyticpI7aeLKY3Rew_i_FaZBDh'
const supabase = createClient(SU, SK)

const PASSWORD = 'Shivam@123'

const accounts = [
  { email: 'shivam.kizen.test@gmail.com', name: 'Shivam Owner', role: 'owner', is_owner: true },
  { email: 'sagedo.test@kizen.edu', name: 'SAGEDO Test Account', role: 'owner', is_owner: true },
  { email: 'megha@kizen.edu', name: 'Megha Owner', role: 'owner', is_owner: true },
  { email: 'counselor1@kizen.edu', name: 'Aadya Sharma (Counselor 1)', role: 'counselor', is_owner: false },
  { email: 'lakshaya@kizen.edu', name: 'Lakshaya Ma\'am (Counselor 2)', role: 'counselor', is_owner: false },
  { email: 'reception@kizen.edu', name: 'Preeti Verma (Front Desk)', role: 'reception', is_owner: false },
  { email: 'attender@kizen.edu', name: 'Attender Staff', role: 'faculty', is_owner: false },
]

async function main() {
  console.log('=== REGISTERING & LINKING ALL AUTH USERS ===\n')

  for (const acc of accounts) {
    let authId = null

    // 1. Try to sign in first
    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
      email: acc.email,
      password: PASSWORD,
    })

    if (!signInErr && signInData?.user) {
      authId = signInData.user.id
      console.log(`✓ Existing Auth Account OK: ${acc.email} (${authId})`)
      await supabase.auth.signOut()
    } else {
      // 2. SignUp new user with password Shivam@123
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: acc.email,
        password: PASSWORD,
        options: {
          data: { name: acc.name, role: acc.role }
        }
      })

      if (signUpErr) {
        console.error(`❌ SignUp failed for ${acc.email}: ${signUpErr.message}`)
      } else if (signUpData?.user) {
        authId = signUpData.user.id
        console.log(`✅ Created NEW Auth User: ${acc.email} (${authId})`)
        await supabase.auth.signOut()
      }
    }

    // 3. Update public.users record with auth_id and active status
    if (authId) {
      const { error: updErr } = await supabase
        .from('users')
        .upsert({
          name: acc.name,
          email: acc.email,
          role: acc.role,
          is_owner: acc.is_owner,
          is_active: true,
          auth_id: authId,
        }, { onConflict: 'email' })

      if (updErr) {
        console.error(`  Failed to link public.users for ${acc.email}:`, updErr.message)
      } else {
        console.log(`  ✓ Linked public.users auth_id for ${acc.email}`)
      }
    }
  }

  console.log('\n=== TESTING LOGINS AGAIN ===')
  for (const acc of accounts) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: acc.email,
      password: PASSWORD,
    })
    if (error) {
      console.log(`❌ FAIL: ${acc.email} -> ${error.message}`)
    } else {
      console.log(`✅ PASS: ${acc.email} (${acc.role}) logged in successfully!`)
      await supabase.auth.signOut()
    }
  }
}

main().catch(err => console.error(err))
