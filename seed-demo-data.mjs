import { createClient } from '@supabase/supabase-js'

const SU = 'https://zmqvjtenuxlvwfopfroc.supabase.co'
const ANON = 'sb_publishable_ezZ7_UyticpI7aeLKY3Rew_i_FaZBDh'

async function main() {
  const sb = createClient(SU, ANON)
  const { data: si, error: lerr } = await sb.auth.signInWithPassword({
    email: 'shivam.kizen.test@gmail.com',
    password: 'Shivam@123'
  })
  if (lerr) { console.log('LOGIN FAIL:', lerr.message); process.exit(1) }
  const userId = si.session.user.id
  console.log('✓ Logged in as owner')

  // Get profile
  const { data: profile } = await sb.from('users').select('*').eq('auth_id', userId).single()
  if (!profile) { console.log('No profile found'); process.exit(1) }
  console.log(`✓ Profile: ${profile.name} (${profile.role})`)

  // Get a course
  const { data: course } = await sb.from('courses').select('id').limit(1).single()
  if (!course) { console.log('No courses found'); process.exit(1) }
  console.log(`✓ Course ID: ${course.id}`)

  // Demo Leads
  const demos = [
    { full_name: '[DEMO] Rahul Sharma', mobile: '9111111111', email: 'rahul.demo@test.com', status: 'new_lead', source: 'instagram', temperature: 'hot', budget: 45000, expected_joining_date: '2026-08-01', interested_course_id: course.id, assigned_counselor_id: profile.id, created_by: profile.id },
    { full_name: '[DEMO] Priya Patel', mobile: '9111111112', email: 'priya.demo@test.com', status: 'contacted', source: 'website', temperature: 'warm', budget: 25000, expected_joining_date: '2026-07-15', interested_course_id: course.id, assigned_counselor_id: profile.id, created_by: profile.id },
    { full_name: '[DEMO] Amit Verma', mobile: '9111111113', email: 'amit.demo@test.com', status: 'demo_booked', source: 'referral', temperature: 'hot', budget: 50000, expected_joining_date: '2026-08-10', interested_course_id: course.id, assigned_counselor_id: profile.id, created_by: profile.id },
    { full_name: '[DEMO] Sneha Gupta', mobile: '9111111114', email: 'sneha.demo@test.com', status: 'negotiation', source: 'facebook', temperature: 'warm', budget: 30000, expected_joining_date: '2026-07-20', interested_course_id: course.id, assigned_counselor_id: profile.id, created_by: profile.id },
  ]

  for (const lead of demos) {
    const { data: l, error } = await sb.from('leads').insert(lead).select().single()
    if (error) console.log(`  ❌ Lead ${lead.full_name}: ${error.message}`)
    else console.log(`  ✅ Lead: ${l.full_name} (${l.status})`)
  }

  // Demo Institution
  let bdmId = null
  try { const { data: bdm } = await sb.from('users').select('id').eq('role', 'bdm').limit(1).single(); bdmId = bdm?.id } catch (_) {}
  const { data: inst, error: instErr } = await sb.from('institutions').insert({
    name: "[DEMO] St. Xavier's School",
    type: 'school',
    city: 'Mumbai',
    contact_person: 'Fr. Joseph',
    contact_phone: '9111111115',
    mou_status: 'in_discussion',
    assigned_bdm_id: bdmId,
  }).select().single()
  if (instErr) console.log(`  ❌ Institution: ${instErr.message}`)
  else console.log(`  ✅ Institution: ${inst.name}`)

  // Demo expense
  const { data: exp, error: expErr } = await sb.from('institute_expenses').insert({
    category: 'electricity',
    amount: 18500,
    expense_date: '2026-07-01',
    notes: 'Monthly electricity bill - July',
    created_by: profile.id,
  }).select().single()
  if (expErr) console.log(`  ❌ Expense: ${expErr.message}`)
  else console.log(`  ✅ Expense: ₹${exp.amount} (${exp.category})`)

  console.log('\n🎉 Demo data seeded!')
}

main().catch(e => console.error('FATAL:', e.message))