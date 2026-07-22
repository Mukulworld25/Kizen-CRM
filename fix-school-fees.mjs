import { createClient } from '@supabase/supabase-js'

const SU = 'https://zmqvjtenuxlvwfopfroc.supabase.co'
const SK = 'sb_publishable_ezZ7_UyticpI7aeLKY3Rew_i_FaZBDh'
const supabase = createClient(SU, SK)

async function main() {
  console.log('=== FIX 11th/12th Fee Records & Add Missing Installments ===\n')

  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: 'shivam.kizen.test@gmail.com', password: 'Shivam@123'
  })
  if (authErr) { console.error('Auth:', authErr.message); return }

  // The 5 school students and their correct data from the CSV:
  const fixes = [
    { name: 'Shubham Garg', mobile: '7973455508', totalFee: 58000, amountPaid: 28000,
      installments: [] }, // No installment due dates in CSV
    { name: 'Sampreeti', mobile: '7986403760', totalFee: 48000, amountPaid: 4000,
      installments: [
        { num: 1, amount: 4000, due: '2026-05-13' },
        { num: 2, amount: 4000, due: '2026-07-02' },
      ]},
    { name: 'Saesha', mobile: '9779930039', totalFee: 30000, amountPaid: 5000,
      installments: [
        { num: 1, amount: 8500, due: '2026-05-15' },
      ]},
    { name: 'Abhinav', mobile: '9416151300', totalFee: 40000, amountPaid: 4000,
      installments: [
        { num: 1, amount: 4000, due: '2026-07-07' },
        { num: 2, amount: 4000, due: '2026-08-07' },
      ]},
    { name: 'Harshvir Gohri', mobile: '8847460994', totalFee: 30000, amountPaid: 5000,
      installments: [
        { num: 1, amount: 10000, due: '2026-07-08' },
      ]},
  ]

  for (const fix of fixes) {
    // Find student
    const { data: student } = await supabase.from('students').select('id').eq('mobile', fix.mobile).single()
    if (!student) { console.log(`SKIP ${fix.name} — not found`); continue }

    // Find fee record
    const { data: fee } = await supabase.from('fees').select('id, amount_paid').eq('student_id', student.id).single()
    if (!fee) { console.log(`SKIP ${fix.name} — no fee record`); continue }

    // Update amount_paid on fee
    const { error: updErr } = await supabase.from('fees').update({ amount_paid: fix.amountPaid }).eq('id', fee.id)
    if (updErr) { console.log(`  UPDATE ERROR (${fix.name}): ${updErr.message}`); continue }

    // Delete existing installments for this student (from the broken first run)
    await supabase.from('installments').delete().eq('student_id', student.id)

    // Insert correct installments
    for (const inst of fix.installments) {
      await supabase.from('installments').insert({
        fee_id: fee.id,
        student_id: student.id,
        installment_number: inst.num,
        amount: inst.amount,
        due_date: inst.due,
        status: 'pending'
      })
    }

    console.log(`✓ ${fix.name}: Paid=₹${fix.amountPaid}, ${fix.installments.length} installments`)
  }

  // Final counts
  console.log('\n--- FINAL VERIFIED COUNTS ---')
  const { data: allFees } = await supabase.from('fees').select('id, student_id, total_fee, amount_paid, pending_balance, student:students(full_name)')
  let totalCollected = 0, totalPending = 0
  allFees?.forEach(f => {
    console.log(`  ${f.student?.full_name}: Total=₹${f.total_fee} Paid=₹${f.amount_paid} Pending=₹${f.pending_balance}`)
    totalCollected += parseFloat(f.amount_paid || 0)
    totalPending += parseFloat(f.pending_balance || 0)
  })

  const { count: iC } = await supabase.from('installments').select('id', { count: 'exact', head: true })
  console.log(`\n  Total Installments: ${iC}`)
  console.log(`  Total Fee Collected: ₹${totalCollected.toLocaleString('en-IN')}`)
  console.log(`  Total Fee Pending:   ₹${totalPending.toLocaleString('en-IN')}`)
}

main().catch(err => console.error(err))
