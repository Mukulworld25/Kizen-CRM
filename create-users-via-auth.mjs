import { createClient } from '@supabase/supabase-js'
import pg from 'pg'

const { Client } = pg
const NEW_DB_URL = 'postgres://postgres:tkrxsGLSiBs6PVls@db.bumjiykhgkgmqyynwtuh.supabase.co:5432/postgres'

const NEW_URL = 'https://bumjiykhgkgmqyynwtuh.supabase.co'
const NEW_KEY = 'sb_publishable_WvTe_Y2WcJay9k3aeDc8sQ_0W2--LjH'
const supabase = createClient(NEW_URL, NEW_KEY)

async function main() {
  const pgClient = new Client({ connectionString: NEW_DB_URL, ssl: { rejectUnauthorized: false } })
  await pgClient.connect()

  // First clear old manual auth entries to avoid conflict
  await pgClient.query('TRUNCATE auth.identities, auth.users CASCADE;')

  const users = await pgClient.query('SELECT id, name, email, role, is_owner FROM public.users;')

  console.log(`Creating ${users.rows.length} Auth accounts via Supabase Auth API...`)

  for (const u of users.rows) {
    const { data, error } = await supabase.auth.signUp({
      email: u.email,
      password: 'Shivam@123',
    })

    if (error) {
      console.error(`  ❌ Failed for ${u.email}:`, error.message)
    } else if (data.user) {
      console.log(`  ✅ Created Auth user for ${u.email} (Auth ID: ${data.user.id})`)
      // Update public.users to link auth_id
      await pgClient.query('UPDATE public.users SET auth_id = $1 WHERE id = $2', [data.user.id, u.id])
    }
  }

  // Auto-confirm emails in auth.users
  await pgClient.query("UPDATE auth.users SET email_confirmed_at = NOW(), confirmed_at = NOW();")
  console.log('✅ Auto-confirmed all user emails in auth.users!')

  await pgClient.end()
}

main().catch(console.error)
