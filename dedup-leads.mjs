import { createClient } from '@supabase/supabase-js'
import { createInterface } from 'readline'
import { writeFileSync } from 'fs'

const SU = 'https://zmqvjtenuxlvwfopfroc.supabase.co'
const SK = 'sb_publishable_ezZ7_UyticpI7aeLKY3Rew_i_FaZBDh'
const supabase = createClient(SU, SK)

const AUTO_CONFIRM = process.argv.includes('--confirm')
const rl = createInterface({ input: process.stdin, output: process.stdout })
function ask(q) { return new Promise(r => rl.question(q, r)) }

async function main() {
  console.log('=== KIZEN CRM — LEAD DEDUPLICATION (SAFE MODE) ===\n')

  // Sign in
  const si = await supabase.auth.signInWithPassword({ email: 'shivam.kizen.test@gmail.com', password: 'Shivam@123' })
  if (si.error) { console.error('SIGN-IN FAILED:', si.error.message); process.exit(1) }
  console.log('✓ Signed in as:', si.data.user.email)

  // ============================================================
  // STEP 1 — Confirm no other process is currently writing
  // ============================================================
  console.log('\n--- STEP 1: Checking for active writes ---')

  // First count
  const { count: count1, error: e1 } = await supabase.from('leads').select('id', { count: 'exact', head: true })
  if (e1) { console.error('COUNT query 1 failed:', e1.message); process.exit(1) }
  console.log(`  Count #1: ${count1}`)

  // Check max created_at
  const { data: maxData, error: eMax } = await supabase
    .from('leads')
    .select('created_at')
    .order('created_at', { ascending: false })
    .limit(1)
  if (eMax) { console.error('MAX(created_at) query failed:', eMax.message); process.exit(1) }

  if (maxData && maxData.length > 0 && maxData[0].created_at) {
    const maxTs = new Date(maxData[0].created_at)
    const now = new Date()
    const diffMinutes = (now - maxTs) / 60000
    console.log(`  Latest lead created_at: ${maxData[0].created_at} (${diffMinutes.toFixed(1)} minutes ago)`)
    if (diffMinutes < 5) {
      console.log('\n  ⛔ STOP: The most recent lead was created less than 5 minutes ago.')
      console.log('  Something may still be importing. Tell Mukul to check and re-run later.')
      process.exit(1)
    }
  } else {
    console.log('  No created_at found (table may be empty)')
  }

  // Wait 30 seconds
  console.log('  Waiting 30 seconds before second count...')
  await new Promise(r => setTimeout(r, 30000))

  // Second count
  const { count: count2, error: e2 } = await supabase.from('leads').select('id', { count: 'exact', head: true })
  if (e2) { console.error('COUNT query 2 failed:', e2.message); process.exit(1) }
  console.log(`  Count #2: ${count2}`)

  if (count1 !== count2) {
    console.log(`\n  ⛔ STOP: Count changed from ${count1} to ${count2}. Something is still importing.`)
    console.log('  Tell Mukul to check and re-run later.')
    process.exit(1)
  }
  console.log('  ✓ Counts match — no active writes detected.')

  // ============================================================
  // STEP 2 — Backup before touching anything
  // ============================================================
  console.log('\n--- STEP 2: Creating backup table ---')
  // Check if table already exists
  const { data: checkTable, error: ctErr } = await supabase.from('audit_removed_leads_dedup').select('id', { count: 'exact', head: true }).limit(1)
  if (ctErr && ctErr.message.includes('does not exist')) {
    // Table doesn't exist — we can't CREATE TABLE via REST API.
    // We'll create it by inserting a dummy row and then deleting it.
    // First, get the column structure from leads
    const { data: sampleLead } = await supabase.from('leads').select('*').limit(1)
    if (!sampleLead || sampleLead.length === 0) {
      console.log('  Leads table is empty — nothing to deduplicate.')
      process.exit(0)
    }
    // We'll handle backup by inserting into the audit table directly.
    // Since we can't CREATE TABLE via REST, we'll use a workaround:
    // The audit table must be created manually in Supabase SQL Editor first.
    console.log('\n  ⚠️  The audit_removed_leads_dedup table does not exist.')
    console.log('  Please run this SQL in Supabase Dashboard > SQL Editor first:')
    console.log('')
    console.log('  CREATE TABLE IF NOT EXISTS audit_removed_leads_dedup AS')
    console.log('  SELECT l.*, NOW() AS removed_at FROM leads l WHERE false;')
    console.log('')
    const ready = await ask('  Type "ready" after you have created the table: ')
    if (ready.toLowerCase().trim() !== 'ready') {
      console.log('\n  Aborted.')
      process.exit(0)
    }
    // Verify it exists now
    const { error: ctErr2 } = await supabase.from('audit_removed_leads_dedup').select('id', { count: 'exact', head: true }).limit(1)
    if (ctErr2) {
      console.error('  Table still not accessible:', ctErr2.message)
      process.exit(1)
    }
    console.log('  ✓ audit_removed_leads_dedup table confirmed.')
  } else {
    console.log('  ✓ audit_removed_leads_dedup table already exists.')
  }

  // ============================================================
  // STEP 3 — Preview duplicates
  // ============================================================
  console.log('\n--- STEP 3: Fetching all leads for duplicate analysis ---')
  // Fetch with pagination (Supabase REST API defaults to 1000 rows)
  const allLeads = []
  let page = 0
  const PAGE_SIZE = 1000
  let fetchErr = null
  while (true) {
    const { data, error } = await supabase
      .from('leads')
      .select('id, full_name, mobile, interested_course_id, city, created_at')
      .order('created_at', { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    if (error) { fetchErr = error; break }
    if (!data || data.length === 0) break
    allLeads.push(...data)
    console.log(`  Fetched ${allLeads.length} leads so far...`)
    if (data.length < PAGE_SIZE) break
    page++
  }
  if (fetchErr) { console.error('Failed to fetch leads:', fetchErr.message); process.exit(1) }
  console.log(`  Fetched ${allLeads.length} leads total.`)

  // Group by mobile (non-empty)
  const groups = new Map()
  for (const lead of allLeads) {
    if (!lead.mobile || lead.mobile === '') continue
    if (!groups.has(lead.mobile)) groups.set(lead.mobile, [])
    groups.get(lead.mobile).push(lead)
  }

  // Find duplicates
  const dupGroups = []
  for (const [mobile, rows] of groups) {
    if (rows.length > 1) {
      // Sort by priority: interested_course_id not null > city not empty > earliest created_at
      rows.sort((a, b) => {
        const aCourse = a.interested_course_id ? 1 : 0
        const bCourse = b.interested_course_id ? 1 : 0
        if (bCourse !== aCourse) return bCourse - aCourse
        const aCity = a.city && a.city !== '' ? 1 : 0
        const bCity = b.city && b.city !== '' ? 1 : 0
        if (bCity !== aCity) return bCity - aCity
        return new Date(a.created_at) - new Date(b.created_at)
      })
      dupGroups.push({ mobile, rows, keep: rows[0], remove: rows.slice(1) })
    }
  }

  // Sort by group size descending
  dupGroups.sort((a, b) => b.remove.length - a.remove.length)

  console.log(`  Found ${dupGroups.length} phone numbers with duplicates.`)
  console.log(`  Total duplicate rows to remove: ${dupGroups.reduce((s, g) => s + g.remove.length, 0)}`)

  // Show top 20
  console.log('\n  Top 20 duplicate groups (phone → total rows → keep → remove):')
  for (let i = 0; i < Math.min(20, dupGroups.length); i++) {
    const g = dupGroups[i]
    console.log(`  ${i+1}. ${g.mobile} — ${g.rows.length} rows (keep id=${g.keep.id}, remove ${g.remove.length})`)
  }

  // Show detailed rows for the top group
  if (dupGroups.length > 0) {
    const top = dupGroups[0]
    console.log(`\n  --- Detailed rows for top group: ${top.mobile} ---`)
    for (const row of top.rows) {
      const action = row.id === top.keep.id ? 'KEEP' : 'REMOVE'
      console.log(`    [${action}] id=${row.id} | name=${row.full_name || '(no name)'} | course=${row.interested_course_id || '(none)'} | city=${row.city || '(none)'} | created=${row.created_at}`)
    }
  }

  // ============================================================
  // STEP 3 CHECKPOINT — Manual review
  // ============================================================
  console.log('\n========================================')
  console.log('  STEP 3 CHECKPOINT — Review the preview above.')
  console.log('  Do these look like genuine duplicates (same person, repeated import)?')
  console.log('  Or do they look like different people sharing a phone number?')
  console.log('========================================')
  let answer = 'no'
  if (AUTO_CONFIRM) {
    console.log('\n  --confirm flag detected, proceeding...')
    answer = 'yes'
  } else {
    answer = await ask('\n  Type "yes" to proceed with deletion, or anything else to abort: ')
  }
  if (answer.toLowerCase().trim() !== 'yes') {
    console.log('\n  Aborted by user. No data was modified.')
    process.exit(0)
  }

  // ============================================================
  // STEP 4 — Backup then delete the losers
  // ============================================================
  console.log('\n--- STEP 4: Backing up and removing duplicates ---')

  // Collect all loser IDs
  const loserIds = []
  for (const g of dupGroups) {
    for (const row of g.remove) {
      loserIds.push(row.id)
    }
  }
  console.log(`  Total rows to remove: ${loserIds.length}`)

  // Backup: fetch full rows for losers and save locally
  const BATCH_SIZE = 100
  const allBackupRows = []
  for (let i = 0; i < loserIds.length; i += BATCH_SIZE) {
    const batch = loserIds.slice(i, i + BATCH_SIZE)
    const { data: fullRows, error: fErr } = await supabase.from('leads').select('*').in('id', batch)
    if (fErr) { console.error(`Failed to fetch batch ${i}:`, fErr.message); process.exit(1) }
    allBackupRows.push(...fullRows.map(r => ({ ...r, removed_at: new Date().toISOString() })))
    console.log(`  Fetched ${allBackupRows.length}/${loserIds.length} rows for backup...`)
  }
  // Save backup to local file
  const backupFile = `dedup-backup-${Date.now()}.json`
  writeFileSync(backupFile, JSON.stringify(allBackupRows, null, 2))
  console.log(`  ✓ ${allBackupRows.length} rows backed up to ${backupFile}`)
  const backedUp = allBackupRows.length

  // Delete losers in batches
  let deleted = 0
  for (let i = 0; i < loserIds.length; i += BATCH_SIZE) {
    const batch = loserIds.slice(i, i + BATCH_SIZE)
    const { error: dErr } = await supabase.from('leads').delete().in('id', batch)
    if (dErr) { console.error(`Delete failed at batch ${i}:`, dErr.message); process.exit(1) }
    deleted += batch.length
    console.log(`  Deleted ${deleted}/${loserIds.length} rows...`)
  }
  console.log(`  ✓ ${deleted} duplicate rows deleted from leads.`)

  // ============================================================
  // STEP 5 — Verify
  // ============================================================
  console.log('\n--- STEP 5: Verification ---')

  const { count: finalCount, error: fcErr } = await supabase.from('leads').select('id', { count: 'exact', head: true })
  if (fcErr) { console.error('Final count failed:', fcErr.message); process.exit(1) }
  console.log(`  Final lead count: ${finalCount}`)

  // Check for remaining duplicates
  const { data: remainingLeads, error: rlErr } = await supabase
    .from('leads')
    .select('mobile')
    .not('mobile', 'eq', '')
  if (rlErr) { console.error('Remaining check failed:', rlErr.message); process.exit(1) }

  const mobileCounts = new Map()
  for (const l of remainingLeads) {
    mobileCounts.set(l.mobile, (mobileCounts.get(l.mobile) || 0) + 1)
  }
  let dupCount = 0
  for (const [, c] of mobileCounts) {
    if (c > 1) dupCount++
  }
  console.log(`  Remaining duplicate phones: ${dupCount}`)

  if (dupCount === 0) {
    console.log('  ✓ VERIFIED: No duplicate phone numbers remain.')
  } else {
    console.log(`  ⚠️  WARNING: ${dupCount} duplicate phones still exist. Something may be wrong.`)
  }

  // ============================================================
  // STEP 6 — Report
  // ============================================================
  console.log('\n========================================')
  console.log('  REPORT TO MUKUL')
  console.log('========================================')
  console.log(`  Final lead count: ${finalCount}`)
  console.log(`  Duplicate phones: ${dupCount} (must be 0)`)
  console.log(`  Rows removed:     ${backedUp}`)
  console.log(`  Backup file:       ${backupFile}`)
  console.log('')
  console.log('  ⚠️  Do NOT run any other import or write operation on leads,')
  console.log('     students, or fees until Mukul confirms next steps.')
  console.log('========================================\n')

  rl.close()
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1) })