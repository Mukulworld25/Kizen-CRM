import pg from 'pg'
const { Client } = pg

const NEW_DB_URL = 'postgres://postgres:tkrxsGLSiBs6PVls@db.bumjiykhgkgmqyynwtuh.supabase.co:5432/postgres'

async function deleteNatik() {
  const client = new Client({ connectionString: NEW_DB_URL, ssl: { rejectUnauthorized: false } })
  await client.connect()

  const res = await client.query(`
    SELECT id, full_name, mobile, source_sheet 
    FROM leads 
    WHERE full_name ILIKE '%NATIK%' 
       OR full_name ILIKE '%NAITIK%';
  `)

  console.log('Found NATIK VARMA leads:', res.rows)

  if (res.rows.length > 0) {
    const ids = res.rows.map(r => `'${r.id}'`).join(',')
    await client.query(`DELETE FROM lead_activities WHERE lead_id IN (${ids});`)
    await client.query(`DELETE FROM follow_ups WHERE lead_id IN (${ids});`)
    await client.query(`DELETE FROM leads WHERE id IN (${ids});`)
    console.log(`✅ Removed ${res.rows.length} NATIK VARMA lead(s) from database!`)
  }

  await client.end()
}

deleteNatik().catch(console.error)
