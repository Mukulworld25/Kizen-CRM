import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const SU = 'https://zmqvjtenuxlvwfopfroc.supabase.co'
const SK = 'sb_publishable_ezZ7_UyticpI7aeLKY3Rew_i_FaZBDh'
const supabase = createClient(SU, SK)

function parseCSV(filePath) {
  const content = readFileSync(filePath, 'utf8')
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0)
  if (lines.length === 0) return { headers: [], rows: [] }

  // Simple CSV parser handling quotes
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
  console.log('=== PART 4.1: RUNNING TEST BATCH (FIRST 5 ROWS) ===\n')

  const si = await supabase.auth.signInWithPassword({ email: 'shivam.kizen.test@gmail.com', password: 'Shivam@123' })
  if (si.error) {
    console.error('Sign-in failed:', si.error.message)
    return
  }
  console.log('✓ Signed in as:', si.data.user.email)

  // 1. File 1: Leads Test Batch (First 5 Rows)
  const file1Path = 'C:\\Users\\admin\\Downloads\\Leads for Kizen - ACCA (April).csv'
  const file1Data = parseCSV(file1Path)
  console.log(`✓ Parsed File 1: ${file1Data.rows.length} total rows found.`)

  // Map File 1 headers to template keys
  const mappedFile1Headers = ['full_name', 'mobile', 'city', 'school_college', 'class_year', 'lead_date', 'status', 'interest_level', 'disposition', 'notes']
  const file1TestRows = file1Data.rows.slice(0, 5).map(r => ({
    full_name: r['Names '] || r['Names'] || r['Name'],
    mobile: r['Contact No.'] || r['Contact No'],
    city: r['City'],
    school_college: r['School/College'],
    class_year: r['Current Class/ Qualification'],
    lead_date: r['Lead Date'],
    status: r['Call Status'],
    interest_level: r['Interest level'],
    disposition: r['Disposition'],
    notes: [r['REMARKS'], r['Follow-up 1'], r['Remarks after Follow-up 2']].filter(Boolean).join(' | ') || null,
  }))

  console.log('\n--- Processing File 1 Test Batch (5 rows) ---')
  const { data: res1, error: err1 } = await supabase.rpc('process_intake_batch', {
    p_section: 'leads',
    p_source: 'manual_upload',
    p_filename: 'Leads for Kizen - ACCA (April).csv (Test Batch)',
    p_headers: mappedFile1Headers,
    p_rows: file1TestRows,
    p_uploaded_by: si.data.user.id,
    p_import_type: 'historical_backfill',
  })

  if (err1) {
    console.error('❌ File 1 Test Batch RPC Error:', err1.message)
  } else {
    console.log('✓ File 1 Test Batch Result:', res1)
  }

  // 2. File 3: Fee Payments Test Batch (First 5 Rows)
  const file3Path = 'C:\\Users\\admin\\Downloads\\Fees Tracker - 11th & 12th.csv'
  const file3Data = parseCSV(file3Path)
  console.log(`\n✓ Parsed File 3: ${file3Data.rows.length} total rows found.`)

  const mappedFile3Headers = ['student_name', 'contact_no', 'total_amount', 'course', 'subject', 'duration', 'pending_amount']
  const file3TestRows = file3Data.rows.slice(0, 5).map(r => ({
    student_name: r["Student's Name"],
    contact_no: r['Contact No.'],
    total_amount: r['Total Amount'],
    course: r['Course'],
    subject: r['Subject'],
    duration: r['Duration'],
    pending_amount: r['Pending Amount'],
    installment_1_amount: r['First Instalment'],
    installment_1_due: r['Due Date'],
    installment_2_amount: r['Second Instalment'],
  }))

  console.log('\n--- Processing File 3 Test Batch (5 rows) ---')
  const { data: res3, error: err3 } = await supabase.rpc('process_intake_batch', {
    p_section: 'fee_payments',
    p_source: 'manual_upload',
    p_filename: 'Fees Tracker - 11th & 12th.csv (Test Batch)',
    p_headers: mappedFile3Headers,
    p_rows: file3TestRows,
    p_uploaded_by: si.data.user.id,
    p_import_type: 'historical_backfill',
  })

  if (err3) {
    console.error('❌ File 3 Test Batch RPC Error:', err3.message)
  } else {
    console.log('✓ File 3 Test Batch Result:', res3)
  }

  // 3. Inspect Inserted Records to Verify Normalization, display_id & lead_id Auto-Linking
  console.log('\n--- Verifying Inserted Lead Test Records ---')
  const { data: leadsCheck } = await supabase
    .from('leads')
    .select('id, display_id, full_name, mobile, pipeline_stage, days_to_first_contact, interest_level, disposition')
    .order('created_at', { ascending: false })
    .limit(5)
  console.table(leadsCheck)

  console.log('\n--- Verifying Inserted Fee Payment Test Records ---')
  const { data: feesCheck } = await supabase
    .from('fee_payments')
    .select('id, display_id, student_name, contact_no, total_amount, lead_id')
    .order('created_at', { ascending: false })
    .limit(5)
  console.table(feesCheck)
}

runTestBatch().catch(console.error)
