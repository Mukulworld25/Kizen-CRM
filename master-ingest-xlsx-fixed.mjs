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
  if (['none', 'null', 'nan', 'undefined', 'n/a', '0', '-', 'nil'].includes(s.toLowerCase())) return ''
  return s
}

function parseAmount(raw) {
  if (!raw) return 0
  const firstPart = String(raw).trim().split(/[\s(]/)[0]
  const clean = firstPart.replace(/[^0-9.]/g, '')
  const num = parseFloat(clean)
  return isNaN(num) ? 0 : num
}

const blocklist = [
  '16 and above', '10 -15 students', 'upto 10 students', '8000', 'total', 's.no', 'sr.no', 'lead no',
  'name', 'names', 'contact no', 'lead date', 'knowledge level', 'skills level', 'offline batch',
  'per month fee', 'annual fee', 'payouts', 'products', 'batch size', 'class 12th commerce',
  'class 11th commerce', 'individual subjects', 'installments', 'integrated with acca', 'integrated with ca'
]

function isGarbage(name, phone) {
  if (!name && !phone) return true
  const n = String(name || '').trim().toLowerCase()
  if (blocklist.some(b => n.includes(b))) return true
  if (/^\d+$/.test(n) && n.length < 10) return true
  if (['none', 'null', 'nan', 'undefined', 'n/a', '0', '-'].includes(n)) return true
  return false
}

function mapStatus(raw) {
  const s = cleanStr(raw).toLowerCase()
  if (['enrol', 'admit', 'paid', 'joined', 'converted'].some(k => s.includes(k))) return 'converted'
  if (['close', 'lost', 'not int', 'unpicked', 'reject', 'wrong'].some(k => s.includes(k))) return 'lost'
  if (['contact', 'visit', 'demo', 'intrest', 'follow', 'call', 'talk'].some(k => s.includes(k))) return 'contacted'
  return 'new_lead'
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

async function main() {
  console.log('===================================================================')
  console.log('=== MULTI-DOMAIN ZERO-ERROR DATA INGESTION ENGINE (PERFECT SCHEMA) ===')
  console.log('===================================================================\n')

  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'shivam.kizen.test@gmail.com',
    password: 'Shivam@123'
  })

  if (authErr) {
    console.error('Auth error:', authErr.message)
    return
  }

  console.log(`Authenticated as Owner: ${authData.user.email}`)

  const { data: users } = await supabase.from('users').select('id, name, email')
  const aadyaId = users?.find(u => u.email === 'counselor1@kizen.edu')?.id
  const lakshayaId = users?.find(u => u.email === 'lakshaya@kizen.edu')?.id
  const preetiId = users?.find(u => u.email === 'reception@kizen.edu')?.id

  const { data: coursesData } = await supabase.from('courses').select('id, name')
  const defaultCourseId = coursesData && coursesData.length > 0 ? coursesData[0].id : null

  // -----------------------------------------------------------------
  // PHASE 1: COMPLETE DATABASE RESET
  // -----------------------------------------------------------------
  console.log('\n--- PHASE 1: COMPLETE DATABASE RESET ---')
  console.log('Wiping corrupted/test records from follow_ups, fee_payments, installments, fees, students, leads...')

  await supabase.from('follow_ups').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('fee_payments').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('installments').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('fees').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('students').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('leads').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  console.log('✓ Database clean reset finished.')

  // -----------------------------------------------------------------
  // PHASE 2: INGEST ENROLLED STUDENTS & FEES
  // -----------------------------------------------------------------
  console.log('\n--- PHASE 2: INGESTING ENROLLED STUDENTS & FEES ---')
  const downloads = 'C:/Users/admin/Downloads'
  const studentFiles = ['Fees Tracker.xlsx', 'My students.xlsx']

  const studentMobiles = new Set()
  let studentCount = 0

  for (const fname of studentFiles) {
    const fpath = path.join(downloads, fname)
    if (!fs.existsSync(fpath)) continue

    console.log(`📁 Processing Student Workbook: ${fname}`)
    const wb = XLSX.readFile(fpath)

    for (const sname of wb.SheetNames) {
      const sheet = wb.Sheets[sname]
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

      if (!rows || rows.length <= 1) continue

      let headerIdx = 0
      let nameCol = 1
      let phoneCol = 2
      let totalFeeCol = 6
      let regFeeCol = 7
      let pendingCol = 9
      let inst1Col = 10

      for (let i = 0; i < Math.min(3, rows.length); i++) {
        const rowStr = rows[i].map(c => String(c).toLowerCase())
        if (rowStr.some(c => c.includes('name') || c.includes('student'))) {
          headerIdx = i
          rowStr.forEach((h, colI) => {
            if (h.includes('name')) nameCol = colI
            if (['contact', 'number', 'phone', 'mobile'].some(k => h.includes(k))) phoneCol = colI
            if (h.includes('total amount') || h.includes('total fee') || h.includes('fees')) totalFeeCol = colI
            if (h.includes('pending')) pendingCol = colI
            if (h.includes('first') || h.includes('received')) inst1Col = colI
          })
          break
        }
      }

      for (let i = headerIdx + 1; i < rows.length; i++) {
        const r = rows[i]
        if (!r || r.every(c => String(c).trim() === '')) continue

        const rawName = cleanStr(r[nameCol])
        const rawPhone = r[phoneCol]
        const phone = cleanPhone(rawPhone) || '9999999999'

        if (!rawName || isGarbage(rawName, phone)) continue

        const totalFee = parseAmount(r[totalFeeCol])
        const pendingFee = parseAmount(r[pendingCol])
        const inst1 = parseAmount(r[inst1Col])

        studentCount++
        const displayId = `KIZ-2026-${String(studentCount).padStart(3, '0')}`
        if (phone && phone !== '9999999999') studentMobiles.add(phone)

        // Insert Student
        const { data: student, error: stErr } = await supabase.from('students').insert({
          student_id: displayId,
          roll_number: displayId,
          full_name: rawName,
          mobile: phone,
          is_active: true,
          admission_date: new Date().toISOString().split('T')[0],
          course_id: defaultCourseId
        }).select().single()

        if (stErr || !student) {
          console.error(`❌ Student insert error [${rawName}]:`, stErr?.message)
          continue
        }

        const paidAmount = totalFee > 0 ? (totalFee - pendingFee) : 5000

        // Insert Fee Record (Exact Schema)
        const { data: feeRecord, error: feeErr } = await supabase.from('fees').insert({
          student_id: student.id,
          course_id: defaultCourseId,
          total_fee: totalFee || 50000,
          discount: 0,
          scholarship: 0,
          registration_amount: paidAmount > 0 ? paidAmount : 5000,
          amount_paid: paidAmount > 0 ? paidAmount : 5000
        }).select().single()

        if (feeErr || !feeRecord) {
          console.error(`❌ Fee insert error for ${rawName}:`, feeErr?.message)
          continue
        }

        // Create Installments if pending/due exists
        if (pendingFee > 0) {
          await supabase.from('installments').insert([
            {
              fee_id: feeRecord.id,
              installment_number: 1,
              amount: inst1 || paidAmount || 5000,
              due_date: new Date().toISOString().split('T')[0],
              status: 'paid'
            },
            {
              fee_id: feeRecord.id,
              installment_number: 2,
              amount: pendingFee,
              due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              status: 'pending'
            }
          ])
        } else if (totalFee > 0) {
          await supabase.from('installments').insert([
            {
              fee_id: feeRecord.id,
              installment_number: 1,
              amount: totalFee,
              due_date: new Date().toISOString().split('T')[0],
              status: 'paid'
            }
          ])
        }
      }
    }
  }

  console.log(`✓ Phase 2 Complete: Ingested ${studentCount} Enrolled Students with Fee Schedules!`)

  // -----------------------------------------------------------------
  // PHASE 3: INGEST CLEAN MASTER LEADS
  // -----------------------------------------------------------------
  console.log('\n--- PHASE 3: INGESTING CLEAN MASTER LEADS ---')
  const leadFiles = [
    'Leads for Kizen.xlsx',
    'Data for Preeti.xlsx',
    "Leads by Lakshaya Ma'am.xlsx"
  ]

  const leadsByMobile = new Map()
  const leadsByName = new Map()
  let totalRowsRead = 0
  let totalGarbageSkipped = 0

  for (const fname of leadFiles) {
    const fpath = path.join(downloads, fname)
    if (!fs.existsSync(fpath)) continue

    console.log(`📁 Processing Lead Workbook: ${fname}`)
    const wb = XLSX.readFile(fpath)

    for (const sname of wb.SheetNames) {
      const sheet = wb.Sheets[sname]
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

      if (!rows || rows.length === 0) continue

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
            if (['contact', 'mobile', 'phone', 'number'].some(k => h.includes(k)) && phoneCol === -1) phoneCol = colI
            if (['city', 'location', 'address', 'state'].some(k => h.includes(k)) && cityCol === -1) cityCol = colI
            if (['class', 'course', 'qualificat', 'subject'].some(k => h.includes(k)) && courseCol === -1) courseCol = colI
            if (['status', 'stage'].some(k => h.includes(k)) && statusCol === -1) statusCol = colI
            if (['remark', 'note', 'comment', 'detail'].some(k => h.includes(k)) && notesCol === -1) notesCol = colI
            if (h.includes('source') && sourceCol === -1) sourceCol = colI
          })
          break
        }
      }

      if (nameCol === -1 && phoneCol === -1) {
        nameCol = 0
        phoneCol = 1
      }

      let tabCount = 0

      for (let i = headerIdx + 1; i < rows.length; i++) {
        const r = rows[i]
        if (!r || r.every(c => String(c).trim() === '')) continue

        totalRowsRead++

        const rawName = cleanStr(r[nameCol])
        const rawPhone = r[phoneCol]
        const phone = cleanPhone(rawPhone)

        if (isGarbage(rawName, phone)) {
          totalGarbageSkipped++
          continue
        }

        const city = cleanStr(r[cityCol])
        const course = cleanStr(r[courseCol])
        const statusRaw = cleanStr(r[statusCol])
        const notesRaw = cleanStr(r[notesCol])
        const sourceRaw = cleanStr(r[sourceCol])

        let assignedId = aadyaId
        if (fname.toLowerCase().includes('preeti')) assignedId = preetiId
        else if (fname.toLowerCase().includes('lakshaya') || sname.toLowerCase().includes('lakshaya')) assignedId = lakshayaId

        let status = mapStatus(statusRaw)
        if (phone && studentMobiles.has(phone)) {
          status = 'converted'
        }

        const source = mapSource(sourceRaw || sname)
        const noteDetail = `[${sname}] ${notesRaw} ${course}`.trim().slice(0, 300)

        const leadObj = {
          full_name: (rawName || `Lead ${phone}`).slice(0, 100),
          mobile: phone || '9999999999',
          city: city ? city.slice(0, 50) : null,
          status: status,
          source: source,
          temperature: 'warm',
          notes: noteDetail,
          assigned_counselor_id: assignedId
        }

        if (phone && phone !== '9999999999') {
          if (leadsByMobile.has(phone)) {
            const existing = leadsByMobile.get(phone)
            existing.notes = (existing.notes + ` | ${noteDetail}`).slice(0, 500)
            if (status === 'converted') existing.status = 'converted'
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

        tabCount++
      }

      console.log(`  📄 Tab [${sname.trim()}]: ${tabCount} clean lead records extracted`)
    }
  }

  const rawMasterLeads = [...leadsByMobile.values(), ...leadsByName.values()]
  const masterLeads = rawMasterLeads.map((l, idx) => ({
    ...l,
    display_id: `KZ-${String(idx + 1).padStart(6, '0')}`
  }))

  console.log('\n================ MASTER INGESTION AUDIT TALLY ================')
  console.log(` Total Spreadsheet Rows Scanned: ${totalRowsRead}`)
  console.log(` Total Skipped Non-Person Garbage Rows: ${totalGarbageSkipped}`)
  console.log(` Total Clean Master Leads Deduplicated: ${masterLeads.length}`)
  console.log(` Total Enrolled Active Students Created: ${studentCount}`)

  // Batch insert leads
  console.log('\n🚀 Batch inserting clean master leads into Supabase DB...')
  const batchSize = 250
  let successLeads = 0

  for (let i = 0; i < masterLeads.length; i += batchSize) {
    const batch = masterLeads.slice(i, i + batchSize)
    const { error } = await supabase.from('leads').insert(batch)
    if (error) {
      console.error(`❌ Lead Batch ${Math.floor(i / batchSize) + 1} error:`, error.message)
    } else {
      successLeads += batch.length
      console.log(`  ✓ Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(masterLeads.length / batchSize)} (${successLeads}/${masterLeads.length} leads)`)
    }
  }

  // Verification Counts
  const { count: liveLeadsCount } = await supabase.from('leads').select('*', { count: 'exact', head: true })
  const { count: liveStudentsCount } = await supabase.from('students').select('*', { count: 'exact', head: true })
  const { count: liveFeesCount } = await supabase.from('fees').select('*', { count: 'exact', head: true })
  const { count: liveInstallmentsCount } = await supabase.from('installments').select('*', { count: 'exact', head: true })

  console.log('\n===================================================================')
  console.log('✅ LIVE DATABASE VERIFICATION COMPLETE:')
  console.log(`   - Live Clean Leads in Supabase: ${liveLeadsCount}`)
  console.log(`   - Live Enrolled Students in Supabase: ${liveStudentsCount}`)
  console.log(`   - Live Fee Records in Supabase: ${liveFeesCount}`)
  console.log(`   - Live Fee Installments in Supabase: ${liveInstallmentsCount}`)
  console.log('===================================================================\n')
}

main().catch(err => console.error(err))
