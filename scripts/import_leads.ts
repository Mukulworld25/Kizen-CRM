import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import xlsx from 'xlsx'
import { parse } from 'csv-parse/sync'

const envPath = path.resolve(process.cwd(), '.env.local')
const envData = fs.readFileSync(envPath, 'utf8')
const env: Record<string, string> = {}
envData.split('\n').forEach(line => {
  if (line.includes('=')) {
    const [k, v] = line.split('=')
    env[k.trim()] = v.trim()
  }
})

const supabaseUrl = env['VITE_SUPABASE_URL']
const supabaseKey = env['VITE_SUPABASE_ANON_KEY']

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const si = await supabase.auth.signInWithPassword({ email: 'shivam.kizen.test@gmail.com', password: 'Shivam@123' })
  if (si.error) {
    console.error('Signin fail:', si.error.message)
    return
  }

  // Update Aadya Sharma's name to remove "(Counselor 1)" if necessary
  await supabase.from('users').update({ name: 'Aadya Sharma' }).ilike('name', '%Aadya Sharma%')
  console.log('Aadya updated')

  // Load courses to map them
  const { data: courses } = await supabase.from('courses').select('id, name')
  const courseMap = new Map(courses?.map(c => [c.name.toLowerCase(), c.id]))
  // add fuzzy matches
  let accaCourseId = null
  let aiCourseId = null
  for (const [name, id] of courseMap.entries()) {
    if (name.includes('acca')) accaCourseId = id
    if (name.includes('ai applications')) aiCourseId = id
  }

  // Load leads from ACCA April CSV
  try {
    const csvContent = fs.readFileSync('C:/Users/admin/Downloads/Leads for Kizen - ACCA (April).csv', 'utf8')
    const records = parse(csvContent, { columns: true, skip_empty_lines: true })
    console.log(`Found ${records.length} records in ACCA (April).csv`)
    
    for (const record of records) {
      if (!record.Names || !record['Contact No.']) continue
      
      const mobile = record['Contact No.'].replace(/\D/g, '')
      if (mobile.length < 10) continue
      
      const city = record.City || null
      const source = 'whatsapp'
      const status = 'new_lead'
      
      const { data: existing } = await supabase.from('leads').select('id').eq('mobile', mobile)
      if (existing && existing.length > 0) {
         // Update existing
         await supabase.from('leads').update({
           interested_course_id: accaCourseId,
           city: city
         }).eq('id', existing[0].id)
      } else {
         await supabase.from('leads').insert({
           full_name: record.Names,
           mobile: mobile,
           city: city,
           interested_course_id: accaCourseId,
           source: source,
           status: status,
           priority: 'medium',
           created_by: si.data.user.id
         })
      }
    }
  } catch (e) {
    console.error('Error importing ACCA', e)
  }

  // Load from Leads for Kizen.xlsx (Smart Prep & AiSensy)
  try {
    const workbook = xlsx.readFile('C:/Users/admin/Downloads/Leads for Kizen.xlsx')
    console.log('Sheets found:', workbook.SheetNames)
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName]
      const data = xlsx.utils.sheet_to_json(sheet)
      console.log(`Sheet ${sheetName} has ${data.length} rows`)
      // Try to parse missing Smart Prep and AiSensy leads
      for (const row of data as any[]) {
         const name = row.Names || row.Name || row['Full Name'] || row['Lead Name']
         let phone = row['Contact No.'] || row['Phone'] || row['Mobile'] || row['Contact']
         if (!name || !phone) continue
         
         phone = String(phone).replace(/\D/g, '')
         if (phone.length < 10) continue
         
         const courseMatch = row.Course || row['Interested Course']
         let cId = courseMatch && String(courseMatch).toLowerCase().includes('acca') ? accaCourseId : aiCourseId
         
         const { data: existing } = await supabase.from('leads').select('id').eq('mobile', phone)
         if (existing && existing.length > 0) {
             await supabase.from('leads').update({
                 interested_course_id: cId,
                 city: row.City || null,
                 source: row.Source ? String(row.Source).toLowerCase() : null
             }).eq('id', existing[0].id)
         } else {
             await supabase.from('leads').insert({
                 full_name: name,
                 mobile: phone,
                 city: row.City || null,
                 interested_course_id: cId,
                 source: 'other',
                 status: 'new_lead',
                 priority: 'medium',
                 created_by: si.data.user.id
             })
         }
      }
    }
  } catch (e) {
    console.error('Error importing Leads for Kizen.xlsx', e)
  }
}

run().catch(console.error)
