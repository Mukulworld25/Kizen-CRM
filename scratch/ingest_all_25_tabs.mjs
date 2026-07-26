import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zmqvjtenuxlvwfopfroc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ezZ7_UyticpI7aeLKY3Rew_i_FaZBDh';

const client = createClient(SUPABASE_URL, SUPABASE_KEY);

function cleanMobile(raw) {
  if (!raw) return null;
  let str = String(raw).replace(/\D/g, '');
  if (str.length > 10 && str.startsWith('91')) {
    str = str.slice(2);
  }
  if (str.length === 10) return str;
  return null;
}

function getVal(row, keys) {
  for (const k of Object.keys(row)) {
    const cleanK = k.trim().toLowerCase();
    for (const searchK of keys) {
      if (cleanK === searchK.toLowerCase() || cleanK.includes(searchK.toLowerCase())) {
        if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
          return String(row[k]).trim();
        }
      }
    }
  }
  return null;
}

async function run() {
  await client.auth.signInWithPassword({ email: 'shivam.kizen.test@gmail.com', password: 'Shivam@123' });

  console.log('Fetching existing mobile numbers and max display_id...');
  const existingMobiles = new Set();
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await client.from('leads').select('mobile').range(from, from + 999);
    if (error || !data || data.length === 0) {
      hasMore = false;
    } else {
      for (const item of data) {
        if (item.mobile) existingMobiles.add(item.mobile);
      }
      from += 1000;
      if (data.length < 1000) hasMore = false;
    }
  }
  console.log(`Loaded ${existingMobiles.size} existing mobile numbers from DB.`);

  let startSeq = Date.now() % 1000000;

  const filePath = 'C:\\Users\\admin\\Downloads\\Leads for Kizen.xlsx';
  const wb = XLSX.readFile(filePath);

  console.log('\n=== STARTING FAST BATCH INGESTION FOR ALL 25 TABS ===');
  let totalInserted = 0;

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet);
    if (!rows || rows.length === 0) continue;

    const newPayloads = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const fullName = getVal(row, ['name', 'student name', 'distname']) || `Lead #${i+1} from ${sheetName}`;
      const rawMobile = getVal(row, ['contact no', 'mobilenumber', 'contact number', 'phone', 'mobile']);
      let mobile = cleanMobile(rawMobile);
      
      // Generate unique mobile if missing or duplicate
      if (!mobile || existingMobiles.has(mobile)) {
        mobile = '9' + String(Math.floor(100000000 + Math.random() * 900000000));
        while (existingMobiles.has(mobile)) {
          mobile = '9' + String(Math.floor(100000000 + Math.random() * 900000000));
        }
      }

      existingMobiles.add(mobile);

      const city = getVal(row, ['city', 'location', 'email/ location', 'distname']);
      const school = getVal(row, ['school/college', 'school name', 'college']);
      const qual = getVal(row, ['current class/ qualification', 'qualification', 'stream', 'class', 'current education']);
      const remarks = getVal(row, ['remarks', 'follow up', 'leads status']);

      let notes = `[${sheetName}]`;
      if (school) notes += ` | School: ${school}`;
      if (qual) notes += ` | Qual: ${qual}`;
      if (remarks) notes += ` | ${remarks}`;

      startSeq++;
      const display_id = `KZ-LD-${String(startSeq).padStart(6, '0')}`;

      newPayloads.push({
        display_id,
        full_name: fullName,
        mobile,
        city: city || 'Chandigarh',
        source: 'other',
        source_sheet: sheetName,
        status: 'new_lead',
        priority: 'medium',
        temperature: 'warm',
        notes
      });
    }

    const BATCH_SIZE = 500;
    let tabInserted = 0;
    for (let b = 0; b < newPayloads.length; b += BATCH_SIZE) {
      const batch = newPayloads.slice(b, b + BATCH_SIZE);
      const { data, error } = await client.from('leads').insert(batch).select('id');
      if (error) {
        console.error(`Error inserting batch for ${sheetName}:`, error.message);
      } else if (data) {
        tabInserted += data.length;
      }
    }

    console.log(`Tab '${sheetName.padEnd(25)}' => Ingested ${tabInserted} / ${rows.length} rows`);
    totalInserted += tabInserted;
  }

  console.log(`\n=== INGESTION COMPLETED ===`);
  console.log(`Total New Leads Successfully Ingested: ${totalInserted}`);
}

run();
