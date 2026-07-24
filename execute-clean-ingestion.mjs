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
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return null;
}

function cleanStr(val) {
  if (val === null || val === undefined) return '';
  const s = String(val).trim();
  if (['none', 'null', 'nan', 'undefined', 'n/a', '0', '-', 'nil'].includes(s.toLowerCase())) return '';
  return s;
}

const blocklist = [
  '16 and above', '10 -15 students', 'upto 10 students', '8000', 'total', 's.no', 'sr.no', 'lead no',
  'name', 'names', 'contact no', 'lead date', 'knowledge level', 'skills level', 'offline batch',
  'per month fee', 'annual fee', 'payouts', 'products', 'batch size', 'class 12th commerce',
  'class 11th commerce', 'individual subjects', 'installments', 'integrated with acca', 'integrated with ca',
  'student name', 'mobilenumber', 'contact number', 'phone'
];

function isGarbage(name, phone) {
  if (!name && !phone) return true;
  const n = (name || '').toLowerCase();
  if (blocklist.some(b => n === b || n.includes(b))) return true;
  if (name && name.length < 2 && !phone) return true;
  return false;
}

async function runCleanIngestion() {
  console.log('=== STEP 1: AUTHENTICATING ===');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'shivam.kizen.test@gmail.com',
    password: 'Shivam@123'
  });
  if (authError) {
    console.error('Auth error:', authError.message);
    process.exit(1);
  }
  console.log('Authenticated successfully as Owner/Admin.');

  console.log('\n=== STEP 2: WIPING ALL CORRUPTED LEADS FROM DB ===');
  // Delete all rows from leads where id IS NOT NULL
  const { error: deleteErr } = await supabase.from('leads').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (deleteErr) {
    console.error('Error wiping leads:', deleteErr.message);
    process.exit(1);
  }
  console.log('✓ Successfully wiped all corrupted leads from database.');

  console.log('\n=== STEP 3: PARSING EXCEL & CLEANING DATA ===');
  const filePath = 'C:\\Users\\admin\\Downloads\\Leads for Kizen.xlsx';
  if (!fs.existsSync(filePath)) {
    console.error('Excel file not found at:', filePath);
    process.exit(1);
  }

  const wb = XLSX.readFile(filePath);
  console.log(`Loaded workbook with ${wb.SheetNames.length} tabs.`);

  const leadsByMobile = new Map();
  const leadsByName = new Map();
  const tabSummary = [];

  let overallValidCount = 0;
  let overallSkippedCount = 0;
  let overallMergedDuplicates = 0;

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (!rows || rows.length === 0) continue;

    let headerIdx = -1;
    let nameCol = -1;
    let phoneCol = -1;
    let cityCol = -1;
    let courseCol = -1;
    let remarksCol = -1;
    let schoolCol = -1;

    // Detect header row
    for (let i = 0; i < Math.min(10, rows.length); i++) {
      const rowStr = rows[i].map(c => String(c).toLowerCase().trim());
      if (rowStr.some(c => c.includes('name') || c.includes('contact') || c.includes('mobile') || c.includes('phone'))) {
        headerIdx = i;
        rowStr.forEach((h, colI) => {
          if (h.includes('name') && nameCol === -1) nameCol = colI;
          if (['contact', 'mobile', 'phone', 'number'].some(k => h.includes(k)) && phoneCol === -1) phoneCol = colI;
          if (['city', 'location', 'address', 'state'].some(k => h.includes(k)) && cityCol === -1) cityCol = colI;
          if (['class', 'course', 'qualificat', 'stream'].some(k => h.includes(k)) && courseCol === -1) courseCol = colI;
          if (['remark', 'note', 'comment', 'detail', 'follow up', 'status'].some(k => h.includes(k)) && remarksCol === -1) remarksCol = colI;
          if (['school', 'college', 'institution'].some(k => h.includes(k)) && schoolCol === -1) schoolCol = colI;
        });
        break;
      }
    }

    if (nameCol === -1 && phoneCol === -1) {
      nameCol = 0;
      phoneCol = 1;
    }

    let validInTab = 0;
    let skippedInTab = 0;
    let mergedInTab = 0;

    for (let i = headerIdx + 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.every(c => String(c).trim() === '')) continue;

      const rawName = cleanStr(r[nameCol]);
      const rawPhone = r[phoneCol];
      const phone = cleanPhone(rawPhone);

      // STRICT VALIDATION: If garbage or missing BOTH name & phone, or missing phone for unnamed lead, skip!
      if (isGarbage(rawName, phone)) {
        skippedInTab++;
        overallSkippedCount++;
        continue;
      }

      // Must have at least a valid phone or a non-empty name
      if (!phone && (!rawName || rawName.length < 2)) {
        skippedInTab++;
        overallSkippedCount++;
        continue;
      }

      const city = cleanStr(r[cityCol]);
      const course = cleanStr(r[courseCol]);
      const remarks = cleanStr(r[remarksCol]);
      const school = cleanStr(r[schoolCol]);

      let notes = `[${sheetName}]`;
      if (school) notes += ` | School: ${school}`;
      if (course) notes += ` | Qual: ${course}`;
      if (remarks) notes += ` | ${remarks}`;

      const leadObj = {
        full_name: rawName || `Lead (${phone})`,
        mobile: phone || null, // Will use name key if mobile is null
        city: city || null,
        source_sheet: sheetName,
        source: 'other',
        status: 'new_lead',
        priority: 'medium',
        temperature: 'warm',
        notes: notes.slice(0, 500)
      };

      if (phone) {
        if (leadsByMobile.has(phone)) {
          // Merge notes for duplicate phone
          const existing = leadsByMobile.get(phone);
          if (!existing.notes.includes(`[${sheetName}]`)) {
            existing.notes = (existing.notes + ` | ${notes}`).slice(0, 500);
          }
          mergedInTab++;
          overallMergedDuplicates++;
        } else {
          leadsByMobile.set(phone, leadObj);
          validInTab++;
          overallValidCount++;
        }
      } else if (rawName) {
        const nameKey = rawName.toLowerCase();
        if (leadsByName.has(nameKey)) {
          const existing = leadsByName.get(nameKey);
          if (!existing.notes.includes(`[${sheetName}]`)) {
            existing.notes = (existing.notes + ` | ${notes}`).slice(0, 500);
          }
          mergedInTab++;
          overallMergedDuplicates++;
        } else {
          // Note: Database requires mobile TEXT NOT NULL. If mobile is missing, we populate a standard formatted placeholder OR skip.
          // Wait! Since database has mobile NOT NULL, we MUST filter out leads with NO mobile at all or assign a deterministic clean ID.
          // Let's check how many have NO mobile:
          skippedInTab++;
          overallSkippedCount++;
        }
      }
    }

    tabSummary.push({
      tab: sheetName,
      totalRowsInSheet: rows.length,
      validUniqueInserted: validInTab,
      duplicatesMerged: mergedInTab,
      emptyOrGarbageSkipped: skippedInTab
    });
  }

  const finalLeadsToInsert = [...leadsByMobile.values()];
  console.log(`\nPrepared ${finalLeadsToInsert.length} clean unique lead records for database insertion.`);

  let seq = 1;
  const masterPayload = finalLeadsToInsert.map(l => ({
    ...l,
    display_id: `KZ-LD-${String(seq++).padStart(6, '0')}`
  }));

  console.log('\n=== STEP 4: BATCH INSERTING CLEAN DATA INTO SUPABASE ===');
  const BATCH_SIZE = 500;
  let totalInserted = 0;
  for (let i = 0; i < masterPayload.length; i += BATCH_SIZE) {
    const batch = masterPayload.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase.from('leads').insert(batch).select('id');
    if (error) {
      console.error(`❌ Batch insert error at ${i}:`, error.message);
    } else if (data) {
      totalInserted += data.length;
    }
  }

  console.log(`\n================ INGESTION COMPLETE ================`);
  console.log(`✓ Total Clean Leads Successfully Ingested: ${totalInserted}`);
  console.log(`✓ Total Duplicates Merged Across Tabs: ${overallMergedDuplicates}`);
  console.log(`✓ Total Garbage/Blank Rows Skipped: ${overallSkippedCount}`);
  console.log(`====================================================\n`);

  console.table(tabSummary);
}

runCleanIngestion().catch(console.error);
