import { supabase } from '@/lib/supabase'
import { syncMetaLeads } from './metaLeadSync'

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

export function isDailySyncDue(lastSyncedAtStr?: string | null): boolean {
  if (!lastSyncedAtStr) return true

  const now = new Date()
  const nowIst = new Date(now.getTime() + IST_OFFSET_MS)

  // Target today's 09:00 AM IST in UTC milliseconds
  const today9AmIst = new Date(nowIst)
  today9AmIst.setUTCHours(9, 0, 0, 0)
  const today9AmUtcMs = today9AmIst.getTime() - IST_OFFSET_MS

  const lastSyncMs = new Date(lastSyncedAtStr).getTime()

  // If current time is at or past 9:00 AM IST, sync is due if last sync was before today's 9:00 AM IST
  if (now.getTime() >= today9AmUtcMs) {
    return lastSyncMs < today9AmUtcMs
  }

  // If current time is before 9:00 AM IST, sync is due if last sync was before yesterday's 9:00 AM IST
  const yesterday9AmUtcMs = today9AmUtcMs - 24 * 60 * 60 * 1000
  return lastSyncMs < yesterday9AmUtcMs
}

export function getMsUntilNext9AmIst(): number {
  const now = new Date()
  const nowIst = new Date(now.getTime() + IST_OFFSET_MS)

  const target9AmIst = new Date(nowIst)
  target9AmIst.setUTCHours(9, 0, 0, 0)
  let targetUtcMs = target9AmIst.getTime() - IST_OFFSET_MS

  // If today's 9:00 AM IST has already passed, schedule for tomorrow's 9:00 AM IST
  if (now.getTime() >= targetUtcMs) {
    targetUtcMs += 24 * 60 * 60 * 1000
  }

  return Math.max(1000, targetUtcMs - now.getTime())
}

let isSyncRunning = false

export async function runAutoSync(onSyncCompleted?: () => void) {
  if (isSyncRunning) return
  isSyncRunning = true

  try {
    const { data: conn } = await supabase
      .from('ad_sync_connections')
      .select('last_synced_at, is_active')
      .eq('platform', 'meta')
      .maybeSingle()

    if (!conn || !conn.is_active) {
      return
    }

    if (isDailySyncDue(conn.last_synced_at)) {
      console.log('[AutoSync] Morning 9:00 AM IST sync triggered...')
      const result = await syncMetaLeads()
      console.log('[AutoSync] Result:', result)
      if (result.success && onSyncCompleted) {
        onSyncCompleted()
      }
    }
  } catch (err) {
    console.warn('[AutoSync] Error during background check:', err)
  } finally {
    isSyncRunning = false
  }
}

/**
 * Initializes the automatic background sync scheduler.
 * Runs on app mount, checks if morning 9:00 AM sync is due, and sets a timer for 9:00 AM IST.
 */
export function initAutoSyncScheduler(onSyncCompleted?: () => void): () => void {
  // 1. Initial opportunistic check on startup / page load
  runAutoSync(onSyncCompleted)

  // 2. Schedule upcoming 9:00 AM IST execution
  const msUntilNext = getMsUntilNext9AmIst()
  console.log(`[AutoSync] Next 9:00 AM IST sync scheduled in ${Math.round(msUntilNext / 60000)} minutes.`)

  const timerId = setTimeout(() => {
    runAutoSync(onSyncCompleted)
    // Repeat daily (24h)
    const dailyInterval = setInterval(() => {
      runAutoSync(onSyncCompleted)
    }, 24 * 60 * 60 * 1000)

    return () => clearInterval(dailyInterval)
  }, msUntilNext)

  return () => clearTimeout(timerId)
}
