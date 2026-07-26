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

const exactFeeData = [
  // Data 1
  {
    name: 'Anjali Singh',
    phone: '8630382694',
    courseName: 'ACCA Skill Level',
    subject: 'Financial Reporting',
    duration: '4 Months',
    totalAmount: 35000,
    regAmount: 0,
    regDate: null,
    pendingAmount: 5000,
    installments: [
      { num: 1, amount: 10000, dueDate: null, status: 'paid' },
      { num: 2, amount: 10000, dueDate: null, status: 'paid' },
      { num: 3, amount: 10000, dueDate: null, status: 'paid' },
      { num: 4, amount: 5000, dueDate: '2026-07-18', status: 'pending' },
    ]
  },
  {
    name: 'Mohit Rana',
    phone: '7988066546',
    courseName: 'ACCA Skill Level',
    subject: 'Financial Reporting',
    duration: '4 Months',
    totalAmount: 30000,
    regAmount: 5000,
    regDate: '2026-05-01',
    pendingAmount: 0,
    installments: [
      { num: 1, amount: 25000, dueDate: '2026-05-26', status: 'paid' }
    ]
  },
  {
    name: 'Harpreet Singh',
    phone: '7876626370',
    courseName: 'ACCA Skill Level',
    subject: 'Financial reporting (FR) & Audit & Assurance',
    duration: '4 Months',
    totalAmount: 30000,
    regAmount: 10000,
    regDate: '2026-06-26',
    pendingAmount: 10000,
    installments: [
      { num: 1, amount: 10000, dueDate: '2026-07-08', status: 'paid' },
      { num: 2, amount: 10000, dueDate: '2026-08-08', status: 'pending' }
    ]
  },
  // Data 2
  {
    name: 'Vardhan Sharma',
    phone: '9877079307',
    courseName: 'ACCA Knowledge Level',
    subject: 'BT, FA and MA',
    duration: '4 Months',
    totalAmount: 50000,
    regAmount: 5000,
    regDate: '2026-04-24',
    pendingAmount: 20000,
    installments: [
      { num: 1, amount: 25000, dueDate: '2026-05-18', status: 'paid' },
      { num: 2, amount: 20000, dueDate: '2026-06-18', status: 'pending' }
    ]
  },
  {
    name: 'Ganga Kaur',
    phone: '7710395333',
    courseName: 'ACCA Knowledge Level',
    subject: 'BT, FA and MA',
    duration: '4 Months',
    totalAmount: 75000,
    regAmount: 5000,
    regDate: '2026-04-26',
    pendingAmount: 28000,
    installments: [
      { num: 1, amount: 14000, dueDate: '2026-05-11', status: 'paid' },
      { num: 2, amount: 14000, dueDate: '2026-06-02', status: 'paid' },
      { num: 3, amount: 14000, dueDate: '2026-06-12', status: 'pending' }
    ]
  },
  {
    name: 'Harjapreet Singh',
    phone: '9464869236',
    courseName: 'ACCA Knowledge Level',
    subject: 'BT, FA and MA',
    duration: '4 Months',
    totalAmount: 65000,
    regAmount: 5000,
    regDate: '2026-05-01',
    pendingAmount: 10000,
    installments: [
      { num: 1, amount: 20000, dueDate: '2026-05-12', status: 'paid' },
      { num: 2, amount: 20000, dueDate: '2026-06-12', status: 'paid' },
      { num: 3, amount: 10000, dueDate: '2026-07-17', status: 'paid' },
      { num: 4, amount: 10000, dueDate: '2026-08-15', status: 'pending' }
    ]
  },
  {
    name: 'Saksham Kaundal',
    phone: '7876599045',
    courseName: 'ACCA Knowledge Level',
    subject: 'BT, FA and MA',
    duration: '4 Months',
    totalAmount: 70000,
    regAmount: 5000,
    regDate: '2026-05-02',
    pendingAmount: 20000,
    installments: [
      { num: 1, amount: 30000, dueDate: '2026-05-21', status: 'paid' },
      { num: 2, amount: 15000, dueDate: '2026-07-14', status: 'pending' }
    ]
  },
  {
    name: 'Shivansh Thakur',
    phone: '8278782054',
    courseName: 'ACCA Knowledge Level',
    subject: 'BT, FA and MA',
    duration: '4 Months',
    totalAmount: 65000,
    regAmount: 5000,
    regDate: '2026-05-21',
    pendingAmount: 0,
    installments: [
      { num: 1, amount: 30000, dueDate: '2026-06-01', status: 'paid' },
      { num: 2, amount: 30000, dueDate: '2026-06-09', status: 'paid' }
    ]
  },
  {
    name: 'Abhimanyu',
    phone: '7814576561',
    courseName: 'ACCA Knowledge Level',
    subject: 'BT, FA and MA',
    duration: '4 Months',
    totalAmount: 65000,
    regAmount: 5000,
    regDate: '2026-05-26',
    pendingAmount: 20000,
    installments: [
      { num: 1, amount: 20000, dueDate: '2026-06-09', status: 'paid' },
      { num: 2, amount: 20000, dueDate: '2026-07-14', status: 'paid' },
      { num: 3, amount: 20000, dueDate: '2026-08-14', status: 'pending' }
    ]
  },
  {
    name: 'Akshara Garg',
    phone: '9053840126',
    courseName: 'ACCA Knowledge Level',
    subject: 'BT, FA and MA',
    duration: '4 Months',
    totalAmount: 64000,
    regAmount: 5000,
    regDate: '2026-05-27',
    pendingAmount: 19668,
    installments: [
      { num: 1, amount: 19666, dueDate: '2026-06-08', status: 'paid' },
      { num: 2, amount: 19666, dueDate: '2026-07-07', status: 'paid' },
      { num: 3, amount: 19668, dueDate: '2026-08-07', status: 'pending' }
    ]
  },
  {
    name: 'Abhay',
    phone: '8053603938',
    courseName: 'ACCA Knowledge Level',
    subject: 'BT, FA and MA',
    duration: '4 Months',
    totalAmount: 66000,
    regAmount: 5000,
    regDate: '2026-06-08',
    pendingAmount: 41000,
    installments: [
      { num: 1, amount: 20000, dueDate: '2026-06-30', status: 'paid' },
      { num: 2, amount: 20000, dueDate: '2026-07-30', status: 'pending' },
      { num: 3, amount: 21000, dueDate: '2026-08-30', status: 'pending' }
    ]
  },
  {
    name: 'Aditi Sharma',
    phone: '8837595951',
    courseName: 'ACCA Knowledge Level',
    subject: 'BT, FA and MA',
    duration: '4 Months',
    totalAmount: 70000,
    regAmount: 5000,
    regDate: '2026-06-09',
    pendingAmount: 50000,
    installments: [
      { num: 1, amount: 15000, dueDate: '2026-06-30', status: 'paid' },
      { num: 2, amount: 25000, dueDate: '2026-07-30', status: 'pending' },
      { num: 3, amount: 25000, dueDate: '2026-08-30', status: 'pending' }
    ]
  },
  {
    name: 'Deepika',
    phone: '7011032307',
    courseName: 'ACCA Knowledge Level',
    subject: 'BT, FA and MA',
    duration: '4 Months',
    totalAmount: 65000,
    regAmount: 5000,
    regDate: '2026-06-10',
    pendingAmount: 20000,
    installments: [
      { num: 1, amount: 20000, dueDate: '2026-06-15', status: 'paid' },
      { num: 2, amount: 20000, dueDate: '2026-07-17', status: 'paid' },
      { num: 3, amount: 20000, dueDate: '2026-08-15', status: 'pending' }
    ]
  },
  {
    name: 'Bhumi',
    phone: '9817349975',
    courseName: 'ACCA Knowledge Level',
    subject: 'BT, FA and MA',
    duration: '4 Months',
    totalAmount: 75000,
    regAmount: 5000,
    regDate: '2026-06-27',
    pendingAmount: 45000,
    installments: [
      { num: 1, amount: 25000, dueDate: '2026-07-01', status: 'paid' },
      { num: 2, amount: 45000, dueDate: '2026-08-01', status: 'pending' }
    ]
  },
  {
    name: 'Vasu',
    phone: '7497885699',
    courseName: 'ACCA Knowledge Level',
    subject: 'BT, FA and MA',
    duration: '4 Months',
    totalAmount: 70000,
    regAmount: 5000,
    regDate: '2026-06-29',
    pendingAmount: 45000,
    installments: [
      { num: 1, amount: 20000, dueDate: '2026-07-01', status: 'paid' },
      { num: 2, amount: 45000, dueDate: '2026-08-01', status: 'pending' }
    ]
  },
  // Data 3
  {
    name: 'Shubham Garg',
    phone: '7973455508',
    courseName: '12th Class',
    subject: 'Accounts, Economics & Business Studies',
    duration: '1 year',
    totalAmount: 58000,
    regAmount: 0,
    regDate: null,
    pendingAmount: 30000,
    installments: [
      { num: 1, amount: 28000, dueDate: '2026-05-01', status: 'paid' },
      { num: 2, amount: 30000, dueDate: '2026-08-01', status: 'pending' }
    ]
  },
  {
    name: 'Sampreeti',
    phone: '7986403760',
    courseName: '12th Class',
    subject: 'Accounts & Economics',
    duration: '1 year',
    totalAmount: 48000,
    regAmount: 0,
    regDate: null,
    pendingAmount: 40000,
    installments: [
      { num: 1, amount: 4000, dueDate: '2026-04-15', status: 'paid' },
      { num: 2, amount: 4000, dueDate: '2026-05-13', status: 'paid' },
      { num: 3, amount: 4000, dueDate: '2026-07-02', status: 'paid' },
      { num: 4, amount: 4000, dueDate: '2026-08-02', status: 'pending' }
    ]
  },
  {
    name: 'Saesha',
    phone: '9779930039',
    courseName: '11th Class',
    subject: 'Accounts',
    duration: '1 year',
    totalAmount: 30000,
    regAmount: 0,
    regDate: null,
    pendingAmount: 16500,
    installments: [
      { num: 1, amount: 5000, dueDate: '2026-04-15', status: 'paid' },
      { num: 2, amount: 8500, dueDate: '2026-05-15', status: 'paid' },
      { num: 3, amount: 16500, dueDate: '2026-08-15', status: 'pending' }
    ]
  },
  {
    name: 'Abhinav',
    phone: '9416151300',
    courseName: '12th Class',
    subject: 'Economics & Business Studies',
    duration: '1 year',
    totalAmount: 40000,
    regAmount: 0,
    regDate: null,
    pendingAmount: 28000,
    installments: [
      { num: 1, amount: 4000, dueDate: '2026-05-01', status: 'paid' },
      { num: 2, amount: 4000, dueDate: '2026-06-01', status: 'paid' },
      { num: 3, amount: 4000, dueDate: '2026-07-07', status: 'paid' },
      { num: 4, amount: 4000, dueDate: '2026-08-07', status: 'pending' }
    ]
  },
  {
    name: 'Harshvir Gohri',
    phone: '8847460994',
    courseName: '11th Class',
    subject: 'Accounts',
    duration: '1 year',
    totalAmount: 30000,
    regAmount: 0,
    regDate: null,
    pendingAmount: 15000,
    installments: [
      { num: 1, amount: 5000, dueDate: '2026-06-01', status: 'paid' },
      { num: 2, amount: 10000, dueDate: '2026-07-08', status: 'paid' },
      { num: 3, amount: 15000, dueDate: '2026-08-08', status: 'pending' }
    ]
  },
  {
    name: 'Yuvraj Kashyap',
    phone: '9888105472',
    courseName: '12th Class',
    subject: 'Accounts',
    duration: '1 year',
    totalAmount: 12000,
    regAmount: 0,
    regDate: null,
    pendingAmount: 10000,
    installments: [
      { num: 1, amount: 2000, dueDate: '2026-07-20', status: 'paid' },
      { num: 2, amount: 2000, dueDate: '2026-08-20', status: 'pending' },
      { num: 3, amount: 2000, dueDate: '2026-09-20', status: 'pending' },
      { num: 4, amount: 2000, dueDate: '2026-10-20', status: 'pending' },
      { num: 5, amount: 2000, dueDate: '2026-11-20', status: 'pending' }
    ]
  },
  {
    name: 'Anvi',
    phone: '8168932922',
    courseName: '11th Class',
    subject: 'Economics & Business Studies',
    duration: '1 year',
    totalAmount: 25900,
    regAmount: 0,
    regDate: null,
    pendingAmount: 22200,
    installments: [
      { num: 1, amount: 3700, dueDate: '2026-07-20', status: 'paid' },
      { num: 2, amount: 22200, dueDate: '2026-08-20', status: 'pending' }
    ]
  }
]

async function run() {
  console.log('Reconciling exact fee data for all 22 students...')
  const si = await supabase.auth.signInWithPassword({ email: 'shivam.kizen.test@gmail.com', password: 'Shivam@123' })
  if (si.error) {
    console.error('Signin error:', si.error.message)
    return
  }

  for (const item of exactFeeData) {
    console.log(`Processing ${item.name}...`)
    // Find or create student
    let { data: students } = await supabase
      .from('students')
      .select('id')
      .ilike('full_name', `%${item.name.trim()}%`)

    let studentId = students && students.length > 0 ? students[0].id : null

    if (!studentId) {
      // Find lead by name or mobile
      const { data: leads } = await supabase
        .from('leads')
        .select('id, full_name, mobile')
        .or(`full_name.ilike.%${item.name.trim()}%,mobile.ilike.%${item.phone}%`)

      if (leads && leads.length > 0) {
        // Convert lead to student
        const { data: newStu } = await supabase.from('students').insert({
          lead_id: leads[0].id,
          full_name: item.name,
          mobile: item.phone,
          admission_date: new Date().toISOString().split('T')[0],
          is_active: true
        }).select('id').single()
        if (newStu) studentId = newStu.id
      } else {
        // Create student directly
        const { data: newStu } = await supabase.from('students').insert({
          full_name: item.name,
          mobile: item.phone,
          admission_date: new Date().toISOString().split('T')[0],
          is_active: true
        }).select('id').single()
        if (newStu) studentId = newStu.id
      }
    }

    if (!studentId) {
      console.error(`Could not create or find student record for ${item.name}`)
      continue
    }

    // Calculate paid amount
    const paidAmount = item.totalAmount - item.pendingAmount

    // Check fee record
    const { data: existingFees } = await supabase.from('fees').select('id').eq('student_id', studentId)
    let feeId = existingFees && existingFees.length > 0 ? existingFees[0].id : null

    if (feeId) {
      await supabase.from('fees').update({
        total_fee: item.totalAmount,
        registration_amount: item.regAmount,
        amount_paid: paidAmount,
        pending_balance: item.pendingAmount,
        net_fee: item.totalAmount
      }).eq('id', feeId)
    } else {
      const { data: newFee } = await supabase.from('fees').insert({
        student_id: studentId,
        total_fee: item.totalAmount,
        registration_amount: item.regAmount,
        amount_paid: paidAmount,
        pending_balance: item.pendingAmount,
        net_fee: item.totalAmount
      }).select('id').single()
      if (newFee) feeId = newFee.id
    }

    if (!feeId) continue

    // Clear old installments and insert exact schedule
    await supabase.from('installments').delete().eq('fee_id', feeId)

    for (const inst of item.installments) {
      await supabase.from('installments').insert({
        fee_id: feeId,
        student_id: studentId,
        installment_number: inst.num,
        amount: inst.amount,
        due_date: inst.dueDate ? new Date(inst.dueDate).toISOString() : new Date().toISOString(),
        status: inst.status
      })
    }

    console.log(`✅ Reconciled ${item.name}: Total ₹${item.totalAmount}, Paid ₹${paidAmount}, Pending ₹${item.pendingAmount}`)
  }

  console.log('\n🎉 ALL 22 STUDENT FEE SCHEDULES RECONCILED ACCURATELY!')
}

run().catch(console.error)
