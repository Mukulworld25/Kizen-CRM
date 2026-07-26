import { createClient } from '@supabase/supabase-js'

const SU = 'https://zmqvjtenuxlvwfopfroc.supabase.co'
const SK = 'sb_publishable_ezZ7_UyticpI7aeLKY3Rew_i_FaZBDh'
const supabase = createClient(SU, SK)

async function testStatuses() {
  await supabase.auth.signInWithPassword({
    email: 'shivam.kizen.test@gmail.com',
    password: 'Shivam@123'
  })

  const statuses = ['new_lead', 'contacted', 'in_progress', 'converted', 'lost', 'interested', 'demo_scheduled', 'follow_up_required']
  for (const st of statuses) {
    const res = await supabase.from('leads').insert({
      full_name: 'Test Status ' + st,
      mobile: '99' + Math.floor(10000000 + Math.random() * 90000000),
      status: st
    }).select()
    console.log(`Status '${st}':`, res.error ? `FAIL: ${res.error.message}` : 'SUCCESS')
  }
}

testStatuses()
