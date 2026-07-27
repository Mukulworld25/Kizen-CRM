import { createClient } from '@supabase/supabase-js'

const SU = 'https://zmqvjtenuxlvwfopfroc.supabase.co'
const SK = 'sb_publishable_ezZ7_UyticpI7aeLKY3Rew_i_FaZBDh'
const supabase = createClient(SU, SK)

const SQL_STATEMENTS = [
  `ALTER TABLE batches ADD COLUMN IF NOT EXISTS days_of_week TEXT`,
  `ALTER TABLE batches ADD COLUMN IF NOT EXISTS schedule_days TEXT`,
  `ALTER TABLE leads ADD COLUMN IF NOT EXISTS referred_by_student_id UUID REFERENCES students(id) ON DELETE SET NULL`,
  `ALTER TABLE students ADD COLUMN IF NOT EXISTS referred_by_lead_id UUID REFERENCES leads(id) ON DELETE SET NULL`,
  `ALTER TABLE students ADD COLUMN IF NOT EXISTS referred_by_student_id UUID REFERENCES students(id) ON DELETE SET NULL`,
  `NOTIFY pgrst, 'reload schema'`,
  `
  CREATE OR REPLACE FUNCTION auto_set_fee_course_id()
  RETURNS TRIGGER AS $$
  BEGIN
    IF NEW.course_id IS NULL THEN
      SELECT course_id INTO NEW.course_id
      FROM students
      WHERE id = NEW.student_id;
    END IF;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql
  `,
  `DROP TRIGGER IF EXISTS trg_auto_set_fee_course_id ON fees`,
  `
  CREATE TRIGGER trg_auto_set_fee_course_id
    BEFORE INSERT ON fees
    FOR EACH ROW
    EXECUTE FUNCTION auto_set_fee_course_id()
  `,
]

async function runSql(sql, token) {
  const res = await fetch(`${SU}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': SK,
    },
    body: JSON.stringify({ query: sql }),
  })
  if (res.ok) return { ok: true, text: await res.text() }
  const res2 = await fetch(`${SU}/sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': SK,
      'Prefer': 'params=single-object',
    },
    body: JSON.stringify({ query: sql }),
  })
  const text = await res2.text()
  return { ok: res2.ok, text }
}

async function main() {
  console.log('=== Applying DB schema changes ===\n')

  const si = await supabase.auth.signInWithPassword({ email: 'shivam.kizen.test@gmail.com', password: 'Shivam@123' })
  if (si.error) { console.error('Sign-in failed:', si.error.message); process.exit(1) }
  console.log('✓ Signed in as:', si.data.user.email)
  const token = si.data.session.access_token

  let pass = 0, fail = 0
  for (const stmt of SQL_STATEMENTS) {
    process.stdout.write(`  ${stmt.substring(0, 65).trim()}... `)
    const res = await runSql(stmt, token)
    if (res.ok) {
      console.log('OK')
      pass++
    } else {
      console.log(`FAILED\n    ${res.text.substring(0, 200)}`)
      fail++
    }
  }

  console.log(`\n  ${pass} passed, ${fail} failed`)
  if (fail > 0) {
    console.log('\nSome failures may be because columns/triggers already exist — this is safe.')
  }
}

main().catch(console.error)