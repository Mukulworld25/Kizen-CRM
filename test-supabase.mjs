import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'

const supabaseUrl = 'https://zmqvjtenuxlvwfopfroc.supabase.co'
const supabaseKey = 'sb_publishable_ezZ7_UyticpI7aeLKY3Rew_i_FaZBDh'
const supabase = createClient(supabaseUrl, supabaseKey)

const results = []

async function test() {
  const tables = ['users', 'courses', 'leads', 'students', 'fees', 'follow_ups', 'batches', 'system_settings', 'lead_activities', 'attendance', 'fee_payments', 'installments', 'tasks', 'notifications', 'audit_logs', 'documents']

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('count', { count: 'exact', head: true })
      if (error) {
        results.push(`${table}: ERROR - ${error.message}`)
      } else {
        results.push(`${table}: OK - exists`)
      }
    } catch (e) {
      results.push(`${table}: FETCH ERROR - ${e.message}`)
    }
  }

  writeFileSync('supabase-check-results.txt', results.join('\n'))
  console.log('Results written to supabase-check-results.txt')
  console.log(results.join('\n'))
}

test()