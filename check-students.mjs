import { createClient } from '@supabase/supabase-js'

const SU = 'https://zmqvjtenuxlvwfopfroc.supabase.co'
const SK = 'sb_publishable_ezZ7_UyticpI7aeLKY3Rew_i_FaZBDh'
const supabase = createClient(SU, SK)

async function main() {
  await supabase.auth.signInWithPassword({
    email: 'shivam.kizen.test@gmail.com',
    password: 'Shivam@123'
  })

  const { data: students } = await supabase.from('students').select('id, full_name, mobile, created_at').order('created_at', { ascending: false })
  console.log('--- ALL STUDENTS IN DB ---')
  students?.forEach((s, idx) => console.log(`${idx + 1}. ${s.full_name} (${s.mobile}) created=${s.created_at} id=${s.id}`))
}

main()
