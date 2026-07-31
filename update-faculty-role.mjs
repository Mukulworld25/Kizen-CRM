import pg from 'pg'
const { Client } = pg

const NEW_DB_URL = 'postgres://postgres:tkrxsGLSiBs6PVls@db.bumjiykhgkgmqyynwtuh.supabase.co:5432/postgres'

async function updateRole() {
  const client = new Client({ connectionString: NEW_DB_URL, ssl: { rejectUnauthorized: false } })
  await client.connect()

  await client.query("UPDATE public.users SET role = 'faculty' WHERE email = 'faculty.hod@kizen.edu';")
  console.log('✅ Updated faculty.hod@kizen.edu role to faculty!')

  const res = await client.query("SELECT name, email, role FROM public.users WHERE email = 'faculty.hod@kizen.edu';")
  console.log(res.rows[0])

  await client.end()
}

updateRole().catch(console.error)
