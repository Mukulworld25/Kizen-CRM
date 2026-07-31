import pg from 'pg'
const { Client } = pg

const NEW_DB_URL = 'postgres://postgres:tkrxsGLSiBs6PVls@db.bumjiykhgkgmqyynwtuh.supabase.co:5432/postgres'

async function deleteByMobile() {
  const client = new Client({ connectionString: NEW_DB_URL, ssl: { rejectUnauthorized: false } })
  await client.connect()

  const res = await client.query("SELECT id, full_name, mobile FROM leads WHERE mobile LIKE '%9936694560%' OR full_name ILIKE '%NATIK VARMA%';")
  console.log('Found NATIK VARMA (9936694560):', res.rows)

  if (res.rows.length > 0) {
    const ids = res.rows.map(r => `'${r.id}'`).join(',')
    await client.query(`DELETE FROM lead_activities WHERE lead_id IN (${ids});`)
    await client.query(`DELETE FROM follow_ups WHERE lead_id IN (${ids});`)
    await client.query(`DELETE FROM leads WHERE id IN (${ids});`)
    console.log(`✅ Removed ${res.rows.length} NATIK VARMA lead(s) with mobile 9936694560!`)
  }

  await client.end()
}

deleteByMobile().catch(console.error)
