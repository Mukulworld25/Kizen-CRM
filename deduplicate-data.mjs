import { createClient } from '@supabase/supabase-js'

const SU = 'https://zmqvjtenuxlvwfopfroc.supabase.co'
const SK = 'sb_publishable_ezZ7_UyticpI7aeLKY3Rew_i_FaZBDh'
const supabase = createClient(SU, SK)

async function main() {
  console.log('=== KIZEN CRM — DE-DUPLICATE DATA ===\n')

  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: 'shivam.kizen.test@gmail.com',
    password: 'Shivam@123'
  })
  if (authErr) { console.error('Auth failed:', authErr.message); return }

  // ---- 1. De-duplicate Students ----
  console.log('--- De-duplicating Students ---')
  const { data: allStudents } = await supabase.from('students').select('id, full_name, mobile, created_at').order('created_at', { ascending: true })

  const seen = new Map() // mobile -> first student id
  const dupeStudentIds = []
  for (const s of allStudents || []) {
    const key = s.mobile
    if (seen.has(key)) {
      dupeStudentIds.push(s.id)
      console.log(`  DUPE: ${s.full_name} (${s.mobile}) id=${s.id}`)
    } else {
      seen.set(key, s.id)
    }
  }

  if (dupeStudentIds.length > 0) {
    // Delete installments for dupe students
    const { count: instDel } = await supabase.from('installments').delete({ count: 'exact' }).in('student_id', dupeStudentIds)
    console.log(`  Deleted ${instDel} duplicate installments`)

    // Delete fees for dupe students
    const { count: feeDel } = await supabase.from('fees').delete({ count: 'exact' }).in('student_id', dupeStudentIds)
    console.log(`  Deleted ${feeDel} duplicate fee records`)

    // Delete student_fees for dupe students (if table exists)
    await supabase.from('student_fees').delete().in('student_id', dupeStudentIds)

    // Delete dupe students
    const { count: stuDel } = await supabase.from('students').delete({ count: 'exact' }).in('id', dupeStudentIds)
    console.log(`  Deleted ${stuDel} duplicate students`)
  } else {
    console.log('  No duplicate students found.')
  }

  // ---- 2. De-duplicate Leads (Preeti's leads ran twice) ----
  console.log('\n--- De-duplicating Leads ---')
  const { data: allLeads } = await supabase.from('leads').select('id, full_name, mobile, notes, created_at')
    .order('created_at', { ascending: true })

  const seenLeads = new Map()
  const dupeLeadIds = []
  for (const l of allLeads || []) {
    const key = `${l.full_name}__${l.mobile}`
    if (seenLeads.has(key)) {
      dupeLeadIds.push(l.id)
    } else {
      seenLeads.set(key, l.id)
    }
  }
  console.log(`  Found ${dupeLeadIds.length} duplicate leads`)

  if (dupeLeadIds.length > 0) {
    // Delete follow-ups for dupe leads
    const { count: fuDel } = await supabase.from('follow_ups').delete({ count: 'exact' }).in('lead_id', dupeLeadIds)
    console.log(`  Deleted ${fuDel} duplicate follow-ups`)

    // Delete dupe leads
    const { count: leadDel } = await supabase.from('leads').delete({ count: 'exact' }).in('id', dupeLeadIds)
    console.log(`  Deleted ${leadDel} duplicate leads`)
  }

  // ---- 3. Verify final counts ----
  console.log('\n--- FINAL VERIFIED COUNTS ---')
  const { count: sC } = await supabase.from('students').select('id', { count: 'exact', head: true })
  const { count: lC } = await supabase.from('leads').select('id', { count: 'exact', head: true })
  const { count: fC } = await supabase.from('fees').select('id', { count: 'exact', head: true })
  const { count: iC } = await supabase.from('installments').select('id', { count: 'exact', head: true })
  const { count: fuC } = await supabase.from('follow_ups').select('id', { count: 'exact', head: true })

  console.log(`  Students:     ${sC}`)
  console.log(`  Leads:        ${lC}`)
  console.log(`  Fee Records:  ${fC}`)
  console.log(`  Installments: ${iC}`)
  console.log(`  Follow-ups:   ${fuC}`)
  console.log('\n=== De-duplication Complete ===')
}

main().catch(err => console.error(err))
