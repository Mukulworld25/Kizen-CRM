import { createClient } from '@supabase/supabase-js'

const SU = 'https://zmqvjtenuxlvwfopfroc.supabase.co'
const SK = 'sb_publishable_ezZ7_UyticpI7aeLKY3Rew_i_FaZBDh'
const SP = createClient(SU, SK)

async function debug() {
  const accts = [
    { email: 'shivam.kizen.test@gmail.com', pw: 'Shivam@123', name: 'Owner' },
    { email: 'counselor.kizen@gmail.com', pw: 'Counselor@123', name: 'Counselor' },
    { email: 'accounts.kizen@gmail.com', pw: 'Accounts@123', name: 'Accounts' },
    { email: 'reception.kizen@gmail.com', pw: 'Reception@123', name: 'Reception' },
  ]
  
  for (const a of accts) {
    console.log(`\n--- ${a.name} (${a.email}) ---`)
    const si = await SP.auth.signInWithPassword({ email: a.email, password: a.pw })
    if (si.error) { console.log(`  SIGNIN FAIL: ${si.error.message}`); continue }
    console.log(`  Signin OK: user=${si.data.user.id.slice(0,8)}`)
    
    const C = createClient(SU, SK, { global: { headers: { Authorization: `Bearer ${si.data.session.access_token}` } } })
    
    // Try users table
    const { data: u, error: ue } = await C.from('users').select('id,role,auth_id').eq('auth_id', si.data.user.id).limit(1)
    console.log(`  users: ${ue ? `ERR: ${ue.message.substring(0,80)}` : `OK role=${u?.[0]?.role || 'UNKNOWN'} auth_id=${u?.[0]?.auth_id?.slice(0,8) || 'NULL'}`}`)
    
    // Try courses
    const { data: co, error: coe } = await C.from('courses').select('count', { count: 'exact', head: true })
    console.log(`  courses: ${coe ? `ERR: ${coe.message.substring(0,80)}` : `OK (${co || 0} rows)`}`)
    
    // Try leads
    const { data: l, error: le } = await C.from('leads').select('count', { count: 'exact', head: true })
    console.log(`  leads: ${le ? `ERR: ${le.message.substring(0,80)}` : `OK (${l || 0} rows)`}`)
    
    // Try students
    const { data: s, error: se } = await C.from('students').select('count', { count: 'exact', head: true })
    console.log(`  students: ${se ? `ERR: ${se.message.substring(0,80)}` : `OK (${s || 0} rows)`}`)
    
    // Try fees
    const { data: f, error: fe } = await C.from('fees').select('count', { count: 'exact', head: true })
    console.log(`  fees: ${fe ? `ERR: ${fe.message.substring(0,80)}` : `OK (${f || 0} rows)`}`)
  }
}
debug().catch(e => console.error('FATAL:', e))