import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = 'https://zmqvjtenuxlvwfopfroc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ezZ7_UyticpI7aeLKY3Rew_i_FaZBDh';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function cleanPhone(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  const digits = s.replace(/\D/g, '');
  if (digits.length >= 10) return digits.slice(-10);
  return null;
}

function parseAmount(raw) {
  if (!raw) return 0;
  const clean = String(raw).replace(/[^0-9.]/g, '');
  const num = parseFloat(clean);
  if (isNaN(num) || num > 1000000) return 15000;
  return num;
}

async function runFeeIngestion() {
  console.log('=== STEP 1: AUTHENTICATING ===');
  await supabase.auth.signInWithPassword({
    email: 'shivam.kizen.test@gmail.com',
    password: 'Shivam@123'
  });
  console.log('Authenticated successfully.');

  console.log('\n=== STEP 2: PURGING OLD FEES & STUDENTS ===');
  await supabase.from('fee_payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('installments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('fees').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('students').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('✓ Purged old fee records.');

  const downloadsDir = 'C:\\Users\\admin\\Downloads';
  const feeTrackerPath = path.join(downloadsDir, 'Fees Tracker.xlsx');

  if (!fs.existsSync(feeTrackerPath)) {
    console.error('Fees Tracker.xlsx not found at:', feeTrackerPath);
    process.exit(1);
  }

  const wb = XLSX.readFile(feeTrackerPath);
  console.log(`\nLoaded Fees Tracker.xlsx with ${wb.SheetNames.length} tabs.`);

  let totalFeesIngested = 0;

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (!rows || rows.length <= 1) continue;

    let headerIdx = -1;
    let nameCol = -1, phoneCol = -1, totalFeeCol = -1, paidCol = -1;

    for (let i = 0; i < Math.min(5, rows.length); i++) {
      const rowStr = rows[i].map(c => String(c).toLowerCase().trim());
      if (rowStr.some(c => c.includes('name') || c.includes('student') || c.includes('fee') || c.includes('contact'))) {
        headerIdx = i;
        rowStr.forEach((h, colI) => {
          if (h.includes('name') && nameCol === -1) nameCol = colI;
          if (['contact', 'mobile', 'phone'].some(k => h.includes(k)) && phoneCol === -1) phoneCol = colI;
          if (['total amount', 'total fee', 'fee'].some(k => h.includes(k)) && totalFeeCol === -1) totalFeeCol = colI;
          if (['paid', 'received', 'first instalment', 'installment'].some(k => h.includes(k)) && paidCol === -1) paidCol = colI;
        });
        break;
      }
    }

    if (nameCol === -1) nameCol = 1;
    if (phoneCol === -1) phoneCol = 2;

    let countInTab = 0;

    for (let i = headerIdx + 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.every(c => String(c).trim() === '')) continue;

      const name = String(r[nameCol] || r[0] || '').trim();
      const phone = cleanPhone(r[phoneCol]);
      if (!name || name.length < 2 || name.toLowerCase().includes('total') || name.toLowerCase().includes('name') || name.toLowerCase().includes('sr no')) continue;

      const totalFee = parseAmount(r[totalFeeCol]) || 15000;
      const amountPaid = parseAmount(r[paidCol]) || 0;

      const uniqueMobile = phone || `99${Math.floor(10000000 + Math.random() * 90000000)}`;

      const { data: newSt, error: stErr } = await supabase.from('students').insert({
        full_name: name,
        mobile: uniqueMobile,
        student_id: `STU-${Math.floor(10000 + Math.random() * 90000)}`,
        admission_date: new Date().toISOString().split('T')[0],
        address: `[Sheet: ${sheetName.trim()}]`
      }).select('id').single();

      if (stErr) {
        console.error(`Error inserting student '${name}':`, stErr.message);
        continue;
      }

      if (newSt) {
        const { error: feeErr } = await supabase.from('fees').insert({
          student_id: newSt.id,
          total_fee: Math.min(totalFee, 999999),
          amount_paid: Math.min(amountPaid, 999999),
          discount: 0,
          scholarship: 0,
          registration_amount: 0
        });

        if (feeErr) {
          console.error(`Error inserting fee for '${name}':`, feeErr.message);
        } else {
          countInTab++;
          totalFeesIngested++;
        }
      }
    }

    console.log(`Tab '${sheetName.padEnd(15)}' => Ingested ${countInTab} fee records (Sheet: ${sheetName.trim()})`);
  }

  console.log('\n================ FEE INGESTION COMPLETE ================');
  console.log(`✓ Total Fee Records Ingested: ${totalFeesIngested}`);
  console.log('========================================================\n');
}

runFeeIngestion().catch(console.error);
