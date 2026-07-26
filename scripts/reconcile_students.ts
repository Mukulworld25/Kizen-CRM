import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

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
  const studentsToFix = [
    { name: 'Harpreet', total_amount: 30000, amount_paid: 10000, pending_balance: 20000 },
    { name: 'Vasu', total_amount: 75000, amount_paid: 25000, pending_balance: 50000 },
    { name: 'Anvi', total_amount: 15000, amount_paid: 3700, pending_balance: 11300 },
    { name: 'Anjali', total_amount: 35000, amount_paid: 30000, pending_balance: 5000 },
    { name: 'Mohit', total_amount: 30000, amount_paid: 30000, pending_balance: 0 },
  ]
  
  for (const stu of studentsToFix) {
    console.log(`\n--- Fixing ${stu.name} ---`)
    const { data: students, error } = await supabase
      .from('students')
      .select('id')
      .ilike('full_name', `%${stu.name}%`)
      
    if (!students || students.length === 0) continue
    
    for (const student of students) {
      const { data: fees } = await supabase
        .from('fees')
        .select('*')
        .eq('student_id', student.id)
        
      if (!fees || fees.length === 0) continue
      
      for (const fee of fees) {
        // Update fee total amount if missing or wrong
        await supabase
          .from('fees')
          .update({ 
            total_amount: stu.total_amount,
            amount_paid: stu.amount_paid,
            pending_balance: stu.pending_balance
          })
          .eq('id', fee.id)
          
        console.log(`Updated Fee for ${stu.name}`)
        
        // Ensure paid installment exists
        if (stu.amount_paid > 0) {
          await supabase.from('installments').insert({
            fee_id: fee.id,
            installment_number: 1,
            amount: stu.amount_paid,
            due_date: new Date().toISOString(),
            status: 'paid',
            paid_date: new Date().toISOString()
          })
        }
        
        // Ensure pending installment exists
        if (stu.pending_balance > 0) {
           const nextMonth = new Date()
           nextMonth.setMonth(nextMonth.getMonth() + 1)
           await supabase.from('installments').insert({
            fee_id: fee.id,
            installment_number: 2,
            amount: stu.pending_balance,
            due_date: nextMonth.toISOString(),
            status: 'pending'
          })
        }
        console.log(`Created installments for ${stu.name}`)
      }
    }
  }
}

run().catch(console.error)
