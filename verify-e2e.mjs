import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'

const supabaseUrl = 'https://zmqvjtenuxlvwfopfroc.supabase.co'
const supabaseKey = 'sb_publishable_ezZ7_UyticpI7aeLKY3Rew_i_FaZBDh'
const supabase = createClient(supabaseUrl, supabaseKey)

const results = []

function log(msg) {
  results.push(msg)
  console.log(msg)
}

function sep(title) {
  log('')
  log(`=== ${title} ===`)
  log('')
}

let ownerToken = null
let accountsToken = null

async function run() {
  sep('STEP 1: RELOAD SCHEMA CACHE & CHECK SEED DATA')

  // Try reloading schema via a raw SQL call using the auth endpoint
  try {
    const r = await fetch(`${supabaseUrl}/rest/v1/rpc/pgrst_reload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
      },
    })
    log(`  Schema reload: ${r.status} ${r.statusText}`)
  } catch (e) {
    log(`  Schema reload note: ${e.message} (non-critical)`)
  }

  // Check courses with anon key (may need auth)
  const { data: coursesAnon } = await supabase.from('courses').select('id, name, total_fee')
  log(`  Courses (anon): ${coursesAnon ? coursesAnon.length : 0} rows`)
  if (coursesAnon && coursesAnon.length > 0) {
    for (const c of coursesAnon) log(`    ${c.name}: ₹${c.total_fee}`)
  }

  // Check system_settings
  const { data: settingsAnon } = await supabase.from('system_settings').select('key, value')
  log(`  System settings (anon): ${settingsAnon ? settingsAnon.length : 0} rows`)
  if (settingsAnon) for (const s of settingsAnon) log(`    ${s.key}: ${s.value}`)

  sep('STEP 2: SIGN UP OWNER ACCOUNT')
  log('  Trying owner signup...')

  // Try a .com domain that won't bounce
  let ownerSignup
  try {
    ownerSignup = await supabase.auth.signUp({
      email: 'shivam@kizen-crm.com',
      password: 'Shivam@123',
      options: { data: { name: 'Shivam Owner', role: 'owner' } }
    })
    log(`  Signup response: ${ownerSignup.error ? ownerSignup.error.message : 'OK'}`)
    if (ownerSignup.error && ownerSignup.error.message.includes('already')) {
      // Already exists - try signing in
      const si = await supabase.auth.signInWithPassword({
        email: 'shivam@kizen-crm.com',
        password: 'Shivam@123'
      })
      if (si.error) {
        log(`  Signin failed: ${si.error.message}`)
        log('  Will use fallback direct update approach')
      } else {
        ownerToken = si.session.access_token
        log(`  Signed in as owner: ${si.user.email}`)
      }
    } else if (!ownerSignup.error) {
      if (ownerSignup.data.session) {
        ownerToken = ownerSignup.data.session.access_token
        log(`  Signed up & auto-confirmed: ${ownerSignup.data.user.email}`)
      } else {
        log('  Signup OK — email confirmation required. Need to check if auto-confirmed.')
        // Try signin anyway
        const si = await supabase.auth.signInWithPassword({
          email: 'shivam@kizen-crm.com',
          password: 'Shivam@123'
        })
        if (!si.error) {
          ownerToken = si.session.access_token
          log(`  Signin after signup worked: ${si.user.email}`)
        } else {
          log(`  Cannot proceed without confirmed email: ${si.error.message}`)
          log('  Please go to Supabase Dashboard → Authentication → Settings')
          log('  Set "Confirm email" to OFF and click Save')
          finish()
          return
        }
      }
    } else {
      log(`  Signup error: ${ownerSignup.error.message}`)
      log('  Attempting signin as fallback...')
      const si = await supabase.auth.signInWithPassword({
        email: 'shivam@kizen-crm.com',
        password: 'Shivam@123'
      })
      if (!si.error) {
        ownerToken = si.session.access_token
        log(`  Signed in: ${si.user.email}`)
      } else {
        log(`  All auth methods failed. Need email confirmation OFF.`)
        finish()
        return
      }
    }
  } catch (e) {
    log(`  Auth error: ${e.message}`)
  }

  if (!ownerToken) {
    log('  No owner session available. Exiting.')
    finish()
    return
  }

  // Authenticated client
  const authed = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${ownerToken}` } }
  })

  sep('STEP 3: VERIFY AUTHENTICATED DATA')
  const { data: courses } = await authed.from('courses').select('id, name, total_fee')
  log(`  Courses: ${courses ? courses.length : 0} rows`)
  if (courses && courses.length > 0) {
    for (const c of courses) log(`    ID=${c.id} ${c.name}: ₹${c.total_fee}`)
  } else {
    log('  No courses found. Reloading PostgREST schema via NOTIFY...')
    // Try the SQL approach through the REST API
    try {
      await fetch(`${supabaseUrl}/rest/v1/rpc/pgrst_reload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': supabaseKey }
      })
      log('  Schema reload attempted')
      // Try again
      await new Promise(r => setTimeout(r, 2000))
      const { data: courses2 } = await authed.from('courses').select('id, name, total_fee')
      log(`  Courses after reload: ${courses2 ? courses2.length : 0} rows`)
    } catch (e) {
      log(`  Reload error: ${e.message}`)
    }
  }

  const { data: users } = await authed.from('users').select('id, name, email, role, is_owner')
  log(`  Users: ${users ? users.length : 0}`)
  if (users) for (const u of users) log(`    ID=${u.id} ${u.name} (${u.email}) - ${u.role}${u.is_owner ? ' [OWNER]' : ''}`)

  sep('STEP 4: CREATE 3 TEST ACCOUNTS')
  const testAccounts = [
    { email: 'counselor@kizen-crm.com', password: 'Counselor@123', name: 'Priya Counselor', role: 'counselor' },
    { email: 'accounts@kizen-crm.com', password: 'Accounts@123', name: 'Anika Accounts', role: 'accounts' },
    { email: 'reception@kizen-crm.com', password: 'Reception@123', name: 'Rahul Reception', role: 'reception' },
  ]

  for (const acct of testAccounts) {
    log(`  Creating ${acct.name} (${acct.email})...`)
    let signup
    try {
      signup = await supabase.auth.signUp({
        email: acct.email,
        password: acct.password,
        options: { data: { name: acct.name, role: acct.role } }
      })
    } catch (e) {
      log(`    Signup error: ${e.message}`)
      continue
    }

    if (signup.error) {
      if (signup.error.message.includes('already')) {
        log(`    Already exists — updating role`)
        await authed.from('users').update({ role: acct.role, name: acct.name }).eq('email', acct.email)
      } else {
        log(`    Error: ${signup.error.message}`)
      }
    } else if (signup.data.user) {
      log(`    Signup OK: user_id=${signup.data.user.id}`)
      // Auth trigger should auto-create users row, but ensure role is set
      await authed.from('users').update({ role: acct.role, name: acct.name }).eq('email', acct.email)
    }
  }

  sep('STEP 5: VERIFY PERMISSIONS PER ROLE')
  
  // Check users table for all created accounts  
  const { data: allUsers } = await authed.from('users').select('id, name, email, role, is_owner')
  log('  All users in system:')
  if (allUsers) for (const u of allUsers) log(`    ${u.name} - ${u.role}`)

  // Test permissions for each role
  for (const acct of testAccounts) {
    log(`\n  --- Testing: ${acct.name} (${acct.role}) ---`)
    try {
      const si = await supabase.auth.signInWithPassword({ email: acct.email, password: acct.password })
      if (si.error) {
        log(`    Login failed: ${si.error.message}`)
        continue
      }
      const client = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: `Bearer ${si.session.access_token}` } }
      })

      // Test table access
      const permChecks = [
        { table: 'leads', expected: acct.role !== 'accounts' },
        { table: 'students', expected: acct.role !== 'reception' },
        { table: 'fees', expected: acct.role === 'accounts' || acct.role === 'owner' || acct.role === 'admin' },
        { table: 'courses', expected: true },
      ]

      for (const check of permChecks) {
        const { data, error } = await client.from(check.table).select('id', { count: 'exact', head: true })
        const accessible = !error && data !== null
        const status = accessible === check.expected ? '✓' : '✗'
        log(`    ${status} ${check.table}: ${accessible ? 'ACCESSIBLE' : 'BLOCKED'} (expected ${check.expected ? 'ACCESSIBLE' : 'BLOCKED'})`)
        if (accessible !== check.expected) log(`      Note: error=${error?.message || 'none'}`)
      }

      accountsToken = acct.role === 'accounts' ? si.session.access_token : accountsToken

    } catch (e) {
      log(`    Error testing ${acct.role}: ${e.message}`)
    }
  }

  // Clean up auth sessions - sign back in as owner
  await supabase.auth.signInWithPassword({ email: 'shivam@kizen-crm.com', password: 'Shivam@123' })

  sep('STEP 6: CREATE TEST LEAD & MOVE THROUGH PIPELINE')
  
  // Need a course ID
  const { data: courseData } = await authed.from('courses').select('id, name').limit(1)
  if (!courseData || courseData.length === 0) {
    log('  ERROR: No courses found. Cannot proceed.')
    finish()
    return
  }
  const courseId = courseData[0].id
  log(`  Using course: ${courseData[0].name} (ID=${courseId})`)

  // Get counselor user ID
  const { data: counselorUser } = await authed.from('users').select('id').eq('role', 'counselor').limit(1).single()
  if (!counselorUser) {
    log('  ERROR: No counselor user found')
    finish()
    return
  }
  log(`  Counselor ID: ${counselorUser.id}`)
  
  // Create lead
  const { data: lead, error: leadErr } = await authed.from('leads').insert({
    full_name: 'Test Student',
    mobile: '9876543210',
    email: 'test.student@email.com',
    parent_name: 'Test Parent',
    parent_contact: '9876543211',
    city: 'Chandigarh',
    school_college: 'Test College',
    interested_course_id: courseId,
    source: 'website',
    assigned_counselor_id: counselorUser.id,
    status: 'new',
    priority: 'high',
    notes: 'E2E test lead',
  }).select().single()

  if (leadErr) { log(`  ERROR creating lead: ${leadErr.message}`); finish(); return }
  log(`  Lead created: ID=${lead.id}, Name=${lead.full_name}, Status=${lead.status}`)

  // Move through pipeline
  const pipeline = ['contacted', 'interested', 'demo_scheduled', 'demo_attended', 'admitted']
  for (const status of pipeline) {
    const { error: upErr } = await authed.from('leads').update({ status }).eq('id', lead.id)
    if (upErr) { log(`  ERROR updating to ${status}: ${upErr.message}`); finish(); return }
    log(`  Status updated: ${status}`)
  }

  // Verify final lead status
  const { data: updatedLead } = await authed.from('leads').select('*').eq('id', lead.id).single()
  log(`  Lead final status: ${updatedLead?.status} (expected: admitted)`)

  sep('STEP 7: CONVERT LEAD TO STUDENT')

  // Get batch
  const { data: batches } = await authed.from('batches').select('id, batch_name').limit(1)
  let batchId = null
  if (batches && batches.length > 0) {
    batchId = batches[0].id
    log(`  Using batch: ${batches[0].batch_name} (ID=${batchId})`)
  } else {
    log('  No batches found — creating one...')
    const { data: newBatch, error: batchErr } = await authed.from('batches').insert({
      batch_name: 'Test Batch 2026',
      course_id: courseId,
      total_seats: 30,
      enrolled_count: 0,
    }).select().single()
    if (batchErr) { log(`  ERROR creating batch: ${batchErr.message}`); finish(); return }
    batchId = newBatch.id
    log(`  Batch created: ${newBatch.batch_name} (ID=${batchId})`)
  }

  // Create student
  const { data: student, error: studentErr } = await authed.from('students').insert({
    lead_id: lead.id,
    full_name: lead.full_name,
    mobile: lead.mobile,
    email: lead.email,
    parent_name: lead.parent_name,
    parent_contact: lead.parent_contact,
    city: lead.city,
    school_college: lead.school_college,
    course_id: courseId,
    batch_id: batchId,
    admission_date: new Date().toISOString().split('T')[0],
  }).select().single()

  if (studentErr) { log(`  ERROR creating student: ${studentErr.message}`); finish(); return }
  log(`  Student created: ID=${student.id}, Name=${student.full_name}, Batch=${student.batch_id}`)

  sep('STEP 8: CREATE FEE RECORD & RECORD PAYMENT')

  // Create fee record
  const { data: fee, error: feeErr } = await authed.from('fees').insert({
    student_id: student.id,
    course_id: courseId,
    total_fee: 45000,
    discount: 0,
    scholarship: 0,
    net_fee: 45000,
    amount_paid: 0,
    pending_balance: 45000,
  }).select().single()

  if (feeErr) { log(`  ERROR creating fee: ${feeErr.message}`); finish(); return }
  log(`  Fee record created: ID=${fee.id}, Total=₹45,000`)

  // Record payment
  const { data: payment, error: payErr } = await authed.from('fee_payments').insert({
    fee_id: fee.id,
    student_id: student.id,
    amount: 25000,
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'upi',
    transaction_id: 'E2E-TEST-UPI-001',
    receipt_number: `RCP-${Date.now()}`,
  }).select().single()

  if (payErr) { log(`  ERROR recording payment: ${payErr.message}`); finish(); return }
  log(`  Payment recorded: ID=${payment.id}, Amount=₹25,000, Method=UPI`)

  // Update fee amounts
  const { error: feeUpErr } = await authed.from('fees').update({
    amount_paid: 25000,
    pending_balance: 20000,
  }).eq('id', fee.id)

  if (feeUpErr) { log(`  ERROR updating fee balance: ${feeUpErr.message}`); finish(); return }
  log(`  Fee balance updated: Paid=₹25,000, Pending=₹20,000`)

  sep('STEP 9: VERIFY END-TO-END CONSISTENCY')

  // Verify lead
  const { data: finalLead } = await authed.from('leads').select('id, full_name, status, priority').eq('id', lead.id).single()
  log(`  Lead: ${finalLead?.full_name} | Status: ${finalLead?.status} | Priority: ${finalLead?.priority}`)
  log(`    ${finalLead?.status === 'admitted' ? '✓' : '✗'} Final status is "admitted"`)

  // Verify student
  const { data: finalStudent } = await authed.from('students').select('id, full_name, batch_id, course_id').eq('id', student.id).single()
  log(`  Student: ${finalStudent?.full_name} | Batch: ${finalStudent?.batch_id}`)
  log(`    ${finalStudent?.batch_id === batchId ? '✓' : '✗'} Batch assignment correct`)

  // Verify fee
  const { data: finalFee } = await authed.from('fees').select('*').eq('id', fee.id).single()
  log(`  Fee: Total=₹${finalFee?.total_fee}, Paid=₹${finalFee?.amount_paid}, Balance=₹${finalFee?.pending_balance}`)
  log(`    ${finalFee?.total_fee === 45000 ? '✓' : '✗'} Total fee ₹45,000`)
  log(`    ${finalFee?.amount_paid === 25000 ? '✓' : '✗'} Payment recorded ₹25,000`)
  log(`    ${finalFee?.pending_balance === 20000 ? '✓' : '✗'} Balance ₹20,000`)

  // Verify payment
  const { data: finalPayment } = await authed.from('fee_payments').select('*').eq('id', payment.id).single()
  log(`  Payment: Amount=₹${finalPayment?.amount}, Method=${finalPayment?.payment_method}`)
  log(`    ${finalPayment?.payment_method === 'upi' ? '✓' : '✗'} Payment method is UPI`)
  log(`    ${finalPayment?.amount === 25000 ? '✓' : '✗'} Amount correct`)

  sep('SUMMARY')

  // Count everything
  const { count: leadCount } = await authed.from('leads').select('id', { count: 'exact', head: true })
  const { count: studentCount } = await authed.from('students').select('id', { count: 'exact', head: true })
  const { count: feeCount } = await authed.from('fees').select('id', { count: 'exact', head: true })
  const { count: paymentCount } = await authed.from('fee_payments').select('id', { count: 'exact', head: true })
  const { data: allFinalUsers } = await authed.from('users').select('name, email, role')

  log(`  Users (${allFinalUsers?.length || 0}):`)
  if (allFinalUsers) for (const u of allFinalUsers) log(`    ${u.name} (${u.email}) - ${u.role}`)
  log(`  Leads: ${leadCount || 0}`)
  log(`  Students: ${studentCount || 0}`)
  log(`  Fees: ${feeCount || 0}`)
  log(`  Payments: ${paymentCount || 0}`)
  log('')
  log('=== VERIFICATION COMPLETE ===')

  finish()
}

function finish() {
  writeFileSync('verify-e2e-output.txt', results.join('\n'))
  log('')
  log('Results written to verify-e2e-output.txt')
}

run().catch((e) => {
  log(`FATAL: ${e.message}`)
  console.error(e)
  finish()
})