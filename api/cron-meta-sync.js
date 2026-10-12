import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://bumjiykhgkgmqyynwtuh.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_WvTe_Y2WcJay9k3aeDc8sQ_0W2--LjH';

function normalizePhone(raw) {
  if (!raw) return { full: '', last10: '' };
  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return { full: '', last10: '' };
  const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
  const full = last10.length === 10 ? '+91' + last10 : '+' + digits;
  return { full, last10 };
}

function isDummyTestLead(fullName, phone, email) {
  const fn = (fullName || '').toLowerCase();
  const ph = (phone || '').toLowerCase();
  const em = (email || '').toLowerCase();
  if (fn.includes('<test lead') || fn.includes('dummy data') || fn.includes('test - ignore')) return true;
  if (ph.includes('<test lead') || ph.includes('dummy data')) return true;
  if (em.includes('@meta.com') && fn.includes('test')) return true;
  return false;
}

export default async function handler(req, res) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    // 1. Authenticate system owner session
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: 'sagedo.test@kizen.edu',
      password: 'Shivam@123'
    });

    if (authErr) {
      return res.status(500).json({ success: false, error: 'Auth failed: ' + authErr.message });
    }

    // 2. Retrieve active Meta connection
    const { data: metaConn, error: connErr } = await supabase
      .from('ad_sync_connections')
      .select('*')
      .eq('platform', 'meta')
      .maybeSingle();

    if (connErr || !metaConn?.access_token) {
      return res.status(200).json({ success: false, message: 'No active Meta connection or access token configured' });
    }

    const token = metaConn.access_token;
    const pageId = metaConn.account_id || '814560305083276';

    // 3. Fetch lead forms
    const formsRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}/leadgen_forms?access_token=${token}&limit=100`);
    const formsData = await formsRes.json();
    const forms = formsData.data || [];

    // 4. Fetch leads from all forms in parallel for sub-5s execution
    const formLeadBatches = await Promise.all(
      forms.map(async (f) => {
        try {
          const leadsRes = await fetch(`https://graph.facebook.com/v19.0/${f.id}/leads?fields=id,created_time,field_data,platform,campaign_name&access_token=${token}&limit=100`);
          const leadsData = await leadsRes.json();
          return { form: f, leads: leadsData.data || [] };
        } catch {
          return { form: f, leads: [] };
        }
      })
    );

    const candidates = [];

    for (const batch of formLeadBatches) {
      const f = batch.form;
      for (const l of batch.leads) {
        const fields = l.field_data || [];
        let fullName = '';
        let phone = '';
        let email = '';
        let city = '';
        let qual = '';
        let isStudent = false;
        let isParent = false;
        let commerce = '';

        for (const fld of fields) {
          const name = (fld.name || '').toLowerCase();
          const val = (Array.isArray(fld.values) ? fld.values[0] : fld.values) || '';
          if (name.includes('full_name') || name.includes('name')) fullName = val;
          else if (name.includes('phone') || name.includes('mobile')) phone = val;
          else if (name.includes('email')) email = val;
          else if (name.includes('city')) city = val;
          else if (name.includes('qualification')) {
            const s = val.toLowerCase();
            if (s.includes('class_12') || s.includes('12th')) qual = 'Class 12 (Commerce + Arts)';
            else if (s.includes('class_11') || s.includes('11th')) qual = 'Class 11 (Commerce)';
            else if (s.includes('b.com') || s.includes('bcom')) qual = 'B.Com';
            else if (s.includes('bba')) qual = 'BBA';
            else qual = val.replace(/_/g, ' ');
          } else if (name.includes('student') || name.includes('parent')) {
            if (val.toLowerCase().includes('student')) isStudent = true;
            if (val.toLowerCase().includes('parent')) isParent = true;
          } else if (name.includes('commerce')) {
            if (val.toLowerCase().includes('yes')) commerce = 'Commerce';
            else if (val.toLowerCase().includes('no')) commerce = 'Non-Commerce';
          }
        }

        // Discard Meta Test tool leads and dummy data
        if (isDummyTestLead(fullName, phone, email)) {
          continue;
        }

        const { full: cleanPhone, last10 } = normalizePhone(phone);
        if (!fullName || !last10) continue;

        const roleSuffix = isStudent ? ' (Student)' : isParent ? ' (Parent)' : '';
        const finalQual = qual || (commerce ? `${commerce}${roleSuffix}` : null);
        const platform = (l.platform || '').toLowerCase();
        const source = (platform === 'ig' || platform === 'instagram') ? 'instagram' : 'facebook';
        const leadDate = l.created_time ? new Date(l.created_time).toISOString() : new Date().toISOString();

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
          leadId: l.id
        });
      }
    }

    // Deduplicate candidates in memory by 10-digit phone
    const uniqueCandidates = new Map();
    for (const c of candidates) {
      if (!uniqueCandidates.has(c.last10)) {
        uniqueCandidates.set(c.last10, c);
      }
    }

    // Prepare phone patterns for database check (both with +91 and 10 digits)
    const phoneQuerySet = new Set();
    for (const c of uniqueCandidates.values()) {
      phoneQuerySet.add(c.cleanPhone);
      phoneQuerySet.add(c.last10);
    }

    const phoneQueryArray = Array.from(phoneQuerySet);
    const { data: existingList, error: qErr } = await supabase
      .from('leads')
      .select('id, mobile, city, class_year, tap_date, lead_date')
      .in('mobile', phoneQueryArray);

    if (qErr) throw qErr;

    const existingMap = new Map();
    for (const row of existingList || []) {
      existingMap.set(row.mobile, row);
      const row10 = (row.mobile || '').replace(/[^0-9]/g, '').slice(-10);
      if (row10) existingMap.set(row10, row);
    }

    const toInsert = [];
    let updatedCount = 0;

    for (const c of uniqueCandidates.values()) {
      const existing = existingMap.get(c.cleanPhone) || existingMap.get(c.last10);

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
          notes: `Imported from Meta Lead Form "${c.formName}" (Platform: ${c.source === 'instagram' ? 'Instagram' : 'Facebook'}, Lead ID: ${c.leadId})`
        });
      } else {
        const updates = {};
        if (!existing.city && c.city) updates.city = c.city;
        if (!existing.class_year && c.finalQual) updates.class_year = c.finalQual;
        if (!existing.tap_date) updates.tap_date = c.leadDate;
        if (!existing.lead_date) updates.lead_date = c.leadDate;
        if (Object.keys(updates).length > 0) {
          await supabase.from('leads').update(updates).eq('id', existing.id);
          updatedCount++;
        }
      }
    }

    let imported = 0;
    if (toInsert.length > 0) {
      // Insert in chunks of 50
      for (let i = 0; i < toInsert.length; i += 50) {
        const chunk = toInsert.slice(i, i + 50);
        const { error: insErr } = await supabase.from('leads').insert(chunk);
        if (!insErr) imported += chunk.length;
      }
    }

    const nowIso = new Date().toISOString();
    await supabase
      .from('ad_sync_connections')
      .update({ last_synced_at: nowIso, sync_status: 'active' })
      .eq('id', metaConn.id);

    return res.status(200).json({
      success: true,
      message: `Meta daily 9:00 AM IST sync completed successfully. Imported: ${imported}, Updated: ${updatedCount}`,
      imported,
      updated: updatedCount,
      lastSyncedAt: nowIso
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
