import pg from 'pg';
const { Client } = pg;

export default async function handler(req, res) {
  const CRM_DB_URL = process.env.DATABASE_URL || 'postgres://postgres:tkrxsGLSiBs6PVls@db.bumjiykhgkgmqyynwtuh.supabase.co:5432/postgres';
  const client = new Client({ connectionString: CRM_DB_URL, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();

    // 1. Get Meta connection
    const connRes = await client.query("SELECT * FROM ad_sync_connections WHERE platform = 'meta' AND is_active = true LIMIT 1;");
    if (connRes.rowCount === 0 || !connRes.rows[0].access_token) {
      await client.end();
      return res.status(200).json({ success: false, message: 'No active Meta connection or access token configured' });
    }

    const metaConn = connRes.rows[0];
    const token = metaConn.access_token;
    const pageId = metaConn.account_id || '814560305083276';

    // 2. Fetch forms
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

        // Test Lead Filter
        const fn = fullName.toLowerCase();
        const ph = phone.toLowerCase();
        if (fn.includes('<test lead') || fn.includes('dummy data') || fn.includes('test - ignore') || ph.includes('<test lead')) {
          continue;
        }

        let cleanPhone = phone.replace(/[^0-9]/g, '');
        if (cleanPhone.length === 10) cleanPhone = '+91' + cleanPhone;
        else if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) cleanPhone = '+' + cleanPhone;
        else if (!cleanPhone.startsWith('+')) cleanPhone = '+' + cleanPhone;

        const roleSuffix = isStudent ? ' (Student)' : isParent ? ' (Parent)' : '';
        const finalQual = qual || (commerce ? `${commerce}${roleSuffix}` : null);
        const platform = (l.platform || '').toLowerCase();
        const source = (platform === 'ig' || platform === 'instagram') ? 'instagram' : 'facebook';
        const leadDate = l.created_time ? new Date(l.created_time).toISOString() : new Date().toISOString();

        if (fullName && cleanPhone) {
          const existingRes = await client.query('SELECT id, city, class_year, tap_date, lead_date FROM leads WHERE mobile = $1 LIMIT 1;', [cleanPhone]);
          if (existingRes.rowCount === 0) {
            await client.query(`
              INSERT INTO leads (full_name, mobile, email, source, city, class_year, lead_date, tap_date, source_sheet, status, notes)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);
            `, [
              fullName,
              cleanPhone,
              email || null,
              source,
              city || null,
              finalQual || null,
              leadDate,
              leadDate,
              `Meta Form: ${f.name}`,
              'new_lead',
              `Imported from Meta Lead Form "${f.name}" (Platform: ${source === 'instagram' ? 'Instagram' : 'Facebook'}, Lead ID: ${l.id})`
            ]);
            imported++;
          } else {
            const row = existingRes.rows[0];
            const updates = [];
            const vals = [];
            let idx = 1;
            if (!row.city && city) { updates.push(`city = $${idx++}`); vals.push(city); }
            if (!row.class_year && finalQual) { updates.push(`class_year = $${idx++}`); vals.push(finalQual); }
            if (!row.tap_date) { updates.push(`tap_date = $${idx++}`); vals.push(leadDate); }
            if (!row.lead_date) { updates.push(`lead_date = $${idx++}`); vals.push(leadDate); }
            if (updates.length > 0) {
              vals.push(row.id);
              await client.query(`UPDATE leads SET ${updates.join(', ')} WHERE id = $${idx};`, vals);
              updated++;
            }
          }
        }
      }
    }

    const nowIso = new Date().toISOString();
    await client.query('UPDATE ad_sync_connections SET last_synced_at = $1, sync_status = $2 WHERE id = $3;', [nowIso, 'active', metaConn.id]);
    await client.end();

    return res.status(200).json({
      success: true,
      message: `Meta sync completed successfully. Imported: ${imported}, Updated: ${updated}`,
      imported,
      updated,
      lastSyncedAt: nowIso
    });
  } catch (err) {
    if (client) await client.end().catch(() => {});
    return res.status(500).json({ success: false, error: err.message });
  }
}
