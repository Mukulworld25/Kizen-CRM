import { supabase } from '@/lib/supabase'

export interface MetaSyncResult {
  success: boolean
  imported: number
  updated: number
  error?: string
  lastSyncedAt?: string
}

function normalizePhone(raw?: string): { full: string; last10: string } {
  if (!raw) return { full: '', last10: '' }
  const digits = raw.replace(/[^0-9]/g, '')
  if (!digits) return { full: '', last10: '' }
  const last10 = digits.length >= 10 ? digits.slice(-10) : digits
  const full = last10.length === 10 ? '+91' + last10 : '+' + digits
  return { full, last10 }
}

export function isDummyTestLead(fullName: string, phone: string, email?: string): boolean {
  const fn = (fullName || '').toLowerCase()
  const ph = (phone || '').toLowerCase()
  const em = (email || '').toLowerCase()
  if (fn.includes('<test lead') || fn.includes('dummy data') || fn.includes('test - ignore')) return true
  if (ph.includes('<test lead') || ph.includes('dummy data')) return true
  if (em.includes('@meta.com') && fn.includes('test')) return true
  return false
}

export async function syncMetaLeads(options?: { pageId?: string }): Promise<MetaSyncResult> {
  try {
    const { data: metaConn, error: connErr } = await supabase
      .from('ad_sync_connections')
      .select('*')
      .eq('platform', 'meta')
      .maybeSingle()

    if (connErr || !metaConn?.access_token) {
      return {
        success: false,
        imported: 0,
        updated: 0,
        error: 'No active Meta access token configured in Settings.',
      }
    }

    const token = metaConn.access_token
    let pageId = options?.pageId || metaConn.account_id

    // If pageId is missing, resolve it from /me/accounts
    if (!pageId) {
      const meRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${token}`)
      const meData = await meRes.json()
      if (meData?.data?.[0]?.id) {
        pageId = meData.data[0].id
      }
    }

    if (!pageId) {
      return {
        success: false,
        imported: 0,
        updated: 0,
        error: 'Could not resolve Meta Facebook Page ID.',
      }
    }

    // 1. Fetch Lead Forms
    const formsRes = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}/leadgen_forms?access_token=${token}&limit=100`
    )
    const formsData = await formsRes.json()
    if (formsData?.error) {
      return {
        success: false,
        imported: 0,
        updated: 0,
        error: formsData.error.message || 'Error fetching lead forms from Meta Graph API',
      }
    }

    const forms = formsData.data || []

    // 2. Fetch leads for all forms in parallel for ultra-fast performance
    const formLeadBatches = await Promise.all(
      forms.map(async (f: any) => {
        try {
          const leadsRes = await fetch(
            `https://graph.facebook.com/v19.0/${f.id}/leads?fields=id,created_time,field_data,platform,campaign_name&access_token=${token}&limit=100`
          )
          const leadsData = await leadsRes.json()
          return { form: f, leads: leadsData.data || [] }
        } catch {
          return { form: f, leads: [] }
        }
      })
    )

    const candidates: Array<{
      fullName: string
      cleanPhone: string
      last10: string
      email: string | null
      city: string | null
      finalQual: string | null
      source: string
      leadDate: string
      formName: string
      leadId: string
    }> = []

    for (const batch of formLeadBatches) {
      const f = batch.form
      for (const l of batch.leads) {
        const fields = l.field_data || []
        let fullName = ''
        let phone = ''
        let email = ''
        let city = ''
        let qual = ''
        let isStudent = false
        let isParent = false
        let commerce = ''

        for (const fld of fields) {
          const name = (fld.name || '').toLowerCase()
          const val = (Array.isArray(fld.values) ? fld.values[0] : fld.values) || ''
          if (name.includes('full_name') || name.includes('name')) fullName = val
          else if (name.includes('phone') || name.includes('mobile')) phone = val
          else if (name.includes('email')) email = val
          else if (name.includes('city')) city = val
          else if (name.includes('qualification')) {
            const s = val.toLowerCase()
            if (s.includes('class_12') || s.includes('12th')) qual = 'Class 12 (Commerce + Arts)'
            else if (s.includes('class_11') || s.includes('11th')) qual = 'Class 11 (Commerce)'
            else if (s.includes('b.com') || s.includes('bcom')) qual = 'B.Com'
            else if (s.includes('bba')) qual = 'BBA'
            else qual = val.replace(/_/g, ' ')
          } else if (name.includes('student') || name.includes('parent')) {
            if (val.toLowerCase().includes('student')) isStudent = true
            if (val.toLowerCase().includes('parent')) isParent = true
          } else if (name.includes('commerce')) {
            if (val.toLowerCase().includes('yes')) commerce = 'Commerce'
            else if (val.toLowerCase().includes('no')) commerce = 'Non-Commerce'
          }
        }

        // Discard any dummy test lead generated by Meta Test Lead Tool
        if (isDummyTestLead(fullName, phone, email)) {
          continue
        }

        const { full: cleanPhone, last10 } = normalizePhone(phone)
        if (!fullName || !last10) continue

        const roleSuffix = isStudent ? ' (Student)' : isParent ? ' (Parent)' : ''
        const finalQual = qual || (commerce ? `${commerce}${roleSuffix}` : null)
        const platform = (l.platform || '').toLowerCase()
        const source = (platform === 'ig' || platform === 'instagram') ? 'instagram' : 'facebook'
        const leadDate = l.created_time ? new Date(l.created_time).toISOString() : new Date().toISOString()

        candidates.push({
          fullName,
          cleanPhone,
          last10,
          email: email || null,
          city: city || null,
          finalQual: finalQual || null,
          source,
          leadDate,
          formName: f.name,
          leadId: l.id,
        })
      }
    }

    // Deduplicate in memory by 10-digit phone
    const uniqueCandidates = new Map<string, typeof candidates[0]>()
    for (const c of candidates) {
      if (!uniqueCandidates.has(c.last10)) {
        uniqueCandidates.set(c.last10, c)
      }
    }

    // Query DB for existing leads matching both +91 and 10-digit formats
    const phoneQuerySet = new Set<string>()
    for (const c of uniqueCandidates.values()) {
      phoneQuerySet.add(c.cleanPhone)
      phoneQuerySet.add(c.last10)
    }

    const { data: existingList, error: qErr } = await supabase
      .from('leads')
      .select('id, mobile, source, city, class_year, tap_date, lead_date')
      .in('mobile', Array.from(phoneQuerySet))

    if (qErr) throw qErr

    const existingMap = new Map<string, any>()
    for (const row of existingList || []) {
      existingMap.set(row.mobile, row)
      const row10 = (row.mobile || '').replace(/[^0-9]/g, '').slice(-10)
      if (row10) existingMap.set(row10, row)
    }

    const toInsert: any[] = []
    let updatedCount = 0

    for (const c of uniqueCandidates.values()) {
      const existing = existingMap.get(c.cleanPhone) || existingMap.get(c.last10)

      if (!existing) {
        toInsert.push({
          full_name: c.fullName,
          mobile: c.cleanPhone,
          email: c.email,
          source: c.source,
          city: c.city,
          class_year: c.finalQual,
          lead_date: c.leadDate,
          tap_date: c.leadDate,
          source_sheet: `Meta Form: ${c.formName}`,
          status: 'new_lead',
          notes: `Imported from Meta Lead Form "${c.formName}" (Platform: ${c.source === 'instagram' ? 'Instagram' : 'Facebook'}, Lead ID: ${c.leadId})`,
        })
      } else {
        const updates: Record<string, any> = {}
        if (!existing.city && c.city) updates.city = c.city
        if (!existing.class_year && c.finalQual) updates.class_year = c.finalQual
        if (existing.source !== c.source && c.source) updates.source = c.source
        if (!existing.tap_date) updates.tap_date = c.leadDate
        if (!existing.lead_date) updates.lead_date = c.leadDate
        if (Object.keys(updates).length > 0) {
          await supabase.from('leads').update(updates).eq('id', existing.id)
          updatedCount++
        }
      }
    }

    let imported = 0
    if (toInsert.length > 0) {
      for (let i = 0; i < toInsert.length; i += 50) {
        const chunk = toInsert.slice(i, i + 50)
        const { error: insErr } = await supabase.from('leads').insert(chunk)
        if (!insErr) imported += chunk.length
      }
    }

    const syncTime = new Date().toISOString()
    await supabase
      .from('ad_sync_connections')
      .update({ last_synced_at: syncTime, sync_status: 'active' })
      .eq('id', metaConn.id)

    return {
      success: true,
      imported,
      updated: updatedCount,
      lastSyncedAt: syncTime,
    }
  } catch (err: any) {
    return {
      success: false,
      imported: 0,
      updated: 0,
      error: err.message || 'Unknown error during Meta Ads sync',
    }
  }
}
