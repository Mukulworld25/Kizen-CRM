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
  return isNaN(num) ? 0 : num;
}

async function runFeeIngestion() {
  console.log('=== STEP 1: AUTHENTICATING ===');
  await supabase.auth.signInWithPassword({
    email: 'shivam.kizen.test@gmail.com',
    password: 'Shivam@123'
  });
  console.log('Authenticated successfully.');

  const downloadsDir = 'C:\\Users\\admin\\Downloads';
  const feeTrackerPath = path.join(downloadsDir, 'Fees Tracker.xlsx');

  if (!fs.existsSync(feeTrackerPath)) {
    console.error('Fees Tracker.xlsx not found at:', feeTrackerPath);
    process.exit(1);
  }

  const wb = XLSX.readFile(feeTrackerPath);
  console.log(`Loaded Fees Tracker.xlsx with ${wb.SheetNames.length} tabs.`);

  // Get courses
  const { data: courses } = await supabase.from('courses').select('id, name');
  const courseMap = new Map();
  (courses || []).forEach(c => courseMap.set(c.name.toLowerCase(), c.id));

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (!rows || rows.length <= 1) continue;

    let headerIdx = -1;
    let nameCol = -1, phoneCol = -1, totalFeeCol = -1, paidCol = -1, pendingCol = -1;

    for (let i = 0; i < Math.min(5, rows.length); i++) {
      const rowStr = rows[i].map(c => String(c).toLowerCase().trim());
      if (rowStr.some(c => c.includes('name') || c.includes('student') || c.includes('fee'))) {
        headerIdx = i;
        rowStr.forEach((h, colI) => {
          if (h.includes('name') && nameCol === -1) nameCol = colI;
          if (['contact', 'mobile', 'phone'].some(k => h.includes(k)) && phoneCol === -1) phoneCol = colI;
          if (['total', 'fee'].some(k => h.includes(k)) && totalFeeCol === -1) totalFeeCol = colI;
          if (['paid', 'received'].some(k => h.includes(k)) && paidCol === -1) paidCol = colI;
          if (['pending', 'balance', 'due'].some(k => h.includes(k)) && pendingCol === -1) pendingCol = colI;
        });
        break;
      }
    }

    if (nameCol === -1) nameCol = 0;
    if (phoneCol === -1) phoneCol = 1;

    let countInTab = 0;

    for (let i = headerIdx + 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.every(c => String(c).trim() === '')) continue;

      const name = String(r[nameCol] || '').trim();
      const phone = cleanPhone(r[phoneCol]);
      if (!name || name.length < 2 || name.toLowerCase().includes('total') || name.toLowerCase().includes('name')) continue;

      const totalFee = parseAmount(r[totalFeeCol]) || 50000;
      const amountPaid = parseAmount(r[paidCol]) || 0;
      const pendingBalance = parseAmount(r[pendingCol]) || (totalFee - amountPaid);

      // Find or create student
      let studentId = null;
      if (phone) {
        const { data: st } = await supabase.from('students').select('id').eq('mobile', phone).maybeSingle();
        if (st) studentId = st.id;
      }

      if (!studentId) {
        const { data: newSt } = await supabase.from('students').insert({
          full_name: name,
          mobile: phone || '0000000000',
          student_id: `STU-${Math.floor(10000 + Math.random() * 90000)}`,
          admission_date: new Date().toISOString().split('T')[0],
          source_sheet: sheetName.trim()
        }).select('id').single();
        if (newSt) studentId = newSt.id;
      }

      if (studentId) {
        // Upsert fee record with source_sheet
        await supabase.from('fees').insert({
          student_id: studentId,
          total_fee: totalFee,
          amount_paid: amountPaid,
          pending_balance: pendingBalance,
          discount: 0,
          scholarship: 0,
          registration_amount: 0,
          net_fee: totalFee,
          source_sheet: sheetName.trim()
        });
        countInTab++;
      }
    }

    console.log(`Tab '${sheetName.padEnd(15)}' => Ingested ${countInTab} fee records with source_sheet = '${sheetName}'`);
  }

  console.log('\n=== FEE INGESTION COMPLETE ===');
}

runFeeIngestion().catch(console.error);
