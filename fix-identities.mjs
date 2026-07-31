import pg from 'pg'
import { createClient } from '@supabase/supabase-js'

const { Client } = pg
const NEW_DB_URL = 'postgres://postgres:tkrxsGLSiBs6PVls@db.bumjiykhgkgmqyynwtuh.supabase.co:5432/postgres'

async function fixIdentities() {
  const client = new Client({ connectionString: NEW_DB_URL, ssl: { rejectUnauthorized: false } })
  await client.connect()

  // Update auth.identities format to match GoTrue expectations
  await client.query(`
    UPDATE auth.identities 
    SET identity_data = json_build_object(
      'sub', user_id::text, 
      'email', email, 
      'email_verified', false, 
      'phone_verified', false
    ),
    id = uuid_generate_v4()
    WHERE user_id != '9077c751-5a1a-484e-b3e6-421daa78d4cf';
  `)

  console.log('✅ Updated auth.identities format!')
  await client.end()

  const supabase = createClient('https://bumjiykhgkgmqyynwtuh.supabase.co', 'sb_publishable_WvTe_Y2WcJay9k3aeDc8sQ_0W2--LjH')
  const res = await supabase.auth.signInWithPassword({
    email: 'shivam.kizen.test@gmail.com',
    password: 'Shivam@123',
  })

  console.log('SHIVAM LOGIN TEST:', res.data?.user ? 'SUCCESS: ' + res.data.user.email : res.error)
}

fixIdentities().catch(console.error)
