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

const staffUsers = [
  {
    name: 'Shivam Owner',
    email: 'shivam.kizen.test@gmail.com',
    role: 'owner',
    is_active: true
  },
  {
    name: 'Aadya Sharma',
    email: 'counselor1@kizen.edu',
    role: 'counselor',
    is_active: true
  },
  {
    name: 'Preeti Verma (Front Desk)',
    email: 'reception@kizen.edu',
    role: 'reception',
    is_active: true
  },
  {
    name: "Lakshaya Ma'am (Counselor 2)",
    email: 'lakshaya@kizen.edu',
    role: 'counselor',
    is_active: true
  },
  {
    name: 'Megha Owner',
    email: 'megha@kizen.edu',
    role: 'owner',
    is_active: true
  },
  {
    name: 'Attender Staff',
    email: 'attender@kizen.edu',
    role: 'reception',
    is_active: true
  },
  {
    name: 'SAGEDO Test Account',
    email: 'sagedo.test@kizen.edu',
    role: 'owner',
    is_active: true
  }
]

async function run() {
  const si = await supabase.auth.signInWithPassword({ email: 'shivam.kizen.test@gmail.com', password: 'Shivam@123' })
  if (si.error) {
    console.error('Signin error:', si.error.message)
    return
  }

  console.log('--- Populating & Verifying public.users Table ---')

  for (const staff of staffUsers) {
    const { data: existing } = await supabase.from('users').select('*').eq('email', staff.email).single()

    if (!existing) {
      const { data: inserted, error: insErr } = await supabase.from('users').insert(staff).select().single()
      if (insErr) {
        console.error(`Failed to insert ${staff.email}:`, insErr.message)
      } else {
        console.log(`✅ Created staff user: ${staff.name} (${staff.email}) -> Role: ${staff.role}`)
      }
    } else {
      // Ensure role and active status match
      const { error: upErr } = await supabase.from('users').update({
        role: staff.role,
        name: staff.name,
        is_active: true
      }).eq('id', existing.id)

      if (upErr) {
        console.error(`Failed to update ${staff.email}:`, upErr.message)
      } else {
        console.log(`✅ Verified existing staff user: ${staff.name} (${staff.email}) -> Role: ${staff.role}`)
      }
    }
  }

  const { data: finalUsers } = await supabase.from('users').select('id, name, email, role, is_active')
  console.log('\n--- Final Users Table Roster (${finalUsers?.length ?? 0} Users) ---')
  console.table(finalUsers)

  // Verify Vite Build to ensure 0 TypeScript compilation errors
}

run().catch(console.error)
