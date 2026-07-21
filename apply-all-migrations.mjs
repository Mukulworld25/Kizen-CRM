import pkg from 'pg'
const { Pool } = pkg
import { readFileSync } from 'fs'

const connectionString = 'postgresql://postgres.zmqvjtenuxlvwfopfroc:Shivam%40123@aws-0-ap-south-1.pooler.supabase.com:6543/postgres'

async function main() {
  console.log('=== APPLYING ALL MIGRATIONS VIA DIRECT POSTGRES POOL ===\n')

  let pool
  try {
    pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
    const res = await pool.query('SELECT current_database(), current_user;')
    console.log('✓ Connected to Postgres DB:', res.rows[0])
  } catch (err) {
    console.log('Pool connection failed, trying direct DB host...')
    pool = new Pool({
      connectionString: 'postgresql://postgres:Shivam%40123@db.zmqvjtenuxlvwfopfroc.supabase.co:5432/postgres',
      ssl: { rejectUnauthorized: false }
    })
    const res = await pool.query('SELECT current_database(), current_user;')
    console.log('✓ Connected to Direct Postgres DB:', res.rows[0])
  }

  const files = [
    '012_auto_intake_system.sql',
    '013_entity_linking_historical_import.sql',
    '014_display_ids_name_search.sql',
    '015_phase3c_schema_corrections.sql',
  ]

  for (const file of files) {
    console.log(`\n--- Executing ${file} ---`)
    const sql = readFileSync(file, 'utf8')
    try {
      await pool.query(sql)
      console.log(`✓ ${file} executed successfully!`)
    } catch (err) {
      console.error(`❌ Error in ${file}:`, err.message)
    }
  }

  await pool.end()
  console.log('\n=== ALL MIGRATIONS COMPLETED ===')
}

main().catch(console.error)
