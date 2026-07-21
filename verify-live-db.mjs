import { createClient } from '@supabase/supabase-js'

const SU = 'https://zmqvjtenuxlvwfopfroc.supabase.co'
const SK = 'sb_publishable_ezZ7_UyticpI7aeLKY3Rew_i_FaZBDh'
const supabase = createClient(SU, SK)

async function main() {
  const si = await supabase.auth.signInWithPassword({ email: 'shivam.kizen.test@gmail.com', password: 'Shivam@123' })
  if (si.error) {
    console.error('Auth error:', si.error.message)
    return
  }

  console.log('--- QUERY 1: Columns on leads table ---')
  const { data: leadsSample, error: leadsErr } = await supabase
    .from('leads')
    .select('pipeline_stage, days_to_first_contact, counselor_name, hot_lead_status')
    .limit(1)
  console.log('Query 1 Result (leads select):', leadsErr ? `ERROR: ${leadsErr.message}` : JSON.stringify(leadsSample))

  console.log('\n--- QUERY 3: Views check ---')
  const { data: v1, error: errV1 } = await supabase.from('v_leads_analytics').select('*').limit(1)
  console.log('v_leads_analytics check:', errV1 ? `ERROR: ${errV1.message}` : JSON.stringify(v1))

  const { data: v2, error: errV2 } = await supabase.from('dashboard_summary').select('*').limit(1)
  console.log('dashboard_summary check:', errV2 ? `ERROR: ${errV2.message}` : JSON.stringify(v2))

  console.log('\n--- QUERY 4: data_templates table ---')
  const { data: templates, error: err4 } = await supabase.from('data_templates').select('*')
  console.log('data_templates Result:', err4 ? `ERROR: ${err4.message}` : JSON.stringify(templates, null, 2))
}

main().catch(console.error)
