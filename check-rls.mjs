import pg from 'pg'
const { Client } = pg

const NEW_DB_URL = 'postgres://postgres:tkrxsGLSiBs6PVls@db.bumjiykhgkgmqyynwtuh.supabase.co:5432/postgres'

async function checkRLS() {
  const client = new Client({ connectionString: NEW_DB_URL, ssl: { rejectUnauthorized: false } })
  await client.connect()

  const res = await client.query("SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';")
  console.log('--- PUBLIC TABLES RLS STATUS ---')
  console.table(res.rows)

  await client.end()
}

checkRLS().catch(console.error)
