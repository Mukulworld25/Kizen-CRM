import pg from 'pg'
const { Client } = pg

const NEW_DB_URL = 'postgres://postgres:tkrxsGLSiBs6PVls@db.bumjiykhgkgmqyynwtuh.supabase.co:5432/postgres'

async function updatePasswords() {
  const client = new Client({ connectionString: NEW_DB_URL, ssl: { rejectUnauthorized: false } })
  await client.connect()

  // Update encrypted_password using 10-round bcrypt
  await client.query(`UPDATE auth.users SET encrypted_password = crypt('Shivam@123', gen_salt('bf', 10));`)
  console.log('✅ Updated all auth.users passwords with bcrypt (10 rounds)!')

  await client.end()
}

updatePasswords().catch(console.error)
