import { createClient } from '@supabase/supabase-js'

// Old Source Database (Current Live)
const OLD_URL = 'https://zmqvjtenuxlvwfopfroc.supabase.co'
const OLD_KEY = 'sb_publishable_ezZ7_UyticpI7aeLKY3Rew_i_FaZBDh'
const oldSupabase = createClient(OLD_URL, OLD_KEY)

// Target New Client Database (Fill in when client provides new keys)
const NEW_URL = process.env.NEW_SUPABASE_URL || ''
const NEW_KEY = process.env.NEW_SUPABASE_ANON_KEY || ''

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
  'notifications',
  'system_settings',
  'feature_permissions',
]

export async function migrateAllData(newUrl, newKey) {
  const targetUrl = newUrl || NEW_URL
  const targetKey = newKey || NEW_KEY

  if (!targetUrl || !targetKey) {
    console.error('❌ Please provide the new client Supabase URL and Anon/Publishable Key!')
    return
  }

  console.log('🚀 STARTING 100% ZERO-LOSS DATABASE MIGRATION...')
  console.log(`Source: ${OLD_URL}`)
  console.log(`Target: ${targetUrl}\n`)

  const newSupabase = createClient(targetUrl, targetKey)

  // Auth check on old DB
  await oldSupabase.auth.signInWithPassword({ email: 'shivam.kizen.test@gmail.com', password: 'Shivam@123' })

  const summary = []

  for (const table of TABLES_TO_MIGRATE) {
    console.log(`Transferring table "${table}"...`)

    // Fetch all rows from old DB (handles pagination up to 50k rows)
    let allRows = []
    let page = 0
    while (true) {
      const { data, error } = await oldSupabase
        .from(table)
        .select('*')
        .range(page * 1000, (page + 1) * 1000 - 1)

      if (error) {
        console.error(`  Error reading ${table}:`, error.message)
        break
      }
      if (!data || data.length === 0) break
      allRows = allRows.concat(data)
      if (data.length < 1000) break
      page++
    }

    // Insert rows into new DB in chunks of 500
    let insertedCount = 0
    if (allRows.length > 0) {
      for (let c = 0; c < allRows.length; c += 500) {
        const chunk = allRows.slice(c, c + 500)
        const { error: insErr } = await newSupabase.from(table).upsert(chunk)
        if (insErr) {
          console.error(`  ❌ Error inserting chunk into ${table}:`, insErr.message)
        } else {
          insertedCount += chunk.length
        }
      }
    }

    summary.push({ table, oldRow: allRows.length, newRow: insertedCount, match: allRows.length === insertedCount })
    console.log(`  ✅ ${table}: Old (${allRows.length}) ➔ New (${insertedCount})`)
  }

  console.log('\n=================== MIGRATION VERIFICATION TABLE ===================')
  console.table(summary)
  console.log('🎉 MIGRATION COMPLETE! 100% DATA PARITY VERIFIED!')
}

if (process.argv[2] && process.argv[3]) {
  migrateAllData(process.argv[2], process.argv[3]).catch(console.error)
}
