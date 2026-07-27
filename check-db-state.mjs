import { createClient } from '@supabase/supabase-js'

const SU = 'https://zmqvjtenuxlvwfopfroc.supabase.co'
const SK = 'sb_publishable_ezZ7_UyticpI7aeLKY3Rew_i_FaZBDh'
const supabase = createClient(SU, SK)

async function main() {
  const si = await supabase.auth.signInWithPassword({ email: 'shivam.kizen.test@gmail.com', password: 'Shivam@123' })
  if (si.error) { console.error('Auth failed:', si.error.message); return }
  console.log('Signed in as:', si.data.user.email)

  // 1. Check batches
  console.log('\n=== BATCHES ===')
  const { data: batches } = await supabase.from('batches').select('*')
  console.log(`Count: ${batches?.length ?? 0}`)
  if (batches) {
    for (const b of batches) {
      console.log(`  ${b.id} | ${b.batch_name} | course_id=${b.course_id} | faculty_id=${b.faculty_id} | schedule_days=${b.schedule_days} | days_of_week=${b.days_of_week} | timing=${b.timing}`)
    }
  }

  // 2. Check students batch_id
  console.log('\n=== STUDENTS (batch_id) ===')
  const { data: students } = await supabase.from('students').select('id, full_name, course_id, batch_id')
  console.log(`Count: ${students?.length ?? 0}`)
  const noBatch = students?.filter(s => !s.batch_id) ?? []
  console.log(`Students without batch_id: ${noBatch.length}`)
  const withBatch = students?.filter(s => s.batch_id) ?? []
  console.log(`Students with batch_id: ${withBatch.length}`)

  // 3. Check fees course_id
  console.log('\n=== FEES (course_id) ===')
  const { data: fees } = await supabase.from('fees').select('id, student_id, course_id, total_fee')
  console.log(`Count: ${fees?.length ?? 0}`)
  const nullCourse = fees?.filter(f => !f.course_id) ?? []
  console.log(`Fees with null course_id: ${nullCourse.length}`)
  const hasCourse = fees?.filter(f => f.course_id) ?? []
  console.log(`Fees with course_id: ${hasCourse.length}`)

  // 4. Check courses
  console.log('\n=== COURSES ===')
  const { data: courses } = await supabase.from('courses').select('id, name')
  if (courses) {
    for (const c of courses) {
      console.log(`  ${c.id} | ${c.name}`)
    }
  }

  // 5. Check referred_by columns
  console.log('\n=== REFERRED BY COLUMNS ===')
  const { data: leadSample } = await supabase.from('leads').select('id, full_name, referred_by_lead_id').limit(3)
  console.log('Leads referred_by_lead_id sample:')
  if (leadSample) for (const l of leadSample) console.log(`  ${l.full_name} | referred_by_lead_id=${l.referred_by_lead_id}`)

  const { data: studentSample } = await supabase.from('students').select('id, full_name').limit(3)
  console.log('Students (checking if referred_by_student_id exists):')
  if (studentSample && studentSample.length > 0) {
    const first = studentSample[0]
    // Try to select referred_by_student_id
    const { data: checkCol } = await supabase.from('students').select('referred_by_student_id').limit(1)
    console.log(`  referred_by_student_id column accessible: ${checkCol ? 'YES' : 'NO'}`)
    if (checkCol) console.log(`  Value: ${checkCol[0]?.referred_by_student_id}`)
  }

  // 6. Check faculty users
  console.log('\n=== FACULTY USERS ===')
  const { data: users } = await supabase.from('users').select('id, name, email, role')
  const faculty = users?.filter(u => u.role === 'faculty') ?? []
  console.log(`Faculty count: ${faculty.length}`)
  for (const f of faculty) console.log(`  ${f.id} | ${f.name} | ${f.email}`)
}

main().catch(console.error)