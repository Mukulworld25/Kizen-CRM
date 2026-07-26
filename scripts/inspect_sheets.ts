import xlsx from 'xlsx'
import fs from 'fs'

const workbook = xlsx.readFile('C:/Users/admin/Downloads/Leads for Kizen.xlsx')
console.log('--- Leads for Kizen.xlsx ---')
for (const sheetName of workbook.SheetNames) {
  const sheet = workbook.Sheets[sheetName]
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as string[][]
  if (data.length > 0) {
    const headers = data[0].map(h => String(h).trim()).filter(h => h.length > 0)
    console.log(`\nSheet: ${sheetName}`)
    console.log(`Headers: ${headers.join(' | ')}`)
    if (data.length > 1) {
       console.log(`Sample Row: ${JSON.stringify(data[1].slice(0, headers.length))}`)
    }
  }
}
