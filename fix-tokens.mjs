import pg from 'pg'
import { createClient } from '@supabase/supabase-js'

const { Client } = pg
const NEW_DB_URL = 'postgres://postgres:tkrxsGLSiBs6PVls@db.bumjiykhgkgmqyynwtuh.supabase.co:5432/postgres'

async function main() {
  const client = new Client({ connectionString: NEW_DB_URL, ssl: { rejectUnauthorized: false } })
  await client.connect()

  console.log('Fixing unique confirmation tokens & tokens for all auth users...')

  await client.query(`
    UPDATE auth.users 
    SET confirmation_token = encode(gen_random_bytes(32), 'hex'),
        confirmation_sent_at = NOW(),
        recovery_token = '',
        email_change_token_new = '',
        email_change = ''
    WHERE email != 'test.signup@gmail.com';
  `)

  console.log('✅ Updated all users with unique tokens!')
  await client.end()

  const supabase = createClient('https://bumjiykhgkgmqyynwtuh.supabase.co', 'sb_publishable_WvTe_Y2WcJay9k3aeDc8sQ_0W2--LjH')
  
  const testUsers = [
    'shivam.kizen.test@gmail.com',
    'megha@kizen.edu',
    'sagedo.test@kizen.edu',
    'counselor1@kizen.edu',
    'lakshaya@kizen.edu',
    'attender@kizen.edu',
    'reception@kizen.edu',
    'faculty.hod@kizen.edu',
    'Simrat.kizen@gmail.com',
    'Shaifali.kizen@gmail.com',
  ]

  console.log('\n--- TESTING LOGIN FOR ALL 10 USERS ---')
  for (const email of testUsers) {
    const res = await supabase.auth.signInWithPassword({
      email,
      password: 'Shivam@123',
    })
    if (res.data?.user) {
      console.log(`  ✅ LOGIN SUCCESS: ${email}`)
    } else {
      console.error(`  ❌ LOGIN FAILED: ${email} ->`, res.error)
    }
  }
}

main().catch(console.error)
