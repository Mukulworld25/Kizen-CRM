import { createClient } from '@supabase/supabase-js'
const SU = 'https://zmqvjtenuxlvwfopfroc.supabase.co'
const SK = 'sb_publishable_ezZ7_UyticpI7aeLKY3Rew_i_FaZBDh'
const sp = createClient(SU, SK)

const si = await sp.auth.signInWithPassword({ email: 'shivam.kizen.test@gmail.com', password: 'Shivam@123' })
if (si.error) { console.log('SIGNIN FAIL:', si.error.message); process.exit(1) }
const C = createClient(SU, SK, { global: { headers: { Authorization: 'Bearer ' + si.data.session.access_token } } })

// Check leads columns
const { data: cols } = await C.from('leads').select('id, temperature, budget, expected_joining_date, status').limit(3)
console.log('Leads count:', cols?.length ?? 0)
if (cols?.length > 0) {
  console.log('Keys:', Object.keys(cols[0]).join(', '))
  console.log('Has temperature:', 'temperature' in cols[0])
  console.log('Has budget:', 'budget' in cols[0])
  console.log('Has expected_joining_date:', 'expected_joining_date' in cols[0])
}

// Statuses
const { data: st } = await C.from('leads').select('status')
const unique = [...new Set(st.map(s => s.status))]
console.log('Statuses:', unique.join(', '))

// Check users role constraint
const { data: usr } = await C.from('users').select('role')
const roles = [...new Set(usr.map(u => u.role))]
console.log('User roles:', roles.join(', '))

// Check notifications
const { data: notifs } = await C.from('notifications').select('id').limit(1)
console.log('Notifications exist:', (notifs?.length ?? 0) > 0)

// Check new tables
for (const t of ['institutions', 'institution_meetings', 'institution_follow_ups', 'feature_permissions', 'institute_expenses']) {
  const { data } = await C.from(t).select('id').limit(1).maybeSingle()
  console.log(`${t}: ${data !== null ? 'exists' : 'exists (empty)'}`)
}