import { createClient } from '@supabase/supabase-js'

const SU = 'https://zmqvjtenuxlvwfopfroc.supabase.co'
const SK = 'sb_publishable_ezZ7_UyticpI7aeLKY3Rew_i_FaZBDh'
const supabase = createClient(SU, SK)

async function main() {
  console.log('=== KIZEN CRM — GAP FIXES (Backfill + Migration) ===\n')

  const si = await supabase.auth.signInWithPassword({ email: 'shivam.kizen.test@gmail.com', password: 'Shivam@123' })
  if (si.error) { console.error('Sign-in failed:', si.error.message); process.exit(1) }
  console.log('✓ Signed in as:', si.data.user.email)

  // We can't run ALTER TABLE via REST API, but we CAN:
  // 1. Fetch all students, match them to batches by course_id, update batch_id
  // 2. Fetch all fees, match them to students, update course_id
  // We do this via the Supabase client (.update / .patch)

  // --- PART 1: Backfill students.batch_id ---
  console.log('\n--- Part 1: Backfilling students.batch_id from course_id ---')
  const { data: students } = await supabase
    .from('students')
    .select('id, course_id, batch_id, full_name')
  if (!students) { console.error('Failed to fetch students'); process.exit(1) }
  console.log(`  Found ${students.length} students`)

  const { data: batches } = await supabase
    .from('batches')
    .select('id, course_id, batch_name')
  if (!batches) { console.error('Failed to fetch batches'); process.exit(1) }
  console.log(`  Found ${batches.length} batches`)

  // Build a map: course_id -> batch_id
  const courseToBatch = new Map()
  for (const b of batches) {
    if (b.course_id) courseToBatch.set(b.course_id, b.id)
  }

  let updatedStudents = 0
  for (const s of students) {
    if (s.batch_id) continue // already has one
    if (!s.course_id) continue // no course to match
    const batchId = courseToBatch.get(s.course_id)
    if (!batchId) continue // no batch for this course
    const { error } = await supabase.from('students').update({ batch_id: batchId }).eq('id', s.id)
    if (error) {
      console.log(`  ✗ Failed to update ${s.full_name}: ${error.message}`)
    } else {
      updatedStudents++
    }
  }
  console.log(`  ✓ Updated ${updatedStudents} students with batch_id`)

  // --- PART 2: Backfill fees.course_id ---
  console.log('\n--- Part 2: Backfilling fees.course_id from students ---')
  const { data: fees } = await supabase
    .from('fees')
    .select('id, student_id, course_id')
  if (!fees) { console.error('Failed to fetch fees'); process.exit(1) }
  console.log(`  Found ${fees.length} fee records`)

  // Build student course map
  const studentCourseMap = new Map()
  for (const s of students) {
    if (s.course_id) studentCourseMap.set(s.id, s.course_id)
  }

  let updatedFees = 0
  for (const f of fees) {
    if (f.course_id) continue // already has one
    const courseId = studentCourseMap.get(f.student_id)
    if (!courseId) continue // no course for this student
    const { error } = await supabase.from('fees').update({ course_id: courseId }).eq('id', f.id)
    if (error) {
      console.log(`  ✗ Failed to update fee ${f.id}: ${error.message}`)
    } else {
      updatedFees++
    }
  }
  console.log(`  ✓ Updated ${updatedFees} fee records with course_id`)

  // --- PART 3: Add schedule_days / days_of_week to batches (if missing) ---
  // We can't ALTER TABLE via REST, but the schema likely already has these columns.
  // Let's verify by checking if they're accessible
  console.log('\n--- Part 3: Checking batches schema ---')
  const { data: batchSample } = await supabase.from('batches').select('schedule_days, days_of_week').limit(1)
  if (batchSample) {
    console.log('  ✓ schedule_days and days_of_week columns exist')
  } else {
    console.log('  ⚠️ Columns may be missing — run this in Supabase SQL Editor:')
    console.log('  ALTER TABLE batches ADD COLUMN IF NOT EXISTS days_of_week TEXT;')
    console.log('  ALTER TABLE batches ADD COLUMN IF NOT EXISTS schedule_days TEXT;')
  }

  // --- PART 4: Verify results ---
  console.log('\n--- Verification ---')
  const { data: vStudents } = await supabase.from('students').select('id, full_name, batch_id, course_id').not('batch_id', 'is', null)
  console.log(`  Students with batch_id set: ${vStudents?.length ?? 0}`)
  const { data: vFees } = await supabase.from('fees').select('id, course_id').not('course_id', 'is', null)
  console.log(`  Fees with course_id set: ${vFees?.length ?? 0}`)

  console.log('\n=== GAP FIXES COMPLETE ===')
}

main().catch(console.error)