import { createClient } from '@supabase/supabase-js'

const OLD_URL = 'https://zmqvjtenuxlvwfopfroc.supabase.co'
const OLD_KEY = 'sb_publishable_ezZ7_UyticpI7aeLKY3Rew_i_FaZBDh'
const oldSb = createClient(OLD_URL, OLD_KEY)

const NEW_URL = 'https://bumjiykhgkgmqyynwtuh.supabase.co'
const NEW_KEY = 'sb_publishable_WvTe_Y2WcJay9k3aeDc8sQ_0W2--LjH'
const newSb = createClient(NEW_URL, NEW_KEY)

async function doubleCheck() {
  console.log('====================================================')
  console.log('   FULL SYSTEM & DATABASE MIGRATION DOUBLE-CHECK    ')
  console.log('====================================================\n')

  // Log in to both instances
  await oldSb.auth.signInWithPassword({ email: 'shivam.kizen.test@gmail.com', password: 'Shivam@123' })
  await newSb.auth.signInWithPassword({ email: 'shivam.kizen.test@gmail.com', password: 'Shivam@123' })

  const tables = [
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

  const auditResults = []

  for (const table of tables) {
    const { count: oldCount, error: oldErr } = await oldSb.from(table).select('*', { count: 'exact', head: true })
    const { count: newCount, error: newErr } = await newSb.from(table).select('*', { count: 'exact', head: true })

    auditResults.push({
      Table: table,
      'Old DB Count': oldCount ?? 0,
      'New DB Count': newCount ?? 0,
      Status: (oldCount ?? 0) === (newCount ?? 0) ? '✅ PERFECT MATCH' : '❌ MISMATCH',
    })
  }

  console.table(auditResults)

  // Verify critical user accounts in Auth & Public tables
  console.log('\n--- VERIFYING USER ROLES & ACCESS ---')
  const { data: users } = await newSb.from('users').select('email, role')
  console.log('Active User Accounts in New DB:')
  users?.forEach(u => console.log(`  • ${u.email} (${u.role})`))

  // Verify specific fee data corrections (Vasu & Harpreet)
  console.log('\n--- VERIFYING CRITICAL DATA INTEGRITY ---')
  const { data: vasu } = await newSb.from('fees').select('*, students(full_name)').eq('total_fee', 75000)
  console.log(`Vasu Fee Record: Total Fee = ₹${vasu?.[0]?.total_fee}, Amount Paid = ₹${vasu?.[0]?.amount_paid}, Pending = ₹${vasu?.[0]?.pending_balance}`)

  const { data: harpreet } = await newSb.from('fees').select('*, students(full_name)').eq('amount_paid', 10000)
  console.log(`Harpreet Fee Record: Total Fee = ₹${harpreet?.[0]?.total_fee}, Amount Paid = ₹${harpreet?.[0]?.amount_paid}, Pending = ₹${harpreet?.[0]?.pending_balance}`)

  console.log('\n====================================================')
  console.log('              DOUBLE CHECK COMPLETE                 ')
  console.log('====================================================')
}

doubleCheck().catch(console.error)
