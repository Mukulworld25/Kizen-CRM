import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const SU = 'https://zmqvjtenuxlvwfopfroc.supabase.co'
const SK = 'sb_publishable_ezZ7_UyticpI7aeLKY3Rew_i_FaZBDh'
const supabase = createClient(SU, SK)

// Phone normalization helper
function normalizePhone(raw) {
  if (!raw) return null
  const digits = String(raw).trim().replace(/[^0-9]/g, '')
  if (digits.length === 12 && digits.startsWith('91')) {
    const sliced = digits.slice(2)
    return sliced.length === 10 ? sliced : null
  }
  return digits.length === 10 ? digits : null
}

// Custom Date Parser: Handles "9 April 2026", "10 April 26", "27 May 26", "4 June 2026", etc.
function parseCustomDate(dateStr) {
  if (!dateStr || !String(dateStr).trim()) return null
  const cleaned = String(dateStr).trim()
  const parts = cleaned.split(/\s+/)

  if (parts.length >= 3) {
    const day = parts[0].replace(/[^0-9]/g, '').padStart(2, '0')
    const monthStr = parts[1].toLowerCase()
    let year = parts[2].replace(/[^0-9]/g, '')
    if (year.length === 2) year = '20' + year

    const months = {
      jan: '01', january: '01',
      feb: '02', february: '02',
      mar: '03', march: '03',
      apr: '04', april: '04',
      may: '05',
      jun: '06', june: '06',
      jul: '07', july: '07',
      aug: '08', august: '08',
      sep: '09', september: '09',
      oct: '10', october: '10',
      nov: '11', november: '11',
      dec: '12', december: '12'
    }
    const monthNum = months[monthStr.substring(0, 3)]
    if (monthNum && day.length > 0 && year.length === 4) {
      return `${year}-${monthNum}-${day}`
    }
  }

  try {
    const d = new Date(cleaned)
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0]
    }
  } catch (e) {}

  return null
}

// Robust CSV Parser
function parseCSV(filePath) {
  const content = readFileSync(filePath, 'utf8')
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0)
  if (lines.length === 0) return { headers: [], rawRows: [] }

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

  const rawHeaders = parseLine(lines[0])
  const rawRows = []
  for (let i = 1; i < lines.length; i++) {
    const vals = parseLine(lines[i])
    if (vals.length === 0) continue
    rawRows.push(vals)
  }
  return { rawHeaders, rawRows }
}

async function main() {
  console.log('===============================================================')
  console.log('  KIZEN CRM — PHASE 3C: FULL HISTORICAL DATA IMPORT PIPELINE')
  console.log('===============================================================\n')

  const si = await supabase.auth.signInWithPassword({ email: 'shivam.kizen.test@gmail.com', password: 'Shivam@123' })
  if (si.error) {
    console.error('❌ Authentication failed:', si.error.message)
    process.exit(1)
  }
  console.log('✓ Authenticated as:', si.data.user.email)

  // -----------------------------------------------------------------
  // STEP 1: LEADS FILE IMPORT (Leads for Kizen - ACCA (April).csv)
  // -----------------------------------------------------------------
  const leadsFilePath = 'C:\\Users\\admin\\Downloads\\Leads for Kizen - ACCA (April).csv'
  console.log(`\n---------------------------------------------------------------`)
  console.log(`STEP 1: Importing Leads File (${leadsFilePath})`)
  console.log(`---------------------------------------------------------------`)

  const file1 = parseCSV(leadsFilePath)
  console.log(`✓ Parsed ${file1.rawRows.length} raw rows from Leads CSV.`)

  const leadsHeaders = [
    'full_name', 'mobile', 'lead_date', 'class_year', 'city', 'tap_date',
    'status', 'interest_level', 'disposition', 'notes', 'school_college'
  ]

  const validLeadRows = []
  let rejectedMalformedLeads = 0

  for (const vals of file1.rawRows) {
    const name = (vals[2] || vals[0] || '').trim()
    const rawMobile = (vals[3] || vals[1] || '').trim()
    if (!name || !rawMobile) continue

    const normMobile = normalizePhone(rawMobile)
    if (!normMobile) {
      rejectedMalformedLeads++
      await supabase.from('import_audit_log').insert({
        section: 'leads',
        filename_source: 'Leads for Kizen - ACCA (April).csv',
        row_count_attempted: 1,
        row_count_imported: 0,
        row_count_rejected_skipped: 1,
        template_matched: true,
        status: 'rejected',
        error_reason: `Invalid 10-digit mobile number: ${rawMobile} (${name})`,
        import_type: 'historical_backfill',
      })
      continue
    }

    const leadDateIso = parseCustomDate(vals[4])
    const tapDateIso = parseCustomDate(vals[8])

    const remarksList = [
      vals[12], // REMARKS
      vals[13], // Follow-up 1
      vals[14], // Follow-up
      vals[15], // Remarks after Follow-up 2
      vals[16], // Follow-up 2 (Date)
      vals[17], // Remarks after Follow-up 2
      vals[18], // Follow-up (Date)
      vals[19], // Remarks after Follow-up
    ].filter(Boolean).map(s => s.trim()).filter(s => s.length > 0)

    validLeadRows.push({
      full_name: name,
      mobile: normMobile,
      lead_date: leadDateIso,
      class_year: (vals[5] || '').trim() || null,
      school_college: (vals[6] || '').trim() || null,
      city: (vals[7] || '').trim() || null,
      tap_date: tapDateIso,
      status: (vals[9] || '').trim() || null,
      interest_level: (vals[10] || '').trim() || null,
      disposition: (vals[11] || '').trim() || null,
      notes: remarksList.length > 0 ? remarksList.join(' | ') : null,
    })
  }

  console.log(`✓ ${validLeadRows.length} valid lead rows prepared. (${rejectedMalformedLeads} malformed phone rows logged to audit log)`)

  const BATCH_SIZE = 50
  let totalLeadsAttempted = validLeadRows.length
  let totalLeadsImported = 0
  let totalLeadsSkipped = 0

  for (let i = 0; i < validLeadRows.length; i += BATCH_SIZE) {
    const batch = validLeadRows.slice(i, i + BATCH_SIZE)
    const { data: res, error: err } = await supabase.rpc('process_intake_batch', {
      p_section: 'leads',
      p_source: 'manual_upload',
      p_filename: 'Leads for Kizen - ACCA (April).csv',
      p_headers: leadsHeaders,
      p_rows: batch,
      p_uploaded_by: null,
      p_import_type: 'historical_backfill',
    })

    if (err) {
      console.error(`❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} Error:`, err.message)
      totalLeadsSkipped += batch.length
    } else {
      console.log(`✓ Batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} rows):`, res)
      if (res && res.imported !== undefined) {
        totalLeadsImported += res.imported
        totalLeadsSkipped += (res.skipped || 0)
      }
    }
  }

  console.log(`\n✓ LEADS FILE IMPORT COMPLETE: ${totalLeadsImported} imported, ${totalLeadsSkipped} skipped/deduplicated, ${rejectedMalformedLeads} malformed rejected.`)

  // -----------------------------------------------------------------
  // STEP 2: FEES TRACKER IMPORT (Fees Tracker - 11th & 12th.csv)
  // -----------------------------------------------------------------
  const feesFilePath = 'C:\\Users\\admin\\Downloads\\Fees Tracker - 11th & 12th.csv'
  console.log(`\n---------------------------------------------------------------`)
  console.log(`STEP 2: Importing Fees Tracker File (${feesFilePath})`)
  console.log(`---------------------------------------------------------------`)

  const file3 = parseCSV(feesFilePath)
  console.log(`✓ Parsed ${file3.rawRows.length} raw rows from Fees CSV.`)

  const feesHeaders = [
    'student_name', 'contact_no', 'total_amount', 'pending_amount',
    'course', 'subject', 'duration'
  ]

  const formattedFeeRows = []
  for (const vals of file3.rawRows) {
    const studentName = vals[1]
    const contactNo = vals[2]
    const totalAmount = vals[6]
    if (!studentName || !totalAmount) continue

    const rowObj = {
      student_name: studentName.trim(),
      contact_no: contactNo ? contactNo.trim() : null,
      course: (vals[3] || '').trim() || null,
      subject: (vals[4] || '').trim() || null,
      duration: (vals[5] || '').trim() || null,
      total_amount: totalAmount.trim(),
      pending_amount: (vals[7] || '').trim() || null,
    }

    if (vals[8]) {
      rowObj['instalment_1_amount'] = vals[8].trim()
      if (vals[9]) rowObj['instalment_1_due'] = parseCustomDate(vals[9])
    }
    if (vals[10]) {
      rowObj['instalment_2_amount'] = vals[10].trim()
      if (vals[11]) rowObj['instalment_2_due'] = parseCustomDate(vals[11])
    }
    if (vals[12]) {
      rowObj['instalment_3_amount'] = vals[12].trim()
      if (vals[13]) rowObj['instalment_3_due'] = parseCustomDate(vals[13])
    }
    if (vals[14]) {
      rowObj['instalment_4_amount'] = vals[14].trim()
      if (vals[15]) rowObj['instalment_4_due'] = parseCustomDate(vals[15])
    }
    if (vals[16]) {
      rowObj['instalment_5_amount'] = vals[16].trim()
      if (vals[17]) rowObj['instalment_5_due'] = parseCustomDate(vals[17])
    }

    formattedFeeRows.push(rowObj)
  }

  console.log(`✓ Transformed ${formattedFeeRows.length} valid fee payment rows.`)

  const { data: feeRes, error: feeErr } = await supabase.rpc('process_intake_batch', {
    p_section: 'fee_payments',
    p_source: 'manual_upload',
    p_filename: 'Fees Tracker - 11th & 12th.csv',
    p_headers: feesHeaders,
    p_rows: formattedFeeRows,
    p_uploaded_by: null,
    p_import_type: 'historical_backfill',
  })

  if (feeErr) {
    console.error('❌ Fees Tracker RPC Error:', feeErr.message)
  } else {
    console.log('✓ Fees Tracker Result:', feeRes)
  }

  // -----------------------------------------------------------------
  // STEP 3: HOT-LEADS FILE UPDATE (My students  - ACCA.csv)
  // -----------------------------------------------------------------
  const hotLeadsFilePath = 'C:\\Users\\admin\\Downloads\\My students  - ACCA.csv'
  console.log(`\n---------------------------------------------------------------`)
  console.log(`STEP 3: Processing Hot-Leads Counselor Updates (${hotLeadsFilePath})`)
  console.log(`---------------------------------------------------------------`)

  const file2 = parseCSV(hotLeadsFilePath)
  console.log(`✓ Parsed ${file2.rawRows.length} raw rows from Hot-Leads CSV.`)

  let matchedHotCount = 0
  let unmatchedHotCount = 0

  for (const vals of file2.rawRows) {
    const rawName = (vals[2] || vals[1] || '').trim()
    const rawNumber = (vals[4] || vals[3] || '').trim()
    if (!rawName && !rawNumber) continue

    const normPhone = normalizePhone(rawNumber)
    const counselorName = (vals[6] || '').trim()
    const hotStatus = (vals[7] || '').trim()
    const feedback = (vals[8] || '').trim()

    if (!normPhone) {
      unmatchedHotCount++
      await supabase.from('import_audit_log').insert({
        section: 'leads',
        filename_source: 'My students  - ACCA.csv',
        row_count_attempted: 1,
        row_count_imported: 0,
        row_count_rejected_skipped: 1,
        template_matched: true,
        status: 'rejected',
        error_reason: `unmatched_hot_lead: Invalid 10-digit phone number: ${rawNumber || 'empty'} (${rawName})`,
        import_type: 'historical_backfill',
      })
      continue
    }

    // Find matching lead by normalized mobile
    const { data: matchedLead } = await supabase
      .from('leads')
      .select('id, notes')
      .eq('mobile', normPhone)
      .maybeSingle()

    if (matchedLead) {
      matchedHotCount++
      const newNotes = feedback ? (matchedLead.notes ? `${matchedLead.notes} | ${feedback}` : feedback) : matchedLead.notes

      await supabase
        .from('leads')
        .update({
          counselor_name: counselorName || undefined,
          hot_lead_status: hotStatus || undefined,
          notes: newNotes,
        })
        .eq('id', matchedLead.id)
    } else {
      unmatchedHotCount++
      await supabase.from('import_audit_log').insert({
        section: 'leads',
        filename_source: 'My students  - ACCA.csv',
        row_count_attempted: 1,
        row_count_imported: 0,
        row_count_rejected_skipped: 1,
        template_matched: true,
        status: 'rejected',
        error_reason: `unmatched_hot_lead: No lead found for phone ${normPhone} (${rawName})`,
        import_type: 'historical_backfill',
      })
    }
  }

  await supabase.from('import_audit_log').insert({
    section: 'leads',
    filename_source: 'My students  - ACCA.csv',
    row_count_attempted: matchedHotCount + unmatchedHotCount,
    row_count_imported: matchedHotCount,
    row_count_rejected_skipped: unmatchedHotCount,
    template_matched: true,
    status: 'success',
    import_type: 'historical_backfill',
  })

  console.log(`✓ Hot-Leads Updates Complete: ${matchedHotCount} leads updated, ${unmatchedHotCount} unmatched rows logged.`)

  // -----------------------------------------------------------------
  // STEP 4: VERIFICATION & AUDIT LOG CHECK
  // -----------------------------------------------------------------
  console.log(`\n===============================================================`)
  console.log(`STEP 4: AUDIT LOG VERIFICATION (Direct DB Query)`)
  console.log(`===============================================================\n`)

  const { data: auditLogs, error: auditErr } = await supabase
    .from('import_audit_log')
    .select('section, filename_source, row_count_attempted, row_count_imported, row_count_rejected_skipped, status, error_reason, timestamp')
    .order('timestamp', { ascending: false })
    .limit(10)

  if (auditErr) {
    console.error('❌ Audit Log Query Error:', auditErr.message)
  } else {
    console.table(auditLogs)
  }

  // Calculate Relational Match Rate for Fee Payments
  const { data: feeMatches } = await supabase
    .from('fee_payments')
    .select('id, student_name, contact_no, lead_id')

  const matchedFeeCount = (feeMatches || []).filter(f => f.lead_id !== null).length
  const totalFeeCount = (feeMatches || []).length
  const matchRatePercent = totalFeeCount > 0 ? ((matchedFeeCount / totalFeeCount) * 100).toFixed(1) : '0.0'

  console.log(`\n--- Relational Link Metrics ---`)
  console.log(`Fee Payments Linked to Real Leads: ${matchedFeeCount} of ${totalFeeCount} (${matchRatePercent}%)`)

  // Check Dashboard Summary View
  const { data: dashSummary } = await supabase
    .from('dashboard_summary')
    .select('*')
    .single()

  console.log(`\n--- Live Dashboard Summary Metrics ---`)
  console.log(dashSummary)
}

main().catch(console.error)
