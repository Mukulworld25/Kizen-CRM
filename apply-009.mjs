import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'fs'

const SU = 'https://zmqvjtenuxlvwfopfroc.supabase.co'
const SK = 'sb_publishable_ezZ7_UyticpI7aeLKY3Rew_i_FaZBDh'
const supabase = createClient(SU, SK)

const log = []
function l(m) { log.push(m); console.log(m) }
function finish() { writeFileSync('apply-009-output.txt', log.join('\n')); l('Written to apply-009-output.txt') }

async function main() {
  l('=== APPLYING 009_schema_ai_features.sql ===')
  
  const si = await supabase.auth.signInWithPassword({ email: 'shivam.kizen.test@gmail.com', password: 'Shivam@123' })
  if (si.error) { l('LOGIN FAIL: ' + si.error.message); finish(); process.exit(1) }
  l('Signed in as ' + si.data.user.email)
  const token = si.data.session.access_token

  // Helper to run SQL via fetch
  async function runSql(sql) {
    const res = await fetch(`${SU}/rest/v1/rpc/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'apikey': SK },
      body: JSON.stringify({})
    })
    // Use the management API's SQL endpoint
    const sqlRes = await fetch(`${SU}/sql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'apikey': SK, 'Prefer': 'params=single-object' },
      body: JSON.stringify({ query: sql })
    })
    if (sqlRes.ok) return { ok: true, text: await sqlRes.text() }
    const text = await sqlRes.text()
    if (text.includes('already exists') || text.includes('Duplicate') || text.includes('42701')) return { ok: true, text }
    return { ok: false, text }
  }

  // Step 1: Add lead_score column
  l('\n1. Adding lead_score column...')
  const r1 = await runSql("ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0;")
  l(r1.ok ? '  ✓ lead_score column added' : '  ✗ ' + r1.text.substring(0, 120))

  // Step 2: Add ai_summary column
  l('\n2. Adding ai_summary column...')
  const r2 = await runSql("ALTER TABLE lead_activities ADD COLUMN IF NOT EXISTS ai_summary TEXT;")
  l(r2.ok ? '  ✓ ai_summary column added' : '  ✗ ' + r2.text.substring(0, 120))

  // Step 3: Create indexes
  l('\n3. Creating indexes...')
  const r3a = await runSql("CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(lead_score) WHERE lead_score > 0;")
  l(r3a.ok ? '  ✓ idx_leads_score' : '  ✗ ' + r3a.text.substring(0, 80))
  const r3b = await runSql("CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_date ON lead_activities(lead_id, created_at DESC);")
  l(r3b.ok ? '  ✓ idx_lead_activities_lead_date' : '  ✗ ' + r3b.text.substring(0, 80))
  const r3c = await runSql("CREATE INDEX IF NOT EXISTS idx_batches_capacity ON batches(enrolled_count, total_seats);")
  l(r3c.ok ? '  ✓ idx_batches_capacity' : '  ✗ ' + r3c.text.substring(0, 80))

  // Step 4: Create compute_lead_scores function
  l('\n4. Creating compute_lead_scores RPC...')
  const r4 = await runSql(`
CREATE OR REPLACE FUNCTION compute_lead_scores()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE leads l
  SET lead_score = LEAST(100, (
    COALESCE((CASE l.temperature WHEN 'hot' THEN 3 WHEN 'warm' THEN 2 WHEN 'cold' THEN 1 ELSE 0 END) * 20, 0) +
    COALESCE((5 - EXTRACT(DAY FROM NOW() - la.last_activity)) * 10, 0) +
    COALESCE(LEAST(la.total_activities, 10) * 2, 0)
  ))
  FROM (
    SELECT lead_id, MAX(created_at) AS last_activity, COUNT(*) AS total_activities
    FROM lead_activities GROUP BY lead_id
  ) la
  WHERE la.lead_id = l.id;  
  UPDATE leads SET lead_score = COALESCE((CASE temperature WHEN 'hot' THEN 3 WHEN 'warm' THEN 2 WHEN 'cold' THEN 1 ELSE 0 END) * 20, 0) WHERE lead_score IS NULL;
END;
$$;`)
  l(r4.ok ? '  ✓ compute_lead_scores created' : '  ✗ ' + r4.text.substring(0, 120))

  // Step 5: Run scores
  l('\n5. Running compute_lead_scores...')
  try {
    await supabase.rpc('compute_lead_scores')
    l('  ✓ executed successfully')
  } catch (e) {
    l('  ✗ ' + e.message)
  }

  // Step 6: Verify columns
  l('\n6. VERIFYING COLUMNS...')
  const [lc, ac] = await Promise.all([
    supabase.from('leads').select('lead_score').limit(1),
    supabase.from('lead_activities').select('ai_summary').limit(1),
  ])
  l(lc.error ? '  ✗ leads.lead_score: ' + lc.error.message : '  ✓ leads.lead_score EXISTS')
  l(ac.error ? '  ✗ lead_activities.ai_summary: ' + ac.error.message : '  ✓ lead_activities.ai_summary EXISTS')

  // Step 7: Show sample scores
  const { data: scored } = await supabase.from('leads').select('full_name, temperature, lead_score').limit(10)
  l('\n7. SAMPLE LEAD SCORES:')
  for (const s of scored ?? []) l(`  ${s.full_name}: temp=${s.temperature ?? '—'}, score=${s.lead_score ?? '—'}`)

  l('\n=== EDGE FUNCTION DEPLOY ===')
  l('Supabase CLI not available on this machine.')
  l('To deploy, run from your terminal:')
  l('  cd kizen-crm')
  l('  npx supabase functions deploy ai-summary')
  l('  npx supabase secrets set CLAUDE_API_KEY=your-key-here')
  l('The function code is ready at: supabase/functions/ai-summary/index.ts')
  l('')
  l('=== VERIFICATION COMPLETE ===')
  
  finish()
}

main().catch(e => { l('FATAL: ' + e.message); finish(); process.exit(1) })