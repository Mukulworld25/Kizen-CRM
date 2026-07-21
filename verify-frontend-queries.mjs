import { createClient } from '@supabase/supabase-js'

const SU = 'https://zmqvjtenuxlvwfopfroc.supabase.co'
const SK = 'sb_publishable_ezZ7_UyticpI7aeLKY3Rew_i_FaZBDh'
const supabase = createClient(SU, SK)

async function testFrontendData() {
  console.log('=====================================================')
  console.log('  KIZEN CRM — LOCAL DEV SERVER LIVE DATA VERIFICATION')
  console.log('  Local Dev Server URL: http://localhost:5173/')
  console.log('=====================================================\n')

  const si = await supabase.auth.signInWithPassword({ email: 'shivam.kizen.test@gmail.com', password: 'Shivam@123' })
  if (si.error) {
    console.error('Auth error:', si.error.message)
    return
  }

  // 1. Dashboard View Query
  const { data: summary } = await supabase.from('dashboard_summary').select('*').single()
  console.log('📊 1. DASHBOARD SUMMARY VIEW (Live Data Numbers):')
  console.log(`   - Total Leads:              ${summary.total_leads}`)
  console.log(`   - Conversion Rate:          ${summary.conversion_rate_percent}%`)
  console.log(`   - Avg Speed to Lead:        ${summary.avg_days_to_first_contact} days`)
  console.log(`   - Pipeline Stages:          `, summary.leads_by_stage)
  console.log(`   - Top Cities:               `, summary.leads_by_city)
  console.log(`   - Counselor Assignments:   `, summary.leads_by_counselor)

  // 2. Global Search Query Test (Searching by Name and Display ID)
  console.log('\n🔍 2. GLOBAL SEARCH TEST:')
  const { data: searchByName } = await supabase
    .from('leads')
    .select('id, full_name, mobile, display_id')
    .ilike('full_name', '%RAJAT%')
    .limit(3)
  console.log('   Search "RAJAT":', searchByName)

  const { data: searchByDisplayId } = await supabase
    .from('leads')
    .select('id, full_name, mobile, display_id')
    .ilike('display_id', '%LD-2026-0001%')
    .limit(1)
  console.log('   Search "LD-2026-0001":', searchByDisplayId)

  // 3. 360 Relational View Query Test for first lead
  console.log('\n👁️ 3. 360° RELATIONAL VIEW TEST:')
  if (searchByName && searchByName.length > 0) {
    const leadId = searchByName[0].id
    const [leadRes, feeRes, auditRes] = await Promise.all([
      supabase.from('leads').select('*').eq('id', leadId).single(),
      supabase.from('fee_payments').select('*, fee_installments(*)').eq('lead_id', leadId),
      supabase.from('import_audit_log').select('*').order('timestamp', { ascending: false }).limit(3)
    ])
    console.log(`   Lead 360° Info (${searchByName[0].full_name} | ${searchByName[0].display_id}):`)
    console.log('   - Core Info:', leadRes.data ? `${leadRes.data.full_name} (${leadRes.data.mobile}) | Stage: ${leadRes.data.pipeline_stage} | City: ${leadRes.data.city}` : 'None')
    console.log('   - Linked Fees:', feeRes.data?.length || 0, 'payment records')
    console.log('   - Audit Logs:', auditRes.data?.length || 0, 'recent entries')
  }

  // 4. Settings Data Intake Tab Audit Trail Test
  console.log('\n⚙️ 4. DATA INTAKE TAB AUDIT LOGS:')
  const { data: recentLogs } = await supabase
    .from('import_audit_log')
    .select('section, filename_source, row_count_imported, row_count_rejected_skipped, status, timestamp')
    .order('timestamp', { ascending: false })
    .limit(5)
  console.table(recentLogs)
}

testFrontendData().catch(console.error)
