import { createClient } from '@supabase/supabase-js'

const SU = 'https://zmqvjtenuxlvwfopfroc.supabase.co'
const SK = 'sb_publishable_ezZ7_UyticpI7aeLKY3Rew_i_FaZBDh'
const supabase = createClient(SU, SK)

async function main() {
  const si = await supabase.auth.signInWithPassword({ email: 'shivam.kizen.test@gmail.com', password: 'Shivam@123' })
  if (si.error) { console.error(si.error.message); return }

  // Check columns for students
  const { data: studentCol, error: e1 } = await supabase.from('students').select('*').limit(1)
  if (studentCol && studentCol.length > 0) {
    console.log('Students columns:', Object.keys(studentCol[0]))
  } else {
    console.log('Students empty, columns unknown')
  }

  // Check columns for leads
  const { data: leadCol, error: e2 } = await supabase.from('leads').select('*').limit(1)
  if (leadCol && leadCol.length > 0) {
    console.log('Leads columns:', Object.keys(leadCol[0]))
  } else {
    console.log('Leads empty, columns unknown')
  }
}

main().catch(console.error)
