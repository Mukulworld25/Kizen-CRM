import XLSX from 'xlsx'
import path from 'path'
import fs from 'fs'

const downloads = 'C:/Users/admin/Downloads'
const files = [
  'Leads for Kizen.xlsx',
  'Data for Preeti.xlsx',
  'My students.xlsx',
  "Leads by Lakshaya Ma'am.xlsx",
  'Fees Tracker.xlsx',
  '_Fee Structure- Kizen.xlsx'
]

for (const f of files) {
  const p = path.join(downloads, f)
  if (!fs.existsSync(p)) continue
  console.log('\n==================================================')
  console.log('WORKBOOK:', f)
  console.log('==================================================')
  const wb = XLSX.readFile(p)
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
    console.log(`\n--- TAB: [${sheetName}] (Total Rows: ${data.length}) ---`)
    for (let i = 0; i < Math.min(10, data.length); i++) {
      console.log(`Row ${i}:`, JSON.stringify(data[i].slice(0, 10)))
    }
  }
}
