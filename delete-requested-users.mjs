import pg from 'pg'
const { Client } = pg

const NEW_DB_URL = 'postgres://postgres:tkrxsGLSiBs6PVls@db.bumjiykhgkgmqyynwtuh.supabase.co:5432/postgres'

async function removeUsers() {
  const client = new Client({ connectionString: NEW_DB_URL, ssl: { rejectUnauthorized: false } })
  await client.connect()

  const emailsToDelete = [
    'Simrat.kizen@gmail.com',
    'Shaifali.kizen@gmail.com',
    'lakshaya@kizen.edu'
  ]

  console.log('Removing requested users:', emailsToDelete)

  for (const email of emailsToDelete) {
    const res = await client.query('SELECT id FROM public.users WHERE email = $1', [email])
    if (res.rows.length > 0) {
      const userId = res.rows[0].id
      await client.query('DELETE FROM auth.identities WHERE user_id = $1', [userId])
      await client.query('DELETE FROM auth.users WHERE id = $1', [userId])
      await client.query('DELETE FROM public.users WHERE id = $1', [userId])
      console.log(`  ✅ Removed user: ${email}`)
    } else {
      console.log(`  ⚠️ User not found: ${email}`)
    }
  }

  const remaining = await client.query('SELECT name, email, role FROM public.users;')
  console.log('\n--- REMAINING USERS IN DATABASE ---')
  console.table(remaining.rows)

  await client.end()
}

removeUsers().catch(console.error)
