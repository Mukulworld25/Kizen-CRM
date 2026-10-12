import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://bumjiykhgkgmqyynwtuh.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_WvTe_Y2WcJay9k3aeDc8sQ_0W2--LjH';

function normalizePhone(raw) {
  if (!raw) return '';
  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return '';
  if (digits.length === 10) return '+91' + digits;
  if (digits.length === 12 && digits.startsWith('91')) return '+' + digits;
  return digits.startsWith('+') ? digits : '+' + digits;
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

    let imported = 0;
    let updated = 0;

    for (const f of forms) {
      const leadsRes = await fetch(`https://graph.facebook.com/v19.0/${f.id}/leads?fields=id,created_time,field_data,platform,campaign_name&access_token=${token}&limit=100`);
      const leadsData = await leadsRes.json();
      const leads = leadsData.data || [];

      for (const l of leads) {
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

        // Skip test leads
        if (isDummyTestLead(fullName, phone, email)) {
          continue;
        }

        const cleanPhone = normalizePhone(phone);
        const roleSuffix = isStudent ? ' (Student)' : isParent ? ' (Parent)' : '';
        const finalQual = qual || (commerce ? `${commerce}${roleSuffix}` : null);
        const platform = (l.platform || '').toLowerCase();
        const source = (platform === 'ig' || platform === 'instagram') ? 'instagram' : 'facebook';
        const leadDate = l.created_time ? new Date(l.created_time).toISOString() : new Date().toISOString();

        if (fullName && cleanPhone) {
          const { data: existing } = await supabase
            .from('leads')
            .select('id, city, class_year, tap_date, lead_date')
            .eq('mobile', cleanPhone)
            .maybeSingle();

          if (!existing) {
            await supabase.from('leads').insert({
              full_name: fullName,
              mobile: cleanPhone,
              email: email || null,
              source,
              city: city || null,
              class_year: finalQual || null,
              lead_date: leadDate,
              tap_date: leadDate,
              source_sheet: `Meta Form: ${f.name}`,
              status: 'new_lead',
              notes: `Imported from Meta Lead Form "${f.name}" (Platform: ${source === 'instagram' ? 'Instagram' : 'Facebook'}, Lead ID: ${l.id})`
            });
            imported++;
          } else {
            const updates = {};
            if (!existing.city && city) updates.city = city;
            if (!existing.class_year && finalQual) updates.class_year = finalQual;
            if (!existing.tap_date) updates.tap_date = leadDate;
            if (!existing.lead_date) updates.lead_date = leadDate;
            if (Object.keys(updates).length > 0) {
              await supabase.from('leads').update(updates).eq('id', existing.id);
              updated++;
            }
          }
        }
      }
    }

    const nowIso = new Date().toISOString();
    await supabase
      .from('ad_sync_connections')
      .update({ last_synced_at: nowIso, sync_status: 'active' })
      .eq('id', metaConn.id);

    return res.status(200).json({
      success: true,
      message: `Meta daily 9:00 AM IST sync completed successfully. Imported: ${imported}, Updated: ${updated}`,
      imported,
      updated,
      lastSyncedAt: nowIso
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
