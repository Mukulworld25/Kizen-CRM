import pkg from 'pg'
const { Pool } = pkg
import { readFileSync } from 'fs'

// The connection string used to be hardcoded here (including the plaintext DB
// password), which committed a live production credential to git. It is now
// read from the environment: set DATABASE_URL (and optionally
// DATABASE_URL_DIRECT for the non-pooler fallback).
const connectionString = process.env.DATABASE_URL
const directConnectionString = process.env.DATABASE_URL_DIRECT

if (!connectionString) {
  console.error(
    'DATABASE_URL is not set.\n' +
    'Usage: $env:DATABASE_URL = "postgresql://<user>:<password>@<host>:6543/postgres"; node apply-all-migrations.mjs'
  )
  process.exit(1)
}

async function main() {
  console.log('=== APPLYING ALL MIGRATIONS VIA DIRECT POSTGRES POOL ===\n')

  let pool
  try {
    pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
    const res = await pool.query('SELECT current_database(), current_user;')
    console.log('✓ Connected to Postgres DB:', res.rows[0])
  } catch (err) {
    if (!directConnectionString) throw err
    console.log('Pool connection failed, trying direct DB host...')
    pool = new Pool({
      connectionString: directConnectionString,
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
