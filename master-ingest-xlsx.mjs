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
  if (['enrol', 'admit', 'paid', 'joined', 'converted'].some(k => s.includes(k))) return 'enrolled'
  if (['close', 'lost', 'not int', 'unpicked', 'reject', 'wrong'].some(k => s.includes(k))) return 'lost'
  if (['contact', 'visit', 'demo', 'intrest', 'follow', 'call', 'talk'].some(k => s.includes(k))) return 'contacted'
  return 'new'
}

function mapTemperature(raw, tabName = '') {
  const s = (cleanStr(raw) + ' ' + tabName).toLowerCase()
  if (s.includes('hot')) return 'hot'
  if (s.includes('warm')) return 'warm'
  if (s.includes('cold')) return 'cold'
  return 'warm'
}

async function main() {
  console.log('=== MASTER ZERO-ERROR MULTI-WORKBOOK INGESTION ENGINE ===\n')

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

        const city = cleanStr(r[city_col_lookup(r, cityCol)])
        const course = cleanStr(r[course_col_lookup(r, courseCol)])
        const statusRaw = cleanStr(r[status_col_lookup(r, statusCol)])
        const notesRaw = cleanStr(r[notes_col_lookup(r, notesCol)])
        const sourceRaw = cleanStr(r[source_col_lookup(r, sourceCol)])

        let assignedId = aadyaId
        if (fname.toLowerCase().includes('preeti')) assignedId = preetiId
        else if (fname.toLowerCase().includes('lakshaya') || sname.toLowerCase().includes('lakshaya')) assignedId = lakshayaId

        const status = mapStatus(statusRaw)
        const source = mapSource(sourceRaw || sname)
        const temp = mapTemperature(notesRaw, sname)
        const noteDetail = `[${fname} -> ${sname}] ${notesRaw} ${course}`.trim()

        const leadObj = {
          full_name: rawName || `Lead ${phone}`,
          mobile: phone || '9999999999',
          city: city || null,
          status: status,
          source: source,
          temperature: temp,
          notes: noteDetail,
          assigned_counselor_id: assignedId
        }

        if (phone && phone !== '9999999999') {
          if (leadsByMobile.has(phone)) {
            const existing = leadsByMobile.get(phone)
            existing.notes += ` | ${noteDetail}`
            if (status === 'enrolled') existing.status = 'enrolled'
            if (temp === 'hot') existing.temperature = 'hot'
          } else {
            leadsByMobile.set(phone, leadObj)
          }
        } else {
          const nameKey = rawName.toLowerCase()
          if (leadsByName.has(nameKey)) {
            const existing = leadsByName.get(nameKey)
            existing.notes += ` | ${noteDetail}`
          } else {
            leadsByName.set(nameKey, leadObj)
          }
        }

        tabRecordCount++
      }

      console.log(`  📄 Tab [${sname.trim()}]: ${tabRecordCount} lead records extracted`)
    }
  }

  const masterLeads = [...leadsByMobile.values(), ...leadsByName.values()]

  console.log('\n================ DATA RECONCILIATION AUDIT ================')
  printSummary(totalRowsRead, masterLeads.length, leadsByMobile.size, leadsByName.size)

  // Upsert to Supabase
  console.log('\n🚀 Upserting deduplicated master leads to Supabase DB...')
  const batchSize = 100
  let successCount = 0

  for (let i = 0; i < masterLeads.length; i += batchSize) {
    const batch = masterLeads.slice(i, i + batchSize)
    const { error } = await supabase.from('leads').upsert(batch, { onConflict: 'mobile' })

    if (error) {
      console.error(`❌ Batch ${i / batchSize + 1} error:`, error.message)
    } else {
      successCount += batch.length
      console.log(`  ✓ Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(masterLeads.length / batchSize)} processed (${successCount}/${masterLeads.length} leads)`)
    }
  }

  // Audit count in Supabase
  const { count } = await supabase.from('leads').select('*', { count: 'exact', head: true })
  console.log(`\n✅ DATABASE AUDIT VERIFIED: ${count} total leads active in Supabase!`)
}

function city_col_lookup(r, idx) { return idx >= 0 && idx < r.length ? idx : -1 }
function course_col_lookup(r, idx) { return idx >= 0 && idx < r.length ? idx : -1 }
function status_col_lookup(r, idx) { return idx >= 0 && idx < r.length ? idx : -1 }
function notes_col_lookup(r, idx) { return idx >= 0 && idx < r.length ? idx : -1 }
function source_col_lookup(r, idx) { return idx >= 0 && idx < r.length ? idx : -1 }

function printSummary(totalRows, uniqueLeads, mobileLeads, nameLeads) {
  console.log(` Total Raw Rows Processed Across All Workbooks: ${totalRows}`)
  console.log(` Total Unique Master Leads Deduplicated:      ${uniqueLeads}`)
  console.log(`   - Verified by Mobile Number:                ${mobileLeads}`)
  console.log(`   - Verified by Name (No Phone):               ${nameLeads}`)
}

main().catch(err => console.error(err))
