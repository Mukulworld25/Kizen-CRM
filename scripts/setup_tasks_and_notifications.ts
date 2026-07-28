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
  const si = await supabase.auth.signInWithPassword({ email: 'shivam.kizen.test@gmail.com', password: 'Shivam@123' })
  if (si.error) {
    console.error('Signin error:', si.error.message)
    return
  }

  console.log('--- 1. Ensuring tasks & scratchpad table structures ---')
  
  // Test creating a sample task to verify DB table support
  const { data: testUser } = await supabase.from('users').select('id').eq('email', 'shivam.kizen.test@gmail.com').single()
  
  if (testUser) {
    const { data: createdTask, error: taskErr } = await supabase.from('tasks').insert({
      title: 'Initial System Task: Review Batch Roster',
      description: 'System generated delegation task for verification',
      assigned_to: testUser.id,
      assigned_by: testUser.id,
      status: 'pending',
      due_date: new Date().toISOString().split('T')[0]
    }).select().single()

    if (taskErr) {
      console.log('Tasks table notification/error:', taskErr.message)
    } else {
      console.log('✅ Real DB Task Delegation confirmed functional! Created task ID:', createdTask.id)
    }
  }

  console.log('\n--- 2. Triggering Auto-reminders & Notifications Sync ---')
  
  // Fetch pending follow-ups due today or overdue
  const nowStr = new Date().toISOString()
  const { data: dueFollowUps } = await supabase
    .from('follow_ups')
    .select('id, scheduled_at, notes, assigned_to, lead:leads(full_name)')
    .lte('scheduled_at', nowStr)
    .eq('status', 'pending')
    .limit(50)

  console.log(`Found ${dueFollowUps?.length ?? 0} due follow-ups requiring auto-reminder notifications.`)

  let notifCount = 0
  if (dueFollowUps && dueFollowUps.length > 0) {
    for (const fu of dueFollowUps) {
      if (!fu.assigned_to) continue
      const leadName = (fu.lead as any)?.full_name || 'Lead'
      
      // Check if notification already exists
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', fu.assigned_to)
        .eq('title', `Follow-up Due: ${leadName}`)
        .limit(1)

      if (!existing || existing.length === 0) {
        await supabase.from('notifications').insert({
          user_id: fu.assigned_to,
          title: `Follow-up Due: ${leadName}`,
          message: fu.notes || `Scheduled follow-up is due for ${leadName}`,
          type: 'followup',
          link: '/calendar',
          read: false
        })
        notifCount++
      }
    }
  }

  // Fetch overdue fee installments
  const todayDate = new Date().toISOString().split('T')[0]
  const { data: overdueInsts } = await supabase
    .from('installments')
    .select('id, amount, due_date, student:students(full_name, assigned_counselor_id)')
    .lte('due_date', todayDate)
    .neq('status', 'paid')
    .limit(50)

  console.log(`Found ${overdueInsts?.length ?? 0} overdue fee installments requiring auto-reminder notifications.`)

  if (overdueInsts && overdueInsts.length > 0) {
    for (const inst of overdueInsts) {
      const student = inst.student as any
      const targetUser = student?.assigned_counselor_id || testUser?.id
      if (!targetUser) continue

      const studentName = student?.full_name || 'Student'
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', targetUser)
        .eq('title', `Fee Payment Overdue: ${studentName}`)
        .limit(1)

      if (!existing || existing.length === 0) {
        await supabase.from('notifications').insert({
          user_id: targetUser,
          title: `Fee Payment Overdue: ${studentName}`,
          message: `Installment of ₹${inst.amount} was due on ${inst.due_date}`,
          type: 'fee_overdue',
          link: '/fees',
          read: false
        })
        notifCount++
      }
    }
  }

  console.log(`\n✅ Generated ${notifCount} new auto-reminder notifications in database.`)

  console.log('\n--- 3. Verifying Users Table Logins ---')
  const { data: allUsers } = await supabase.from('users').select('id, name, email, role, is_active')
  console.log('All Users in DB:', allUsers)
}

run().catch(console.error)
