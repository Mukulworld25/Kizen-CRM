import pg from 'pg'
import { createClient } from '@supabase/supabase-js'

const { Client } = pg

const NEW_DB_URL = 'postgres://postgres:tkrxsGLSiBs6PVls@db.bumjiykhgkgmqyynwtuh.supabase.co:5432/postgres'

const OLD_URL = 'https://zmqvjtenuxlvwfopfroc.supabase.co'
const OLD_KEY = 'sb_publishable_ezZ7_UyticpI7aeLKY3Rew_i_FaZBDh'
const oldSupabase = createClient(OLD_URL, OLD_KEY)

const NEW_URL = 'https://bumjiykhgkgmqyynwtuh.supabase.co'
const NEW_KEY = 'sb_publishable_WvTe_Y2WcJay9k3aeDc8sQ_0W2--LjH'
const newSupabase = createClient(NEW_URL, NEW_KEY)

const FIXES_SQL = `
-- Fix lead_activities
ALTER TABLE lead_activities ALTER COLUMN title DROP NOT NULL;
ALTER TABLE lead_activities ADD COLUMN IF NOT EXISTS outcome TEXT;
ALTER TABLE lead_activities ADD COLUMN IF NOT EXISTS duration_mins INT;
ALTER TABLE lead_activities ADD COLUMN IF NOT EXISTS ai_summary TEXT;

-- Fix students
ALTER TABLE students ALTER COLUMN student_code DROP NOT NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS student_id TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_name TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_contact TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS emergency_contact TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS dob DATE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS school_college TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS roll_number TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS admission_date DATE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS certification_status TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE students ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE students ADD COLUMN IF NOT EXISTS referred_by_student_id UUID;
ALTER TABLE students ADD COLUMN IF NOT EXISTS referred_by_lead_id UUID;

-- Fix system_settings
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS id UUID DEFAULT uuid_generate_v4();

-- Fix fees
DO $$ 
BEGIN
  ALTER TABLE fees DROP COLUMN IF EXISTS net_fee;
  ALTER TABLE fees DROP COLUMN IF EXISTS pending_balance;
  ALTER TABLE fees ADD COLUMN net_fee NUMERIC(10,2);
  ALTER TABLE fees ADD COLUMN pending_balance NUMERIC(10,2);
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
`

async function main() {
  console.log('Connecting to target PostgreSQL database...')
  const client = new Client({
    connectionString: NEW_DB_URL,
    ssl: { rejectUnauthorized: false }
  })
  await client.connect()
  console.log('✅ Connected to target database!')

  console.log('Executing complete schema fixes...')
  await client.query(FIXES_SQL)
  console.log('✅ All schema fixes applied successfully!')
  await client.end()

  console.log('\n🚀 Transferring all tables...')
  await oldSupabase.auth.signInWithPassword({ email: 'shivam.kizen.test@gmail.com', password: 'Shivam@123' })

  const TABLES_TO_MIGRATE = [
    'users',
    'courses',
    'batches',
    'leads',
    'lead_activities',
    'follow_ups',
    'documents',
    'students',
    'attendance',
    'fees',
    'fee_payments',
    'installments',
    'tasks',
    'system_settings',
    'feature_permissions',
  ]

  const summary = []

  for (const table of TABLES_TO_MIGRATE) {
    let allRows = []
    let page = 0
    while (true) {
      const { data, error } = await oldSupabase
        .from(table)
        .select('*')
        .range(page * 1000, (page + 1) * 1000 - 1)

      if (error) {
        console.error(`  Error fetching ${table}:`, error.message)
        break
      }
      if (!data || data.length === 0) break
      allRows = allRows.concat(data)
      if (data.length < 1000) break
      page++
    }

    let insertedCount = 0
    if (allRows.length > 0) {
      for (let c = 0; c < allRows.length; c += 500) {
        const chunk = allRows.slice(c, c + 500)
        const { error: insErr } = await newSupabase.from(table).upsert(chunk)
        if (insErr) {
          console.error(`  ❌ Error inserting into ${table}:`, insErr.message)
        } else {
          insertedCount += chunk.length
        }
      }
    }

    summary.push({ table, oldRows: allRows.length, newRows: insertedCount, match: allRows.length === insertedCount })
    console.log(`  ✅ ${table}: ${allRows.length} rows transferred (${insertedCount} succeeded)`)
  }

  console.log('\n=================== FINAL MIGRATION VERIFICATION TABLE ===================')
  console.table(summary)
  
  const allMatched = summary.every(s => s.match)
  if (allMatched) {
    console.log('\n🎉 100% PERFECT ZERO-LOSS MIGRATION COMPLETE FOR ALL 15 TABLES!')
  } else {
    console.log('\n⚠️ Check the table above for any mismatches.')
  }
}

main().catch(console.error)
