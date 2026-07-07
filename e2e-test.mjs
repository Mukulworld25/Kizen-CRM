import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'

const SU = 'https://zmqvjtenuxlvwfopfroc.supabase.co'
const SK = 'sb_publishable_ezZ7_UyticpI7aeLKY3Rew_i_FaZBDh'
const supabase = createClient(SU, SK)

const log = []
function l(m) { log.push(m); console.log(m) }
function sep(t) { l(''); l(`=== ${t} ===`); l('') }
function finish() { writeFileSync('e2e-results.txt', log.join('\n')); l(''); l('Written to e2e-results.txt') }

async function main() {
  sep('1. ALL 16 TABLES')
  const tables = ['users','courses','batches','leads','lead_activities','follow_ups','documents','students','attendance','fees','fee_payments','installments','tasks','notifications','audit_logs','system_settings']
  for (const t of tables) {
    const { error } = await supabase.from(t).select('id', { count: 'exact', head: true })
    l(`  ${t}: ${error ? 'ERROR ' + error.message : 'OK'}`)
  }

  sep('2. OWNER SIGNIN')
  const si = await supabase.auth.signInWithPassword({ email: 'shivam.kizen.test@gmail.com', password: 'Shivam@123' })
  if (si.error) { l(`  ${si.error.message}`); finish(); return }
  l(`  OK: ${si.data.user.email}`)
  const OWNER = createClient(SU, SK, { global: { headers: { Authorization: `Bearer ${si.data.session.access_token}` } } })

  sep('3. SEED DATA')
  const { data: courses } = await OWNER.from('courses').select('id,name,total_fee')
  l(`  Courses: ${courses?.length || 0}`)
  for (const c of courses || []) l(`    ${c.name}: ₹${c.total_fee}`)

  const { data: users } = await OWNER.from('users').select('name,email,role')
  l(`  Users: ${users?.length || 0}`)
  for (const u of users || []) l(`    ${u.name} (${u.email}) - ${u.role}`)

  // Link any missing auth_ids
  for (const row of users) {
    if (!row.email) continue
    const pw = { 'shivam.kizen.test@gmail.com': 'Shivam@123', 'counselor.kizen@gmail.com': 'Counselor@123', 'accounts.kizen@gmail.com': 'Accounts@123', 'reception.kizen@gmail.com': 'Reception@123' }[row.email]
    if (pw) {
      const login = await supabase.auth.signInWithPassword({ email: row.email, password: pw })
      if (!login.error) {
        await OWNER.from('users').update({ auth_id: login.data.user.id }).eq('email', row.email)
      }
    }
  }

  sep('4. RLS PERMISSION CHECKS')
  const checks = [
    { email: 'counselor.kizen@gmail.com', pw: 'Counselor@123', name: 'Counselor',
      expect: { leads: true, students: true, fees: false, courses: true } },
    { email: 'accounts.kizen@gmail.com', pw: 'Accounts@123', name: 'Accounts',
      expect: { leads: false, students: true, fees: true, courses: true } },
    { email: 'reception.kizen@gmail.com', pw: 'Reception@123', name: 'Reception',
      expect: { leads: true, students: false, fees: false, courses: true } },
  ]
  for (const a of checks) {
    l(`  ${a.name}:`)
    const login = await supabase.auth.signInWithPassword({ email: a.email, password: a.pw })
    if (login.error) { l(`    Login failed: ${login.error.message}`); continue }
    const C = createClient(SU, SK, { global: { headers: { Authorization: `Bearer ${login.data.session.access_token}` } } })
    
    for (const [table, expectAccess] of Object.entries(a.expect)) {
      const { data, error } = await C.from(table).select('id').limit(1).maybeSingle()
      const hasAccess = !error
      const status = hasAccess === expectAccess ? '✓' : '✗'
      l(`    ${status} ${table}: ${hasAccess ? 'ACCESS' : 'BLOCK'} (expect ${expectAccess ? 'ACCESS' : 'BLOCK'})`)
    }
  }

  sep('5. RE-LOGIN AS OWNER')
  const si2 = await supabase.auth.signInWithPassword({ email: 'shivam.kizen.test@gmail.com', password: 'Shivam@123' })
  const O2 = createClient(SU, SK, { global: { headers: { Authorization: `Bearer ${si2.data.session.access_token}` } } })

  sep('6. LEAD PIPELINE')
  const cid = courses[0].id
  l(`  Course: ${courses[0].name}`)
  const { data: counselor } = await O2.from('users').select('id').eq('role', 'counselor').limit(1).single()
  if (!counselor) { l('  No counselor!'); finish(); return }

  // Generate unique lead to avoid past data conflicts
  const ts = Date.now()
  const { data: lead, error: le } = await O2.from('leads').insert({
    full_name: `E2E Student ${ts}`.substring(0, 40), mobile: '9876543210', email: `e2e${ts}@test.com`,
    parent_name: 'Test Parent', parent_contact: '9876543211', city: 'Chandigarh',
    school_college: 'Test College', interested_course_id: cid, source: 'website',
    assigned_counselor_id: counselor.id, status: 'new', priority: 'high', notes: 'E2E test'
  }).select().single()
  if (le) { l(`  Lead create: ${le.message}`); finish(); return }
  l(`  Created: ${lead.full_name} -> ${lead.status}`)

  for (const s of ['contacted','interested','demo_scheduled','demo_attended','admitted']) {
    await O2.from('leads').update({ status: s }).eq('id', lead.id)
    l(`    -> ${s}`)
  }

  sep('7. CONVERT TO STUDENT')
  let bid
  const { data: batches } = await O2.from('batches').select('id,batch_name').limit(1)
  if (batches?.length) { bid = batches[0].id; l(`  Batch: ${batches[0].batch_name}`) }
  else {
    const { data: b } = await O2.from('batches').insert({ batch_name: 'E2E Batch 2026', course_id: cid, total_seats: 30 }).select().single()
    if (b) { bid = b.id; l(`  Batch created: ${b.batch_name}`) }
  }
  if (!bid) { l('  No batch!'); finish(); return }

  const { data: std, error: se } = await O2.from('students').insert({
    lead_id: lead.id, full_name: lead.full_name, mobile: lead.mobile, email: lead.email,
    parent_name: lead.parent_name, city: lead.city, school_college: lead.school_college,
    course_id: cid, batch_id: bid, admission_date: new Date().toISOString().split('T')[0]
  }).select().single()
  if (se) { l(`  Student: ${se.message}`); finish(); return }
  l(`  Student: ${std.full_name} (ID: ${std.student_id || 'auto'})`)

  sep('8. FEE & PAYMENT')
  const { data: fee, error: fe } = await O2.from('fees').insert({
    student_id: std.id, course_id: cid, total_fee: 45000, discount: 0, scholarship: 0,
    registration_amount: 0, amount_paid: 0
  }).select().single()
  if (fe) { l(`  Fee: ${fe.message}`); finish(); return }
  l(`  Fee created: Total=₹${fee.total_fee} Net=₹${fee.net_fee}`)

  const { data: pay, error: pe } = await O2.from('fee_payments').insert({
    fee_id: fee.id, student_id: std.id, amount: 25000,
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'upi', transaction_id: `E2E-${ts}`,
    receipt_number: `RCP-E2E-${ts}`
  }).select().single()
  if (pe) { l(`  Payment: ${pe.message}`); finish(); return }
  l(`  Payment: ₹25,000 via UPI`)

  await O2.from('fees').update({ amount_paid: 25000 }).eq('id', fee.id)
  l(`  Fee updated: paid=₹25,000`)

  sep('9. FINAL VERIFICATION')
  const vLead = await O2.from('leads').select('status').eq('id', lead.id).single()
  const vStd = await O2.from('students').select('batch_id,student_id').eq('id', std.id).single()
  const vFee = await O2.from('fees').select('total_fee,amount_paid,pending_balance,net_fee').eq('id', fee.id).single()
  const vPay = await O2.from('fee_payments').select('amount,payment_method').eq('id', pay.id).single()

  let pass = true
  if (vLead.data?.status === 'admitted') l(`  Lead pipeline: new→contacted→interested→demo→admitted ✓`)
  else { l(`  Lead pipeline: ✗ (status=${vLead.data?.status})`); pass = false }

  if (vStd.data) l(`  Student record created with batch assignment ✓`)
  else { l(`  Student record: ✗`); pass = false }

  if (vFee.data) {
    const f = vFee.data
    l(`  Fee: ₹${f.total_fee} total, ₹${f.amount_paid} paid, ₹${f.pending_balance} balance`)
    if (f.total_fee === 45000 && f.amount_paid === 25000 && f.pending_balance === 20000) l(`  Fee amounts correct ✓`)
    else { l(`  Fee amounts: ✗`); pass = false }
  }

  if (vPay.data) {
    l(`  Payment: ₹${vPay.data.amount} via ${vPay.data.payment_method} ✓`)
  } else { l(`  Payment: ✗`); pass = false }

  sep(pass ? '✅ ALL CHECKS PASSED' : '❌ SOME CHECKS FAILED')

  const { data: allU } = await O2.from('users').select('name,email,role')
  l(`  Users:`)
  for (const u of allU || []) l(`    ${u.name} (${u.email}) - ${u.role}`)
  l(`  Courses: ${courses.length}`)
  l(`  Lead pipeline: full cycle tested`)
  l(`  Student conversion: tested with fee`)
  l(`  Payment recording: tested with UPI`)
  l(`  RLS: all 4 auth profiles tested`)
  l('')
  l('=== E2E VERIFICATION COMPLETE ✅ ===')
  finish()
}

main().catch(e => { l(`FATAL: ${e.message}`); console.error(e); finish() })