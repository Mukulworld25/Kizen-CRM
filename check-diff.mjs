import { createClient } from '@supabase/supabase-js'

const OLD_URL = 'https://zmqvjtenuxlvwfopfroc.supabase.co'
const OLD_KEY = 'sb_publishable_ezZ7_UyticpI7aeLKY3Rew_i_FaZBDh'
const oldSb = createClient(OLD_URL, OLD_KEY)

const NEW_URL = 'https://bumjiykhgkgmqyynwtuh.supabase.co'
const NEW_KEY = 'sb_publishable_WvTe_Y2WcJay9k3aeDc8sQ_0W2--LjH'
const newSb = createClient(NEW_URL, NEW_KEY)

async function checkDiff() {
  await oldSb.auth.signInWithPassword({ email: 'shivam.kizen.test@gmail.com', password: 'Shivam@123' })
  await newSb.auth.signInWithPassword({ email: 'shivam.kizen.test@gmail.com', password: 'Shivam@123' })

  const { data: oldUsers } = await oldSb.from('users').select('*')
  const { data: newUsers } = await newSb.from('users').select('*')

  console.log('--- OLD DB USERS ---')
  console.table(oldUsers)

  console.log('--- NEW DB USERS ---')
  console.table(newUsers)

  const { data: oldFP } = await oldSb.from('feature_permissions').select('*')
  const { data: newFP } = await newSb.from('feature_permissions').select('*')
  console.log('--- OLD FEATURE PERMISSIONS ---', oldFP)
  console.log('--- NEW FEATURE PERMISSIONS ---', newFP)
}

checkDiff().catch(console.error)
