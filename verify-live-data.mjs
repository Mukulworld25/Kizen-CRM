import { createClient } from '@supabase/supabase-js'

const SU = 'https://zmqvjtenuxlvwfopfroc.supabase.co'
const SK = 'sb_publishable_ezZ7_UyticpI7aeLKY3Rew_i_FaZBDh'
const supabase = createClient(SU, SK)

async function main() {
  console.log('================================================================')
  console.log('  KIZEN CRM — LIVE DATABASE AUDIT & VERIFICATION')
  console.log('================================================================\n')

  // Auth
  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: 'shivam.kizen.test@gmail.com',
    password: 'Shivam@123'
  })
  if (authErr) { console.error('Auth failed:', authErr.message); return }

  // ==================== USERS ====================
  console.log('--- 1. TEAM / USERS ---')
  const { data: users, count: userCount } = await supabase.from('users').select('id, name, email, role, is_active, is_owner', { count: 'exact' })
  console.log(`Total users: ${userCount}`)
  users?.forEach(u => console.log(`  [${u.role}] ${u.name} (${u.email}) active=${u.is_active} owner=${u.is_owner}`))

  // ==================== LEADS ====================
  console.log('\n--- 2. LEADS ---')
  const { count: totalLeads } = await supabase.from('leads').select('id', { count: 'exact', head: true })
  console.log(`Total leads: ${totalLeads}`)

  // By status
  const statuses = ['new', 'contacted', 'pending', 'follow_up_required', 'demo_scheduled', 'demo_attended', 'interested', 'negotiation', 'application_started', 'admitted', 'lost', 'not_interested', 'future_prospect', 'closed', 'enrolled']
  console.log('  Leads by status:')
  for (const s of statuses) {
    const { count } = await supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', s)
    if (count > 0) console.log(`    ${s}: ${count}`)
  }

  // By source
  console.log('  Leads by source:')
  const sources = ['instagram', 'facebook', 'walk_in', 'referral', 'website', 'whatsapp', 'college_visit', 'other']
  for (const s of sources) {
    const { count } = await supabase.from('leads').select('id', { count: 'exact', head: true }).eq('source', s)
    if (count > 0) console.log(`    ${s}: ${count}`)
  }

  // By temperature
  console.log('  Leads by temperature:')
  const temps = ['hot', 'warm', 'cold']
  for (const t of temps) {
    const { count } = await supabase.from('leads').select('id', { count: 'exact', head: true }).eq('temperature', t)
    if (count > 0) console.log(`    ${t}: ${count}`)
  }

  // By counselor
  console.log('  Leads by assigned counselor:')
  for (const u of (users || [])) {
    const { count } = await supabase.from('leads').select('id', { count: 'exact', head: true }).eq('assigned_counselor_id', u.id)
    if (count > 0) console.log(`    ${u.name}: ${count}`)
  }

  // Leads with referral
  const { count: referralCount } = await supabase.from('leads').select('id', { count: 'exact', head: true }).not('referred_by_lead_id', 'is', null)
  console.log(`  Leads with referred_by_lead_id: ${referralCount}`)

  // ==================== STUDENTS ====================
  console.log('\n--- 3. STUDENTS ---')
  const { count: totalStudents } = await supabase.from('students').select('id', { count: 'exact', head: true })
  console.log(`Total students: ${totalStudents}`)

  const { data: students } = await supabase.from('students').select('id, full_name, mobile, is_active')
  students?.forEach(s => console.log(`  ${s.full_name} (${s.mobile}) active=${s.is_active}`))

  // ==================== FEES ====================
  console.log('\n--- 4. FEES ---')
  const { data: fees, count: feeCount } = await supabase.from('fees').select('id, student_id, total_fee, amount_paid, pending_balance, student:students(full_name)', { count: 'exact' })
  console.log(`Total fee records: ${feeCount}`)
  fees?.forEach(f => {
    const sName = f.student?.full_name || 'Unknown'
    console.log(`  ${sName}: Total=₹${f.total_fee} Paid=₹${f.amount_paid} Pending=₹${f.pending_balance}`)
  })

  // ==================== INSTALLMENTS ====================
  console.log('\n--- 5. INSTALLMENTS ---')
  const { data: installments, count: instCount } = await supabase.from('installments').select('id, student_id, installment_number, amount, due_date, status, student:students(full_name)', { count: 'exact' })
  console.log(`Total installments: ${instCount}`)

  // Group by student
  const byStudent = {}
  installments?.forEach(inst => {
    const name = inst.student?.full_name || 'Unknown'
    if (!byStudent[name]) byStudent[name] = []
    byStudent[name].push(inst)
  })
  for (const [name, insts] of Object.entries(byStudent)) {
    console.log(`  ${name}:`)
    insts.sort((a, b) => a.installment_number - b.installment_number)
    insts.forEach(i => console.log(`    #${i.installment_number}: ₹${i.amount} due=${i.due_date} status=${i.status}`))
  }

  // ==================== FOLLOW-UPS ====================
  console.log('\n--- 6. FOLLOW-UPS ---')
  const { count: totalFU } = await supabase.from('follow_ups').select('id', { count: 'exact', head: true })
  console.log(`Total follow-ups: ${totalFU}`)

  const { count: pendingFU } = await supabase.from('follow_ups').select('id', { count: 'exact', head: true }).eq('status', 'pending')
  const { count: completedFU } = await supabase.from('follow_ups').select('id', { count: 'exact', head: true }).eq('status', 'completed')
  console.log(`  Pending: ${pendingFU}`)
  console.log(`  Completed: ${completedFU}`)

  // Today's follow-ups
  const today = new Date().toISOString().split('T')[0]
  const { count: todayFU } = await supabase.from('follow_ups').select('id', { count: 'exact', head: true })
    .gte('scheduled_at', `${today}T00:00:00`)
    .lte('scheduled_at', `${today}T23:59:59`)
    .eq('status', 'pending')
  console.log(`  Due today (${today}): ${todayFU}`)

  // ==================== COURSES ====================
  console.log('\n--- 7. COURSES ---')
  const { data: courses } = await supabase.from('courses').select('id, name, category, fee')
  console.log(`Total courses: ${courses?.length || 0}`)
  courses?.forEach(c => console.log(`  ${c.name} (${c.category}) ₹${c.fee}`))

  // ==================== SUMMARY ====================
  console.log('\n================================================================')
  console.log('  DASHBOARD INSIGHT NUMBERS (what CRM should display)')
  console.log('================================================================')
  console.log(`  Total Leads:      ${totalLeads}`)
  console.log(`  Total Students:   ${totalStudents}`)
  console.log(`  Total Fee Records: ${feeCount}`)
  console.log(`  Total Installments: ${instCount}`)
  console.log(`  Total Follow-ups: ${totalFU} (${pendingFU} pending, ${completedFU} completed)`)
  console.log(`  Today's Tasks:    ${todayFU}`)
  console.log(`  Team Members:     ${userCount}`)

  // Total fee collection
  let totalCollection = 0
  let totalPending = 0
  fees?.forEach(f => {
    totalCollection += parseFloat(f.amount_paid || 0)
    totalPending += parseFloat(f.pending_balance || 0)
  })
  console.log(`  Total Fee Collected: ₹${totalCollection.toLocaleString('en-IN')}`)
  console.log(`  Total Fee Pending:   ₹${totalPending.toLocaleString('en-IN')}`)
  console.log('================================================================\n')
}

main().catch(err => console.error(err))
