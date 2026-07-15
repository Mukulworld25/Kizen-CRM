import { createClient } from '@supabase/supabase-js'

const SU = 'https://zmqvjtenuxlvwfopfroc.supabase.co'
const ANON = 'sb_publishable_ezZ7_UyticpI7aeLKY3Rew_i_FaZBDh'

async function run() {
  const sb = createClient(SU, ANON)
  
  // 1. Sign up BDM user
  const email = 'bdm.kizen@gmail.com'
  const password = 'BdmUser@123'
  const name = 'Bobby BDM'
  const role = 'bdm'
  
  console.log(`Signing up ${email}...`)
  const { data: signUpData, error: signUpError } = await sb.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        role
      }
    }
  })
  
  if (signUpError) {
    if (signUpError.message.includes('already registered')) {
      console.log('User already registered in auth, proceeding to role update...')
    } else {
      console.error('Signup error:', signUpError.message)
      process.exit(1)
    }
  } else {
    console.log('Signed up successfully, user ID:', signUpData.user?.id)
  }

  // 2. Sign in as Owner to update role in users table (since RLS/permissions might block public update)
  console.log('Logging in as Owner...')
  const ownerSession = await sb.auth.signInWithPassword({
    email: 'shivam.kizen.test@gmail.com',
    password: 'Shivam@123'
  })
  if (ownerSession.error) {
    console.error('Owner login failed:', ownerSession.error.message)
    process.exit(1)
  }

  const authed = createClient(SU, ANON, {
    global: {
      headers: {
        Authorization: `Bearer ${ownerSession.data.session.access_token}`
      }
    }
  })

  // 3. Update public.users table to set role = 'bdm'
  console.log(`Updating user role for ${email} in public.users...`)
  const { data: updateData, error: updateError } = await authed
    .from('users')
    .update({ role, name })
    .eq('email', email)
    .select()

  if (updateError) {
    console.error('Update error:', updateError.message)
    process.exit(1)
  }

  console.log('Update success:', updateData)
  console.log('BDM User created and configured successfully!')
}

run().catch(console.error)
