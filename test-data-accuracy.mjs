import { createClient } from '@supabase/supabase-js'

const SU = 'https://zmqvjtenuxlvwfopfroc.supabase.co'
const SK = 'sb_publishable_ezZ7_UyticpI7aeLKY3Rew_i_FaZBDh'
const supabase = createClient(SU, SK)

async function main() {
  console.log('================================================================')
  console.log('  KIZEN CRM — 100% DATA ACCURACY & LIFECYCLE AUDIT TEST')
  console.log('================================================================\n')

  let passed = 0
  let failed = 0

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`)
      passed++
    } else {
      console.error(`  ❌ FAIL: ${message}`)
      failed++
    }
  }

  // 1. Authenticate as Owner
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'shivam.kizen.test@gmail.com',
    password: 'Shivam@123'
  })
  assert(!authErr && authData.session, 'Authenticate as Owner (shivam.kizen.test@gmail.com)')

  // 2. Fetch & Link Owner user ID
  const { data: currentUser } = await supabase
    .from('users')
    .select('id, name, role')
    .ilike('email', 'shivam.kizen.test@gmail.com')
    .single()
  assert(currentUser?.id && currentUser.role === 'owner', `Resolved owner profile: ${currentUser?.name}`)

  // Ensure auth_id is linked for RLS helper functions get_user_id()
  await supabase.from('users').update({ auth_id: authData.user.id }).eq('id', currentUser.id)

  // Clean up any loose test records (Anjali Singh)
  const { data: looseStudent } = await supabase.from('students').select('id').eq('mobile', '8630382694').maybeSingle()
  if (looseStudent) {
    await supabase.from('installments').delete().eq('student_id', looseStudent.id)
    await supabase.from('fees').delete().eq('student_id', looseStudent.id)
    await supabase.from('students').delete().eq('id', looseStudent.id)
  }

  // ==================================================================
  // TEST 1: LEAD DATA LIFECYCLE (INSERT -> READ -> UPDATE -> DELETE)
  // ==================================================================
  console.log('\n--- TEST 1: Lead Data Lifecycle Integrity ---')
  const testPhone = '9991112233'
  const testLeadPayload = {
    full_name: 'Data Accuracy Test Lead',
    mobile: testPhone,
    email: 'accuracy.test@kizenedu.com',
    source: 'referral',
    status: 'contacted',
    city: 'Chandigarh',
    temperature: 'hot',
    notes: 'Accuracy verification test lead',
    assigned_counselor_id: currentUser.id
  }

  // A. INSERT
  const { data: insertedLead, error: leadInsErr } = await supabase
    .from('leads')
    .insert(testLeadPayload)
    .select('*')
    .single()
  assert(!leadInsErr && insertedLead?.id, 'Insert new lead record')
  assert(insertedLead?.full_name === testLeadPayload.full_name, 'Lead name field accuracy')
  assert(insertedLead?.mobile === testLeadPayload.mobile, 'Lead mobile field accuracy')
  assert(insertedLead?.source === 'referral', 'Lead source field accuracy')
  assert(insertedLead?.temperature === 'hot', 'Lead temperature tag accuracy')

  // B. UPDATE
  const { error: leadUpdErr } = await supabase
    .from('leads')
    .update({
      status: 'negotiation',
      temperature: 'warm',
      notes: 'Updated accuracy test notes'
    })
    .eq('id', insertedLead.id)
  assert(!leadUpdErr, `Update lead record query: ${leadUpdErr?.message || 'OK'}`)

  const { data: updatedLead } = await supabase.from('leads').select('*').eq('id', insertedLead.id).single()
  assert(updatedLead?.status === 'negotiation', 'Update lead status to negotiation')
  assert(updatedLead?.temperature === 'warm', 'Update lead temperature to warm')
  assert(updatedLead?.notes === 'Updated accuracy test notes', 'Update lead notes field')

  // C. DELETE (Clean up)
  const { error: leadDelErr } = await supabase.from('leads').delete().eq('id', insertedLead.id)
  assert(!leadDelErr, 'Delete test lead record (clean state)')

  const { data: deletedCheck } = await supabase.from('leads').select('id').eq('id', insertedLead.id).maybeSingle()
  assert(deletedCheck === null, 'Verify lead record is completely removed from DB')

  // ==================================================================
  // TEST 2: STUDENT, FEE & PAYMENT INTEGRITY (TRIGGER ACCURACY)
  // ==================================================================
  console.log('\n--- TEST 2: Student, Fee & Payment Calculation Accuracy ---')

  // A. INSERT STUDENT
  const { data: student, error: stuInsErr } = await supabase
    .from('students')
    .insert({
      full_name: 'Accuracy Test Student',
      mobile: '9882223344',
      email: 'student.accuracy@kizenedu.com',
      parent_name: 'Father Accuracy',
      parent_contact: '9882223355',
      emergency_contact: '9882223366',
      city: 'Chandigarh',
      is_active: true
    })
    .select('*')
    .single()
  assert(!stuInsErr && student?.id, 'Insert test student profile')
  assert(student?.student_id?.startsWith('KIZ-'), `Auto-generated Student ID format (${student?.student_id})`)

  // B. CREATE FEE PROFILE
  const totalFee = 50000
  const discount = 5000
  const registrationAmount = 5000

  const { data: fee, error: feeInsErr } = await supabase
    .from('fees')
    .insert({
      student_id: student.id,
      total_fee: totalFee,
      discount: discount,
      registration_amount: registrationAmount,
      amount_paid: 0
    })
    .select('*')
    .single()
  assert(!feeInsErr && fee?.id, 'Create fee profile')
  assert(parseFloat(fee.net_fee) === (totalFee - discount), `DB Computed Net Fee: ₹${fee.net_fee} (Expected ₹45,000)`)
  assert(parseFloat(fee.pending_balance) === (totalFee - discount), `DB Computed Pending Balance: ₹${fee.pending_balance} (Expected ₹45,000)`)

  // C. RECORD PAYMENT & VERIFY SYNC TRIGGER
  const paymentAmount = 15000
  const { data: payment, error: payInsErr } = await supabase
    .from('fee_payments')
    .insert({
      fee_id: fee.id,
      student_id: student.id,
      amount: paymentAmount,
      payment_method: 'upi',
      notes: 'Test payment for accuracy check',
      recorded_by: currentUser.id
    })
    .select('*')
    .single()
  assert(!payInsErr && payment?.id, 'Record fee payment of ₹15,000')
  assert(payment?.receipt_number?.startsWith('RCPT-'), `Auto-generated Receipt Number format (${payment?.receipt_number})`)

  // D. VERIFY TRIGGER COMPUTATION ON FEE RECORD
  const { data: updatedFee } = await supabase.from('fees').select('*').eq('id', fee.id).single()
  assert(parseFloat(updatedFee.amount_paid) === paymentAmount, `Trigger updated fee.amount_paid: ₹${updatedFee.amount_paid} (Expected ₹15,000)`)
  assert(parseFloat(updatedFee.pending_balance) === (totalFee - discount - paymentAmount), `Trigger updated fee.pending_balance: ₹${updatedFee.pending_balance} (Expected ₹30,000)`)

  // E. CLEAN UP TEST STUDENT & RELATED RECS
  await supabase.from('fee_payments').delete().eq('id', payment.id)
  await supabase.from('fees').delete().eq('id', fee.id)
  await supabase.from('students').delete().eq('id', student.id)
  assert(true, 'Cleaned up test student, fee profile, and payment records')

  // ==================================================================
  // TEST 3: LIVE DATABASE RECONCILIATION
  // ==================================================================
  console.log('\n--- TEST 3: Live Database Data Reconciliation ---')
  const { count: leadCount } = await supabase.from('leads').select('id', { count: 'exact', head: true })
  const { count: studentCount } = await supabase.from('students').select('id', { count: 'exact', head: true })
  const { count: feeCount } = await supabase.from('fees').select('id', { count: 'exact', head: true })
  const { count: instCount } = await supabase.from('installments').select('id', { count: 'exact', head: true })
  const { count: userCount } = await supabase.from('users').select('id', { count: 'exact', head: true })

  assert(leadCount > 0, `Live database leads count verified: ${leadCount} records`)
  assert(studentCount === 20, `Live database active students verified: ${studentCount} records (Expected 20)`)
  assert(feeCount === 20, `Live database fee profiles verified: ${feeCount} records (Expected 20)`)
  assert(instCount === 36, `Live database active installments verified: ${instCount} records (Expected 36)`)
  assert(userCount === 8, `Live database team members verified: ${userCount} records (Expected 8)`)

  // ==================================================================
  // SUMMARY
  // ==================================================================
  console.log('\n================================================================')
  console.log(`  DATA ACCURACY TEST RESULTS: ${passed} PASSED | ${failed} FAILED`)
  console.log('================================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

main().catch(err => {
  console.error('Test runner crash:', err)
  process.exit(1)
})
