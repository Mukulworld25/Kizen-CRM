import { createClient } from '@supabase/supabase-js'

const SU = 'https://bumjiykhgkgmqyynwtuh.supabase.co'
const SK = 'sb_publishable_WvTe_Y2WcJay9k3aeDc8sQ_0W2--LjH'
const supabase = createClient(SU, SK)

async function main() {
  console.log('--- Signing in to Supabase ---')
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'shivam.kizen.test@gmail.com',
    password: 'Shivam@123'
  })

  if (authErr) {
    console.error('Sign in failed:', authErr.message)
    return
  }
  console.log('Signed in as:', auth.user.email)

  // Try creating table / seeding via RPC or testing table presence
  const categories = [
    'Rent',
    'Salaries',
    'Electricity',
    'Marketing',
    'Coffee/ Milk/ Sugar',
    'Miscellaneous'
  ]

  console.log('Attempting to upsert default categories into expense_categories...')
  for (const cat of categories) {
    const { data, error } = await supabase
      .from('expense_categories')
      .upsert({ name: cat }, { onConflict: 'name' })
      .select()

    if (error) {
      console.log(`Failed for '${cat}':`, error.message)
    } else {
      console.log(`Successfully upserted: '${cat}'`)
    }
  }
}

main().catch(console.error)
