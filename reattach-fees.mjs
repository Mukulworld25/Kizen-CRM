import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'

const SU = 'https://zmqvjtenuxlvwfopfroc.supabase.co'
const SK = 'sb_publishable_ezZ7_UyticpI7aeLKY3Rew_i_FaZBDh'
const supabase = createClient(SU, SK)

function cleanPhone(raw) {
  if (!raw) return null
  const digits = raw.toString().replace(/\D/g, '')
  if (digits.length >= 10) return digits.slice(-10)
  return null
}

function parseCSVLine(line) {
  const result = []
  let insideQuote = false
  let current = ''
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') { insideQuote = !insideQuote }
    else if (char === ',' && !insideQuote) { result.push(current.trim()); current = '' }
    else { current += char }
  }
  result.push(current.trim())
  return result
}

function parseAmount(raw) {
  if (!raw) return 0
  return parseFloat(raw.toString().replace(/[^0-9.]/g, '')) || 0
}

function parseDate(dateStr) {
  if (!dateStr || !dateStr.trim() || dateStr === '-' || dateStr === 'NIL') return null
  const cleaned = dateStr.trim()
  const parts = cleaned.split(/\s+/)
  if (parts.length >= 2) {
    const day = parts[0].replace(/\D/g, '').padStart(2, '0')
    const monthStr = parts[1].toLowerCase()
    let year = parts[2] ? parts[2].replace(/\D/g, '') : '2026'
    if (year.length === 2) year = '20' + year
    const months = { jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12' }
    const monthNum = months[monthStr.substring(0, 3)]
    if (monthNum && day) return `${year}-${monthNum}-${day}`
  }
  return null
}

async function main() {
  console.log('=== RE-ATTACH FEES & INSTALLMENTS TO SURVIVING STUDENTS ===\n')

  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: 'shivam.kizen.test@gmail.com', password: 'Shivam@123'
  })
  if (authErr) { console.error('Auth failed:', authErr.message); return }

  // Get surviving students indexed by mobile
  const { data: students } = await supabase.from('students').select('id, full_name, mobile')
  const studentByMobile = new Map()
  students?.forEach(s => studentByMobile.set(s.mobile, s))
  console.log(`Found ${students?.length} surviving students\n`)

  // Check which students already have fees
  const { data: existingFees } = await supabase.from('fees').select('student_id')
  const studentsWithFees = new Set(existingFees?.map(f => f.student_id))

  // ---- ACCA KL ----
  const accaKlPath = 'C:/Users/admin/Downloads/Fees Tracker - ACCA KL.csv'
  if (existsSync(accaKlPath)) {
    console.log('--- Processing: Fees Tracker - ACCA KL.csv ---')
    const lines = readFileSync(accaKlPath, 'utf8').split('\n').map(l => l.trim()).filter(Boolean)
    let count = 0

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i])
      if (cols.length < 7) continue
      const name = cols[1]?.replace(/^"|"$/g, '').trim()
      const rawMobile = cols[2]?.replace(/^"|"$/g, '').trim()
      const mobile = cleanPhone(rawMobile)
      if (!name || !mobile || name === 'Sr No') continue

      const student = studentByMobile.get(mobile)
      if (!student) { console.log(`  SKIP ${name} — no matching student for ${mobile}`); continue }
      if (studentsWithFees.has(student.id)) { console.log(`  SKIP ${name} — already has fees`); continue }

      const totalAmount = parseAmount(cols[6])
      const regAmount = parseAmount(cols[7])

      const { data: fee, error: feeErr } = await supabase.from('fees').insert({
        student_id: student.id,
        total_fee: totalAmount,
        registration_amount: regAmount,
        amount_paid: regAmount,
      }).select('id').single()

      if (feeErr) { console.log(`  FEE ERROR (${name}): ${feeErr.message}`); continue }
      count++
      studentsWithFees.add(student.id)

      const installments = [
        { amount: parseAmount(cols[10]), due: parseDate(cols[11]), num: 1 },
        { amount: parseAmount(cols[12]), due: parseDate(cols[13]), num: 2 },
        { amount: parseAmount(cols[14]), due: parseDate(cols[15]), num: 3 },
        { amount: parseAmount(cols[16]), due: parseDate(cols[17]), num: 4 },
      ].filter(inst => inst.amount > 0)

      for (const inst of installments) {
        await supabase.from('installments').insert({
          fee_id: fee.id,
          student_id: student.id,
          installment_number: inst.num,
          amount: inst.amount,
          due_date: inst.due || '2026-08-15',
          status: 'pending'
        })
      }
      console.log(`  ✓ ${name}: ₹${totalAmount} total, ${installments.length} installments`)
    }
    console.log(`Attached fees to ${count} ACCA KL students\n`)
  }

  // ---- 11th & 12th ----
  const schoolPath = 'C:/Users/admin/Downloads/Fees Tracker - 11th & 12th.csv'
  if (existsSync(schoolPath)) {
    console.log('--- Processing: Fees Tracker - 11th & 12th.csv ---')
    const lines = readFileSync(schoolPath, 'utf8').split('\n').map(l => l.trim()).filter(Boolean)
    let count = 0

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i])
      if (cols.length < 6) continue
      const name = cols[1]?.replace(/^"|"$/g, '').trim()
      const mobile = cleanPhone(cols[2])
      if (!name || !mobile || name.includes('Student')) continue

      const student = studentByMobile.get(mobile)
      if (!student) { console.log(`  SKIP ${name} — no matching student for ${mobile}`); continue }
      if (studentsWithFees.has(student.id)) { console.log(`  SKIP ${name} — already has fees`); continue }

      const totalAmount = parseAmount(cols[6])
      const inst1Amount = parseAmount(cols[8])

      const { data: fee, error: feeErr } = await supabase.from('fees').insert({
        student_id: student.id,
        total_fee: totalAmount,
        amount_paid: inst1Amount,
      }).select('id').single()

      if (feeErr) { console.log(`  FEE ERROR (${name}): ${feeErr.message}`); continue }
      count++
      studentsWithFees.add(student.id)

      const installments = [
        { amount: parseAmount(cols[10]), due: parseDate(cols[11]), num: 1 },
        { amount: parseAmount(cols[12]), due: parseDate(cols[13]), num: 2 },
        { amount: parseAmount(cols[14]), due: parseDate(cols[15]), num: 3 },
      ].filter(inst => inst.amount > 0)

      for (const inst of installments) {
        await supabase.from('installments').insert({
          fee_id: fee.id,
          student_id: student.id,
          installment_number: inst.num,
          amount: inst.amount,
          due_date: inst.due || '2026-08-15',
          status: 'pending'
        })
      }
      console.log(`  ✓ ${name}: ₹${totalAmount} total, ${installments.length} installments`)
    }
    console.log(`Attached fees to ${count} 11th/12th students\n`)
  }

  // ---- Final verification ----
  console.log('--- FINAL COUNTS ---')
  const { count: sC } = await supabase.from('students').select('id', { count: 'exact', head: true })
  const { count: fC } = await supabase.from('fees').select('id', { count: 'exact', head: true })
  const { count: iC } = await supabase.from('installments').select('id', { count: 'exact', head: true })
  console.log(`  Students: ${sC}`)
  console.log(`  Fees: ${fC}`)
  console.log(`  Installments: ${iC}`)

  // Show all fees with student names
  const { data: allFees } = await supabase.from('fees').select('id, student_id, total_fee, amount_paid, pending_balance, student:students(full_name)')
  let totalCollected = 0, totalPending = 0
  allFees?.forEach(f => {
    console.log(`  ${f.student?.full_name}: Total=₹${f.total_fee} Paid=₹${f.amount_paid} Pending=₹${f.pending_balance}`)
    totalCollected += parseFloat(f.amount_paid || 0)
    totalPending += parseFloat(f.pending_balance || 0)
  })
  console.log(`\n  Total Collected: ₹${totalCollected.toLocaleString('en-IN')}`)
  console.log(`  Total Pending:   ₹${totalPending.toLocaleString('en-IN')}`)
}

main().catch(err => console.error(err))
