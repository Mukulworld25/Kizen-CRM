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

  // 1. Delete fake faculty users
  const fakeEmails = ['Jasmeen.kizen@gmail.com','Shaifali.kizen@gmail.com','Simrat.kizen@gmail.com']
  const { data: deleted, error: delErr } = await supabase
    .from('users')
    .delete()
    .in('email', fakeEmails)
    .select('id, email, name')

  if (delErr) {
    console.error('Error deleting fake faculty:', delErr.message)
  } else {
    console.log('Deleted fake faculty users:', deleted)
  }

  // Verify remaining faculty/users
  const { data: users } = await supabase.from('users').select('id, name, email, role')
  console.log('\nRemaining Users in system:', users)

  // 4. Verify mobile numbers length check
  const { data: leads } = await supabase.from('leads').select('id, mobile')
  const invalidMobiles = leads?.filter(l => l.mobile && l.mobile.length !== 10 && l.mobile.length !== 0) ?? []
  console.log(`\nMobile length check: Found ${invalidMobiles.length} leads where mobile length is not (0, 10).`)
}

run().catch(console.error)
