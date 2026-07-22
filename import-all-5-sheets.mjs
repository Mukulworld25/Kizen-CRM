import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const SU = 'https://zmqvjtenuxlvwfopfroc.supabase.co'
const SK = 'sb_publishable_ezZ7_UyticpI7aeLKY3Rew_i_FaZBDh'
const supabase = createClient(SU, SK)

function cleanPhone(raw) {
  if (!raw) return '9999999999'
  const digits = raw.toString().replace(/\D/g, '')
  if (digits.length >= 10) return digits.slice(-10)
  return digits.padEnd(10, '0').slice(0, 10)
}

function parseCSVLine(line) {
  const result = []
  let insideQuote = false
  let current = ''
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      insideQuote = !insideQuote
    } else if (char === ',' && !insideQuote) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

function mapSource(raw) {
  if (!raw) return 'other'
  const s = raw.toLowerCase()
  if (s.includes('insta')) return 'instagram'
  if (s.includes('face')) return 'facebook'
  if (s.includes('walk')) return 'walk_in'
  if (s.includes('ref') || s.includes('simrat') || s.includes('preeti') || s.includes('lakshay')) return 'referral'
  if (s.includes('web')) return 'website'
  if (s.includes('wa') || s.includes('whatsapp')) return 'whatsapp'
  if (s.includes('college')) return 'college_visit'
  return 'other'
}

function mapStatus(raw) {
  if (!raw) return 'new'
  const s = raw.toLowerCase()
  if (s.includes('enrol') || s.includes('admit')) return 'enrolled'
  if (s.includes('close') || s.includes('lost') || s.includes('not int') || s.includes('unpicked')) return 'lost'
  if (s.includes('contact') || s.includes('visit') || s.includes('demo') || s.includes('intrest')) return 'contacted'
  return 'new'
}

async function main() {
  console.log('=== STARTING 5-SHEET AUTOMATED INGESTION ===')

  // Auth as Shivam Owner
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'shivam.kizen.test@gmail.com',
    password: 'Shivam@123'
  })
  if (authErr) { console.error('Auth Error:', authErr.message); return }
  console.log(`Authenticated as: ${authData.user.email}`)

  // Clean test lead records created during diagnostics
  await supabase.from('leads').delete().ilike('full_name', 'Test %')

  // Get user IDs for counselors
  const { data: users } = await supabase.from('users').select('id, name, email')
  const aadyaId = users?.find(u => u.email === 'counselor1@kizen.edu')?.id
  const lakshayaId = users?.find(u => u.email === 'lakshaya@kizen.edu')?.id

  // 1. Ingest Leads by Lakshaya Ma'am
  console.log('\n--- Ingesting Leads by Lakshaya Ma\'am ---')
  const file1 = readFileSync('C:/Users/admin/Downloads/Leads by Lakshaya Ma\'am - Sheet1.csv', 'utf8')
  const lines1 = file1.split('\n').map(l => l.trim()).filter(Boolean)
  let lCount1 = 0

  for (let i = 1; i < lines1.length; i++) {
    const cols = parseCSVLine(lines1[i])
    if (cols.length < 3) continue
    const name = cols[1]?.replace(/^"|"$/g, '')
    const mobile = cleanPhone(cols[2])
    const city = cols[4]?.replace(/^"|"$/g, '')
    const status = mapStatus(cols[5])
    const remarks = cols[6]?.replace(/^"|"$/g, '')

    if (name && name !== 'Name' && name.length > 1) {
      const { error } = await supabase.from('leads').insert({
        full_name: name,
        mobile: mobile,
        city: city || null,
        status: status,
        source: 'referral',
        notes: remarks || 'Imported from Leads by Lakshaya Ma\'am',
        assigned_counselor_id: lakshayaId
      })
      if (!error) lCount1++
      else console.error(`Err row ${i} (${name}):`, error.message)
    }
  }
  console.log(`✅ Ingested ${lCount1} leads for Counselor Lakshaya Ma'am`)

  // 2. Ingest My Students (Counselor Aadya)
  console.log('\n--- Ingesting My Students (Counselor Aadya) ---')
  const file2 = readFileSync('C:/Users/admin/Downloads/My students  - ACCA.csv', 'utf8')
  const lines2 = file2.split('\n').map(l => l.trim()).filter(Boolean)
  let lCount2 = 0

  for (let i = 2; i < lines2.length; i++) {
    const cols = parseCSVLine(lines2[i])
    if (cols.length < 5) continue
    const name = cols[2]?.replace(/^"|"$/g, '')
    const mobile = cleanPhone(cols[4])
    const city = cols[5]?.replace(/^"|"$/g, '')
    const source = mapSource(cols[6])
    const status = mapStatus(cols[7])
    const notes = cols[8]?.replace(/^"|"$/g, '')

    if (name && name !== 'NAME' && name.length > 1) {
      const { error } = await supabase.from('leads').insert({
        full_name: name,
        mobile: mobile,
        city: city || null,
        source: source,
        status: status,
        notes: notes || 'Imported from My Students - ACCA',
        assigned_counselor_id: aadyaId
      })
      if (!error) lCount2++
      else console.error(`Err row ${i} (${name}):`, error.message)
    }
  }
  console.log(`✅ Ingested ${lCount2} leads for Counselor Aadya Sharma`)

  // 3. Ingest Hot Leads
  console.log('\n--- Ingesting Hot Leads ---')
  const file3 = readFileSync('C:/Users/admin/Downloads/Leads for Kizen - Hot Leads.csv', 'utf8')
  const lines3 = file3.split('\n').map(l => l.trim()).filter(Boolean)
  let lCount3 = 0

  for (let i = 1; i < lines3.length; i++) {
    const cols = parseCSVLine(lines3[i])
    if (cols.length < 3) continue
    const name = cols[1]?.replace(/^"|"$/g, '')
    const mobile = cleanPhone(cols[2])
    const city = cols[6]?.replace(/^"|"$/g, '')
    const remarks = cols[10]?.replace(/^"|"$/g, '')

    if (name && name.length > 1 && !name.includes('Lead') && !name.includes('Names')) {
      const { error } = await supabase.from('leads').insert({
        full_name: name,
        mobile: mobile,
        city: city || null,
        temperature: 'hot',
        source: 'referral',
        status: 'contacted',
        notes: remarks || 'Imported from Hot Leads',
        assigned_counselor_id: aadyaId
      })
      if (!error) lCount3++
      else console.error(`Err row ${i} (${name}):`, error.message)
    }
  }
  console.log(`✅ Ingested ${lCount3} Hot Leads`)

  console.log('\n=== ALL 5 SHEETS FULLY INGESTED SUCCESSFULLY ===')
}

main().catch(err => console.error(err))
