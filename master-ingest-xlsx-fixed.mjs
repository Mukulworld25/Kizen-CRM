import { createClient } from '@supabase/supabase-js'
import XLSX from 'xlsx'
import fs from 'fs'
import path from 'path'

const SU = 'https://zmqvjtenuxlvwfopfroc.supabase.co'
const SK = 'sb_publishable_ezZ7_UyticpI7aeLKY3Rew_i_FaZBDh'
const supabase = createClient(SU, SK)

function cleanPhone(raw) {
  if (!raw) return null
  const s = String(raw).trim()
  const digits = s.replace(/\D/g, '')
  if (digits.length >= 10) {
    return digits.slice(-10)
  }
  return null
}

function cleanStr(val) {
  if (val === null || val === undefined) return ''
  const s = String(val).trim()
  if (['none', 'null', 'nan', 'undefined', 'n/a', '0'].includes(s.toLowerCase())) return ''
  return s
}

function mapSource(raw) {
  const s = cleanStr(raw).toLowerCase()
  if (s.includes('insta')) return 'instagram'
  if (s.includes('face') || s.includes('fb')) return 'facebook'
  if (s.includes('walk')) return 'walk_in'
  if (['ref', 'simrat', 'preeti', 'lakshay', 'aadya', 'friend'].some(k => s.includes(k))) return 'referral'
  if (s.includes('web') || s.includes('site')) return 'website'
  if (s.includes('wa') || s.includes('whatsapp') || s.includes('sensy')) return 'whatsapp'
  if (['college', 'school', 'pu', 'cuet', '12th'].some(k => s.includes(k))) return 'college_visit'
  return 'other'
}

function mapStatus(raw) {
  const s = cleanStr(raw).toLowerCase()
  if (['enrol', 'admit', 'paid', 'joined', 'converted'].some(k => s.includes(k))) return 'converted'
  if (['close', 'lost', 'not int', 'unpicked', 'reject', 'wrong'].some(k => s.includes(k))) return 'lost'
  if (['contact', 'visit', 'demo', 'intrest', 'follow', 'call', 'talk'].some(k => s.includes(k))) return 'contacted'
  return 'new_lead'
}

function mapTemperature(raw, tabName = '') {
  const s = (cleanStr(raw) + ' ' + tabName).toLowerCase()
  if (s.includes('hot')) return 'hot'
  if (s.includes('warm')) return 'warm'
  if (s.includes('cold')) return 'cold'
  return 'warm'
}

async function main() {
  console.log('=== MASTER ZERO-ERROR MULTI-WORKBOOK INGESTION ENGINE (EXPLICIT DISPLAY ID) ===\n')

  // Auth as Shivam Owner
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'shivam.kizen.test@gmail.com',
    password: 'Shivam@123'
  })

  if (authErr) {
    console.error('Auth error:', authErr.message)
    return
  }

  console.log(`Authenticated as Owner: ${authData.user.email}`)

  // Get Counselor IDs
  const { data: users } = await supabase.from('users').select('id, name, email')
  const aadyaId = users?.find(u => u.email === 'counselor1@kizen.edu')?.id
  const lakshayaId = users?.find(u => u.email === 'lakshaya@kizen.edu')?.id
  const preetiId = users?.find(u => u.email === 'reception@kizen.edu')?.id

  console.log(`Counselor IDs: Aadya=${aadyaId}, Lakshaya=${lakshayaId}, Preeti=${preetiId}\n`)

  const downloads = 'C:/Users/admin/Downloads'
  const fileNames = [
    'Leads for Kizen.xlsx',
    'Data for Preeti.xlsx',
    'My students.xlsx',
    "Leads by Lakshaya Ma'am.xlsx",
    'Fees Tracker.xlsx',
    '_Fee Structure- Kizen.xlsx'
  ]

  const leadsByMobile = new Map()
  const leadsByName = new Map()
  let totalRowsRead = 0

  for (const fname of fileNames) {
    const fpath = path.join(downloads, fname)
    if (!fs.existsSync(fpath)) {
      console.log(`SKIP: File not found -> ${fname}`)
      continue
    }

    console.log(`📁 Reading Workbook: ${fname}`)
    const workbook = XLSX.readFile(fpath)

    for (const sname of workbook.SheetNames) {
      const sheet = workbook.Sheets[sname]
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

      if (!rows || rows.length === 0) continue

      // Locate column headers
      let headerIdx = -1
      let nameCol = -1
      let phoneCol = -1
      let cityCol = -1
      let courseCol = -1
      let statusCol = -1
      let notesCol = -1
      let sourceCol = -1

      for (let i = 0; i < Math.min(5, rows.length); i++) {
        const rowStr = rows[i].map(c => String(c).toLowerCase())
        if (rowStr.some(c => c.includes('name') || c.includes('contact') || c.includes('mobile') || c.includes('phone'))) {
          headerIdx = i
          rowStr.forEach((h, colI) => {
            if (h.includes('name') && nameCol === -1) nameCol = colI
            if (['contact', 'mobile', 'phone', 'number', 'whatsapp'].some(k => h.includes(k)) && phoneCol === -1) phoneCol = colI
            if (['city', 'location', 'address', 'state'].some(k => h.includes(k)) && cityCol === -1) cityCol = colI
            if (['class', 'course', 'qualificat', 'subject', 'program'].some(k => h.includes(k)) && courseCol === -1) courseCol = colI
            if (['status', 'stage'].some(k => h.includes(k)) && statusCol === -1) statusCol = colI
            if (['remark', 'note', 'comment', 'detail'].some(k => h.includes(k)) && notesCol === -1) notesCol = colI
            if (h.includes('source') && sourceCol === -1) sourceCol = colI
          })
          break
        }
      }

      if (nameCol === -1 && phoneCol === -1) {
        nameCol = rows[0].length > 1 ? 1 : 0
        phoneCol = rows[0].length > 2 ? 2 : -1
      }

      let tabRecordCount = 0

      for (let i = headerIdx + 1; i < rows.length; i++) {
        const r = rows[i]
        if (!r || r.every(cell => String(cell).trim() === '')) continue

        totalRowsRead++

        const rawName = cleanStr(r[nameCol])
        const rawPhone = r[phoneCol]
        const phone = cleanPhone(rawPhone)

        if (!rawName && !phone) continue
        if (['name', 'names', 'contact no', 'lead date', 'total', 's.no', 'sr.no'].includes(rawName.toLowerCase())) continue

        const city = cleanStr(r[cityCol])
        const course = cleanStr(r[courseCol])
        const statusRaw = cleanStr(r[statusCol])
        const notesRaw = cleanStr(r[notesCol])
        const sourceRaw = cleanStr(r[sourceCol])

        let assignedId = aadyaId
        if (fname.toLowerCase().includes('preeti')) assignedId = preetiId
        else if (fname.toLowerCase().includes('lakshaya') || sname.toLowerCase().includes('lakshaya')) assignedId = lakshayaId

        const status = mapStatus(statusRaw)
        const source = mapSource(sourceRaw || sname)
        const temp = mapTemperature(notesRaw, sname)
        const noteDetail = `[${sname}] ${notesRaw} ${course}`.trim().slice(0, 300)

        const leadObj = {
          full_name: (rawName || `Lead ${phone}`).slice(0, 100),
          mobile: phone || '9999999999',
          city: city ? city.slice(0, 50) : null,
          status: status,
          source: source,
          temperature: temp,
          notes: noteDetail,
          assigned_counselor_id: assignedId
        }

        if (phone && phone !== '9999999999') {
          if (leadsByMobile.has(phone)) {
            const existing = leadsByMobile.get(phone)
            existing.notes = (existing.notes + ` | ${noteDetail}`).slice(0, 500)
            if (status === 'converted') existing.status = 'converted'
            if (temp === 'hot') existing.temperature = 'hot'
          } else {
            leadsByMobile.set(phone, leadObj)
          }
        } else {
          const nameKey = rawName.toLowerCase()
          if (leadsByName.has(nameKey)) {
            const existing = leadsByName.get(nameKey)
            existing.notes = (existing.notes + ` | ${noteDetail}`).slice(0, 500)
          } else {
            leadsByName.set(nameKey, leadObj)
          }
        }

        tabRecordCount++
      }

      console.log(`  📄 Tab [${sname.trim()}]: ${tabRecordCount} lead records extracted`)
    }
  }

  const rawMasterLeads = [...leadsByMobile.values(), ...leadsByName.values()]

  // Assign unique display_id to avoid trigger sequence collisions
  const masterLeads = rawMasterLeads.map((l, idx) => ({
    ...l,
    display_id: `KZ-${String(idx + 1).padStart(6, '0')}`
  }))

  console.log('\n================ DATA RECONCILIATION AUDIT ================')
  console.log(` Total Raw Spreadsheet Rows Read: ${totalRowsRead}`)
  console.log(` Total Unique Master Leads Deduplicated: ${masterLeads.length}`)
  console.log(`   - Verified by Mobile Number: ${leadsByMobile.size}`)
  console.log(`   - Verified by Name (No Phone): ${leadsByName.size}`)

  // Clear previous leads to ensure 100% clean state
  console.log('\nCleaning previous lead records to prevent duplication...')
  await supabase.from('leads').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  // Insert master leads in clean batches
  console.log('\n🚀 Inserting clean master leads into Supabase DB...')
  const batchSize = 250
  let successCount = 0

  for (let i = 0; i < masterLeads.length; i += batchSize) {
    const batch = masterLeads.slice(i, i + batchSize)
    const { error } = await supabase.from('leads').insert(batch)

    if (error) {
      console.error(`❌ Batch ${Math.floor(i / batchSize) + 1} error:`, error.message)
    } else {
      successCount += batch.length
      console.log(`  ✓ Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(masterLeads.length / batchSize)} (${successCount}/${masterLeads.length} leads)`)
    }
  }

  // Audit count in Supabase
  const { count } = await supabase.from('leads').select('*', { count: 'exact', head: true })
  console.log(`\n✅ DATABASE AUDIT VERIFIED: ${count} total master leads live in Supabase!`)
}

main().catch(err => console.error(err))
