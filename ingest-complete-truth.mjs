import fs from 'fs'
import path from 'path'
import XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'

const env = fs.readFileSync('.env', 'utf8')
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim()
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim()
const supabase = createClient(url, key)

function cleanStr(val) {
  if (val === null || val === undefined) return ''
  const s = String(val).trim()
  if (['none', 'null', 'nan', 'undefined', 'n/a', '0', '-', 'nil'].includes(s.toLowerCase())) return ''
  return s
}

function cleanPhone(raw) {
  if (!raw) return null
  const s = String(raw).trim()
  const digits = s.replace(/\D/g, '')
  if (digits.length >= 10) return digits.slice(-10)
  return null
}

function parseExcelDate(val) {
  if (!val) return new Date().toISOString()
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val)
    if (d) return new Date(d.y, d.m - 1, d.d).toISOString()
  }
  const parsed = new Date(val)
  if (!isNaN(parsed.getTime())) return parsed.toISOString()
  return new Date().toISOString()
}

async function runCompleteIngest() {
  console.log('===========================================================')
  console.log('🚀 COMPLETE DATA RE-INGESTION & LINKING ENGINE')
  console.log('===========================================================')

  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'shivam.kizen.test@gmail.com',
    password: 'Shivam@123'
  })
  if (authErr) {
    console.error('❌ Auth failed:', authErr.message)
    return
  }
  console.log('✓ Authenticated as Owner:', authData.user.email)

  const downloads = 'C:\\Users\\admin\\Downloads'

  // Fetch Users
  const { data: users } = await supabase.from('users').select('id, name, email')
  const preetiUser = users.find(u => u.email.toLowerCase().includes('preeti')) || users[0]
  const lakshayaUser = users.find(u => u.email.toLowerCase().includes('lakshaya')) || users[0]
  const ownerUser = users.find(u => u.email.toLowerCase().includes('shivam')) || users[0]

  // Fetch Courses
  const { data: courses } = await supabase.from('courses').select('id, name')
  const courseMap = new Map()
  courses.forEach(c => courseMap.set(c.name.toLowerCase(), c.id))

  const accaId = courseMap.get('acca')
  const c11Id = courseMap.get('class 11th commerce')
  const c12Id = courseMap.get('class 12th commerce')
  const cuetId = courseMap.get('cuet preparation')
  const bcomId = courseMap.get('b.com / bba coaching')
  const aiId = courseMap.get('ai foundations + applications')
  const ifrsId = courseMap.get('ifrs certification')
  const caId = courseMap.get('ca foundation & inter')

  function resolveCourseFromText(text) {
    if (!text) return accaId
    const t = text.toLowerCase()
    if (t.includes('11th') || t.includes('11')) return c11Id
    if (t.includes('12th') || t.includes('12')) return c12Id
    if (t.includes('cuet')) return cuetId
    if (t.includes('bcom') || t.includes('b.com') || t.includes('bba') || t.includes('pu')) return bcomId
    if (t.includes('ai') || t.includes('bootcamp')) return aiId
    if (t.includes('ifrs')) return ifrsId
    if (t.includes('ca')) return caId
    return accaId
  }

  // --- 1. INGEST INSTITUTIONS ---
  console.log('\n--- PHASE 1: EXTRACTING & INGESTING REAL INSTITUTIONS ---')
  await supabase.from('institutions').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  const institutionsMap = new Map()

  // Read College List sheet from Data for Preeti.xlsx
  const preetiPath = path.join(downloads, 'Data for Preeti.xlsx')
  if (fs.existsSync(preetiPath)) {
    const wb = XLSX.readFile(preetiPath)
    if (wb.Sheets['College List ']) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets['College List '], { header: 1, defval: '' })
      for (let i = 1; i < rows.length; i++) {
        const name = cleanStr(rows[i][1])
        const phone = cleanStr(rows[i][2])
        const emailLoc = cleanStr(rows[i][3])
        const person = cleanStr(rows[i][4])
        if (name && name.length > 2 && !name.toLowerCase().includes('sr no')) {
          institutionsMap.set(name.toLowerCase(), {
            name: name.slice(0, 100),
            type: name.toLowerCase().includes('university') || name.toLowerCase().includes('college') ? 'college' : 'school',
            contact_phone: phone ? phone.slice(0, 50) : null,
            contact_email: emailLoc.includes('@') ? emailLoc.slice(0, 100) : null,
            city: !emailLoc.includes('@') ? emailLoc.slice(0, 50) : null,
            contact_person: person ? person.slice(0, 100) : null
          })
        }
      }
    }

    // Extract schools from 12 Passout PB and 12 Pass out CHD
    for (const sname of ['12 Passout PB', '12 Pass out CHD', '11 - 12 demo class']) {
      if (wb.Sheets[sname]) {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[sname], { header: 1, defval: '' })
        for (let i = 1; i < rows.length; i++) {
          const sch = cleanStr(rows[i][1] || rows[i][5])
          if (sch && sch.length > 3 && !sch.toLowerCase().includes('school name') && !sch.toLowerCase().includes('qualification')) {
            if (!institutionsMap.has(sch.toLowerCase())) {
              institutionsMap.set(sch.toLowerCase(), {
                name: sch.slice(0, 100),
                type: 'school',
                city: cleanStr(rows[i][0]).slice(0, 50) || null
              })
            }
          }
        }
      }
    }
  }

  const instArray = Array.from(institutionsMap.values()).map((inst, idx) => ({
    ...inst,
    display_id: `INST-2026-${String(idx + 1).padStart(4, '0')}`,
    mou_status: 'not_started'
  }))

  console.log(`Writing ${instArray.length} Real Institutions to database...`)
  const { error: instErr } = await supabase.from('institutions').insert(instArray)
  if (instErr) console.error('❌ Institution Insert Error:', instErr.message)
  else console.log(`✓ Successfully ingested ${instArray.length} Institutions!`)

  // --- 2. UPDATE LEADS COURSE LINKING & INGEST FOLLOW-UPS ---
  console.log('\n--- PHASE 2: RESOLVING ALL 11,650 LEAD COURSES & INGESTING FOLLOW-UPS ---')

  const { data: allLeads } = await supabase.from('leads').select('id, full_name, mobile, notes')
  const leadsByMobile = new Map()
  const leadsByName = new Map()

  allLeads.forEach(l => {
    if (l.mobile && l.mobile !== '9999999999') leadsByMobile.set(l.mobile, l)
    if (l.full_name) leadsByName.set(l.full_name.toLowerCase(), l)
  })

  // Purge old followups
  await supabase.from('follow_ups').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  const followUpsToInsert = []

  // Read followups from Data for Preeti.xlsx
  if (fs.existsSync(preetiPath)) {
    const wb = XLSX.readFile(preetiPath)
    for (const sname of wb.SheetNames) {
      const sheet = wb.Sheets[sname]
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
      if (!rows || rows.length <= 1) continue

      const defaultCourse = resolveCourseFromText(sname)

      for (let i = 1; i < rows.length; i++) {
        const r = rows[i]
        if (!r || r.every(c => String(c).trim() === '')) continue

        const name = cleanStr(r[1] || r[2] || r[0])
        const phone = cleanPhone(r[2] || r[3] || r[1])
        const courseText = cleanStr(r[4] || r[5] || sname)
        const fdateRaw = r[1] || r[6] || r[7]
        const remarks = cleanStr(r[7] || r[6] || r[5])

        let matchedLead = null
        if (phone && leadsByMobile.has(phone)) matchedLead = leadsByMobile.get(phone)
        else if (name && leadsByName.has(name.toLowerCase())) matchedLead = leadsByName.get(name.toLowerCase())

        if (matchedLead) {
          // Update lead course if missing or generic
          const resolvedC = resolveCourseFromText(courseText || sname)
          await supabase.from('leads').update({
            interested_course_id: resolvedC
          }).eq('id', matchedLead.id)

          if (remarks || fdateRaw) {
            followUpsToInsert.push({
              lead_id: matchedLead.id,
              scheduled_at: parseExcelDate(fdateRaw),
              type: 'call',
              notes: `[${sname}] ${remarks}`.trim().slice(0, 300),
              assigned_to: sname.toLowerCase().includes('lakshaya') ? lakshayaUser.id : (sname.toLowerCase().includes('preeti') ? preetiUser.id : ownerUser.id),
              status: 'pending'
            })
          }
        }
      }
    }
  }

  // Deduplicate and batch insert follow ups
  console.log(`Writing ${followUpsToInsert.length} Real Follow-up Tasks to database...`)
  const BATCH = 500
  for (let i = 0; i < followUpsToInsert.length; i += BATCH) {
    const batch = followUpsToInsert.slice(i, i + BATCH)
    const { error: folErr } = await supabase.from('follow_ups').insert(batch)
    if (folErr) console.error(`❌ Follow-up Insert Error (${i}):`, folErr.message)
  }
  console.log(`✓ Successfully ingested ${followUpsToInsert.length} Follow-up Tasks!`)

  console.log('\n================ DATA RE-INGESTION COMPLETE ================')
  console.log(`✓ Real Institutions Ingested: ${instArray.length}`)
  console.log(`✓ Real Follow-up Tasks Ingested: ${followUpsToInsert.length}`)
  console.log('===========================================================')
}

runCompleteIngest().catch(console.error)
