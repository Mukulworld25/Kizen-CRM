import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import crypto from 'crypto'

const SU = 'https://zmqvjtenuxlvwfopfroc.supabase.co'
const SK = 'sb_publishable_ezZ7_UyticpI7aeLKY3Rew_i_FaZBDh'
const supabase = createClient(SU, SK)

// Part 1: Phone Normalization Helper
export function normalizePhone(raw) {
  if (!raw) return null
  const digits = String(raw).trim().replace(/[^0-9]/g, '')
  if (digits.length === 12 && digits.startsWith('91')) {
    const sliced = digits.slice(2)
    return sliced.length === 10 ? sliced : null
  }
  return digits.length === 10 ? digits : null
}

// Simple CSV parser
export function parseCSV(filePath) {
  const content = readFileSync(filePath, 'utf8')
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0)
  if (lines.length === 0) return { headers: [], rows: [] }

  const parseLine = (line) => {
    const values = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim())
    return values
  }

  const headers = parseLine(lines[0])
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const vals = parseLine(lines[i])
    if (vals.length === 0) continue
    const row = {}
    let hasVal = false
    headers.forEach((h, idx) => {
      const val = vals[idx] !== undefined ? vals[idx] : null
      if (val !== null && val !== '') hasVal = true
      row[h] = val
    })
    if (hasVal) rows.push(row)
  }
  return { headers, rows }
}

async function runTestBatch() {
  console.log('=====================================================')
  console.log('  PART 4.1: RUNNING TEST BATCH (FIRST 5 ROWS)')
  console.log('=====================================================\n')

  const si = await supabase.auth.signInWithPassword({ email: 'shivam.kizen.test@gmail.com', password: 'Shivam@123' })
  if (si.error) {
    console.error('Sign-in failed:', si.error.message)
    return
  }
  console.log('✓ Signed in as:', si.data.user.email)

  // ---------------------------------------------------------
  // TEST BATCH 1: File 1 Leads (First 5 Rows)
  // ---------------------------------------------------------
  const file1Path = 'C:\\Users\\admin\\Downloads\\Leads for Kizen - ACCA (April).csv'
  const file1Data = parseCSV(file1Path)
  const file1Rows = file1Data.rows.slice(0, 5)

  console.log(`\n--- File 1: Processing First 5 Rows (${file1Path}) ---`)
  let file1Imported = 0
  let file1Skipped = 0
  const insertedLeads = []

  for (let i = 0; i < file1Rows.length; i++) {
    const r = file1Rows[i]
    const rawName = r['Names '] || r['Names'] || r['Name']
    const rawMobile = r['Contact No.'] || r['Contact No']
    const normMobile = normalizePhone(rawMobile)

    if (!rawName || !normMobile) {
      console.log(`Row ${i+1}: ❌ REJECTED - Invalid name or 10-digit mobile (Raw: "${rawMobile}")`)
      file1Skipped++
      continue
    }

    const displayId = `LD-2026-${String(i + 1).padStart(4, '0')}`
    const leadDate = r['Lead Date'] ? new Date(r['Lead Date']).toISOString().split('T')[0] : null
    const tapDate = r['Tap Date'] ? new Date(r['Tap Date']).toISOString().split('T')[0] : null
    let daysToFirstContact = null
    if (leadDate && tapDate) {
      const diff = Math.floor((new Date(tapDate) - new Date(leadDate)) / 86400000)
      daysToFirstContact = diff >= 0 ? diff : 0
    }

    // Derive pipeline stage
    const interestLevel = r['Interest level'] || null
    const disposition = r['Disposition'] || null
    const callStatus = r['Call Status'] || null
    let pipelineStage = 'new'
    if (interestLevel === 'Warm') pipelineStage = 'warm'
    else if (interestLevel === 'Cold') pipelineStage = 'cold'
    else if (interestLevel === 'Dead' || (disposition && (disposition.toLowerCase().includes('not interested') || disposition.toLowerCase().includes('plan dropped')))) pipelineStage = 'dead'
    else if (callStatus === 'Connected' || (disposition && disposition.toLowerCase().includes('not connected'))) pipelineStage = 'contacted'

    const leadPayload = {
      full_name: rawName.trim(),
      mobile: normMobile,
      city: r['City'] || null,
      school_college: r['School/College'] || null,
      class_year: r['Current Class/ Qualification'] || null,
      lead_date: leadDate,
      tap_date: tapDate,
      days_to_first_contact: daysToFirstContact,
      status: 'new_lead',
      interest_level: interestLevel,
      disposition: disposition,
      notes: [r['REMARKS'], r['Follow-up 1'], r['Remarks after Follow-up 2']].filter(Boolean).join(' | ') || null,
      display_id: displayId,
      pipeline_stage: pipelineStage,
    }

    const { data: inserted, error: insertErr } = await supabase.from('leads').insert(leadPayload).select().single()

    if (insertErr) {
      if (insertErr.message.includes('unique') || insertErr.code === '23505') {
        console.log(`Row ${i+1} (${rawName}): ⚠️ SKIPPED (Duplicate mobile ${normMobile})`)
        file1Skipped++
      } else {
        console.log(`Row ${i+1} (${rawName}): ❌ ERROR - ${insertErr.message}`)
        file1Skipped++
      }
    } else {
      file1Imported++
      insertedLeads.push(inserted)
      console.log(`Row ${i+1} (${rawName}): ✓ INSERTED | display_id: ${displayId} | mobile: ${normMobile} | stage: ${pipelineStage} | speed_to_lead: ${daysToFirstContact ?? 'N/A'} days`)
    }
  }

  // ---------------------------------------------------------
  // TEST BATCH 2: File 3 Fee Payments (First 5 Rows)
  // ---------------------------------------------------------
  const file3Path = 'C:\\Users\\admin\\Downloads\\Fees Tracker - 11th & 12th.csv'
  const file3Data = parseCSV(file3Path)
  const file3Rows = file3Data.rows.slice(0, 5)

  console.log(`\n--- File 3: Processing First 5 Rows (${file3Path}) ---`)
  let file3Imported = 0
  let file3Skipped = 0
  let autoLinkCount = 0

  for (let i = 0; i < file3Rows.length; i++) {
    const r = file3Rows[i]
    const rawStudent = r["Student's Name"]
    const rawMobile = r['Contact No.']
    const normMobile = normalizePhone(rawMobile)
    const rawTotal = (r['Total Amount'] || '').replace(/[^0-9.]/g, '')

    if (!rawStudent || !rawTotal) {
      console.log(`Row ${i+1}: ❌ REJECTED - Missing student_name or total_amount`)
      file3Skipped++
      continue
    }

    const numTotal = parseFloat(rawTotal)
    const rawPending = (r['Pending Amount'] || '').replace(/[^0-9.]/g, '')
    const numPending = rawPending ? parseFloat(rawPending) : null
    const displayId = `EXP-2026-${String(i + 1).padStart(4, '0')}`

    // Relational Auto-Linking: Match lead_id by normalized mobile
    let matchedLeadId = null
    if (normMobile) {
      const { data: matchedLead } = await supabase
        .from('leads')
        .select('id, full_name')
        .eq('mobile', normMobile)
        .maybeSingle()
      if (matchedLead) {
        matchedLeadId = matchedLead.id
        autoLinkCount++
      }
    }

    const paymentPayload = {
      student_name: rawStudent.trim(),
      contact_no: normMobile,
      course: r['Course'] || null,
      subject: r['Subject'] || null,
      duration: r['Duration'] || null,
      total_amount: numTotal,
      pending_amount: numPending,
      display_id: displayId,
      lead_id: matchedLeadId,
    }

    const { data: insertedPayment, error: payErr } = await supabase.from('fee_payments').insert(paymentPayload).select().single()

    if (payErr) {
      console.log(`Row ${i+1} (${rawStudent}): ❌ ERROR - ${payErr.message}`)
      file3Skipped++
    } else {
      file3Imported++
      console.log(`Row ${i+1} (${rawStudent}): ✓ INSERTED | display_id: ${displayId} | total: ₹${numTotal} | lead_id: ${matchedLeadId ? 'LINKED (' + matchedLeadId.slice(0, 8) + '...)' : 'NULL (No lead match)'}`)

      // Update lead pipeline_stage to 'enrolled' if linked
      if (matchedLeadId) {
        await supabase.from('leads').update({ pipeline_stage: 'enrolled' }).eq('id', matchedLeadId)
      }

      // Position-based Installments (First 3 Installments)
      const installments = [
        { num: 1, amt: r['First Instalment'], due: r['Due Date'] },
        { num: 2, amt: r['Second Instalment'], due: null },
        { num: 3, amt: r['Third Instalment'], due: null },
      ]

      for (const inst of installments) {
        if (inst.amt && inst.amt.trim() !== '') {
          const numAmt = parseFloat(inst.amt.replace(/[^0-9.]/g, ''))
          if (!isNaN(numAmt)) {
            await supabase.from('fee_installments').insert({
              fee_payment_id: insertedPayment.id,
              installment_number: inst.num,
              amount: numAmt,
            })
          }
        }
      }
    }
  }

  // ---------------------------------------------------------
  // TEST BATCH SUMMARY & VERIFICATION
  // ---------------------------------------------------------
  console.log('\n=====================================================')
  console.log('  TEST BATCH VERIFICATION SUMMARY')
  console.log('=====================================================')
  console.log(`File 1 (Leads):        ${file1Imported} inserted, ${file1Skipped} rejected/skipped`)
  console.log(`File 3 (Fee Payments): ${file3Imported} inserted, ${file3Skipped} rejected/skipped | Auto-linked lead_id count: ${autoLinkCount}/${file3Imported}`)

  console.log('\n--- Sample Inserted Leads with Derived Analytics ---')
  const { data: verifyLeads } = await supabase
    .from('leads')
    .select('id, display_id, full_name, mobile, pipeline_stage, days_to_first_contact, interest_level')
    .order('created_at', { ascending: false })
    .limit(5)
  console.table(verifyLeads)

  console.log('\n--- Sample Inserted Fee Payments & Auto-Linked lead_id ---')
  const { data: verifyFees } = await supabase
    .from('fee_payments')
    .select('id, display_id, student_name, contact_no, total_amount, lead_id')
    .order('created_at', { ascending: false })
    .limit(5)
  console.table(verifyFees)
}

runTestBatch().catch(console.error)
