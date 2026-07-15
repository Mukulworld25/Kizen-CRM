import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'

const SU = 'https://zmqvjtenuxlvwfopfroc.supabase.co'
const SK = 'sb_publishable_ezZ7_UyticpI7aeLKY3Rew_i_FaZBDh'
const supabase = createClient(SU, SK)

const log = []
function l(m) { log.push(m); console.log(m) }
function sep(t) { l(''); l(`=== ${t} ===`); l('') }
function finish() { writeFileSync('step-a-results.txt', log.join('\n')); l(''); l('Written to step-a-results.txt') }

async function main() {
  sep('STEP A: VERIFY FOLLOW_UPS AND NOTIFICATIONS WRITE TO DB')

  // 1. Sign in as Owner
  sep('1. OWNER SIGNIN')
  const si = await supabase.auth.signInWithPassword({ email: 'shivam.kizen.test@gmail.com', password: 'Shivam@123' })
  if (si.error) { l(`  FAIL: ${si.error.message}`); finish(); return }
  l(`  OK: ${si.data.user.email}`)
  const OWNER = createClient(SU, SK, { global: { headers: { Authorization: `Bearer ${si.data.session.access_token}` } } })

  // Get the local users table id for this owner
  const { data: ownerProfile } = await OWNER.from('users').select('id, name, role').eq('auth_id', si.data.user.id).single()
  if (!ownerProfile) { l('  FAIL: Owner profile not found in users table'); finish(); return }
  const ownerId = ownerProfile.id
  l(`  Owner: ${ownerProfile.name} (${ownerProfile.role}, id: ${ownerId})`)

  // 2. Get a lead and a counselor
  sep('2. GET EXISTING LEAD & COUNSELOR')
  const { data: leads } = await OWNER.from('leads').select('id, full_name').limit(1)
  if (!leads?.length) { l('  FAIL: No leads found'); finish(); return }
  const lead = leads[0]
  l(`  Lead: ${lead.full_name} (${lead.id})`)

  const { data: counselors } = await OWNER.from('users').select('id, name').eq('role', 'counselor')
  if (!counselors?.length) { l('  FAIL: No counselors found'); finish(); return }
  const counselor = counselors[0]
  l(`  Counselor: ${counselor.name} (${counselor.id})`)

  // 3. Create a follow-up
  sep('3. CREATE FOLLOW-UP')
  const fuDate = new Date(Date.now() + 86400000) // tomorrow
  const { data: followUp, error: fuErr } = await OWNER.from('follow_ups').insert({
    lead_id: lead.id,
    scheduled_at: fuDate.toISOString(),
    type: 'call',
    notes: 'Step A diagnostic follow-up',
    assigned_to: counselor.id,
    created_by: ownerId,
    status: 'pending',
  }).select().single()
  if (fuErr) { l(`  FAIL: ${fuErr.message}`); finish(); return }
  l(`  OK: Follow-up created (id: ${followUp.id})`)
  l(`  Type: ${followUp.type}, Status: ${followUp.status}, Scheduled: ${followUp.scheduled_at}`)

  // 4. Verify follow-up exists in DB by re-querying
  sep('4. VERIFY FOLLOW-UP PERSISTS')
  const { data: fuCheck } = await OWNER.from('follow_ups').select('*, lead:leads(full_name)').eq('id', followUp.id).single()
  if (fuCheck) {
    l(`  ✅ PASS: follow_ups row found in database`)
    l(`  Lead: ${fuCheck.lead?.full_name}, Type: ${fuCheck.type}, Status: ${fuCheck.status}`)
  } else {
    l(`  ❌ FAIL: follow_ups row NOT found in database`)
  }

  // 5. Count total follow-ups now
  const { count: fuCount } = await OWNER.from('follow_ups').select('*', { count: 'exact', head: true })
  l(`  Total follow_ups rows: ${fuCount}`)

  // 6. Check notifications table
  sep('5. CHECK NOTIFICATIONS TABLE')
  const { data: notifs, count: notifCount } = await OWNER.from('notifications').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(10)
  l(`  Total notifications: ${notifCount}`)

  if (notifs && notifs.length > 0) {
    l(`  ✅ PASS: ${notifs.length} notification rows found`)
    for (const n of notifs) {
      l(`    [${n.type}] ${n.title}: ${n.message} (user: ${n.user_id}, read: ${n.is_read})`)
    }
  } else {
    l(`  ⚠️  No notifications found in database`)
  }

  // 7. Create a new lead assigned to counselor - this should trigger a notification
  sep('6. CREATE NEW LEAD (should trigger notification)')
  const ts = Date.now()
  const { data: newLead, error: nlErr } = await OWNER.from('leads').insert({
    full_name: `Step A Test Lead ${ts}`,
    mobile: '9988776655',
    email: `stepA${ts}@test.com`,
    source: 'website',
    assigned_counselor_id: counselor.id,
    status: 'new',
    priority: 'medium',
    notes: 'Testing notification creation',
    created_by: ownerId,
  }).select().single()
  if (nlErr) { l(`  FAIL: ${nlErr.message}`); finish(); return }
  l(`  OK: Lead created (id: ${newLead.id})`)

  // 8. Check if notification was created for the counselor
  sep('7. VERIFY NOTIFICATION WAS CREATED FOR COUNSELOR')
  const { data: newNotifs } = await OWNER.from('notifications')
    .select('*')
    .eq('user_id', counselor.id)
    .order('created_at', { ascending: false })
    .limit(5)
  
  if (newNotifs && newNotifs.length > 0) {
    l(`  ✅ PASS: Notifications exist for counselor after lead assignment`)
    for (const n of newNotifs) {
      l(`    [${n.created_at}] ${n.type} - ${n.title}`)
    }
  } else {
    l(`  ❌ FAIL: No notifications created for counselor after lead assignment`)
  }

  // 9. Check if there are ANY notifications with type 'new_lead'
  const { data: newLeadNotifs } = await OWNER.from('notifications').select('*').eq('type', 'new_lead').limit(5)
  if (newLeadNotifs && newLeadNotifs.length > 0) {
    l(`  ✅ PASS: ${newLeadNotifs.length} 'new_lead' type notifications exist`)
  } else {
    l(`  ⚠️  No 'new_lead' type notifications - no trigger fires on lead creation`)
  }

  sep('RESULTS SUMMARY')
  l(`  FOLLOW_UPS write to DB: ${fuCheck ? '✅ PASS' : '❌ FAIL'}`)
  l(`  NOTIFICATIONS have rows: ${(notifs && notifs.length > 0) ? '✅ PASS' : '⚠️ WARNING'}`)
  l(`  NOTIFICATION on lead assignment: ${(newNotifs && newNotifs.length > 0) ? '✅ PASS' : '❌ FAIL (no trigger)'}`)

  finish()
}

main().catch(e => { l(`FATAL: ${e.message}`); console.error(e); finish() })