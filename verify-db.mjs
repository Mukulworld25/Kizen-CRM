import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'

const supabaseUrl = 'https://zmqvjtenuxlvwfopfroc.supabase.co'
const supabaseKey = 'sb_publishable_ezZ7_UyticpI7aeLKY3Rew_i_FaZBDh'
const supabase = createClient(supabaseUrl, supabaseKey)

const results = []

async function run() {
  // Method 1: Try to use the pg_dump via management API
  // Use the Supabase SQL endpoint directly (available on all projects)
  
  // First, let's try to use a direct SQL query via the management API
  // The management API requires a different endpoint and auth token
  
  // Instead, let's verify by testing access patterns
  results.push('=== TABLE EXISTENCE CHECK (via REST API) ===')
  
  const tables = ['users', 'courses', 'leads', 'students', 'fees', 'follow_ups', 'batches', 'system_settings', 'lead_activities', 'attendance', 'fee_payments', 'installments', 'tasks', 'notifications', 'audit_logs', 'documents']
  
  for (const table of tables) {
    try {
      // Try SELECT count - if table doesn't exist, we get a specific error
      const { error } = await supabase.from(table).select('id', { count: 'exact', head: true })
      if (error) {
        results.push(`${table}: ${error.code === '42P01' ? 'MISSING TABLE' : error.message}`)
      } else {
        results.push(`${table}: EXISTS`)
      }
    } catch (e) {
      results.push(`${table}: ERROR - ${e.message}`)
    }
  }

  // Method 2: Try to use raw SQL via the /rest/v1/rpc/ endpoint
  // If the helper functions exist (get_user_role, is_owner, etc.), we're in good shape
  results.push('\n=== ATTEMPTING DIRECT SQL VIA SUPABASE MANAGEMENT API ===')
  results.push('The Management API requires a PAT token. To verify the full DB state:')
  results.push('1. Go to https://supabase.com/dashboard/project/zmqvjtenuxlvwfopfroc')
  results.push('2. Open SQL Editor')
  results.push('3. Run the verification queries in verify-supabase.sql')
  
  // Write the verification SQL file
  const verifySQL = `-- KIZEN CRM - DATABASE VERIFICATION QUERY
-- Run this in Supabase Dashboard > SQL Editor

-- === 1. Check all tables ===
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- === 2. Check RLS policies ===
SELECT schemaname, tablename, policyname, cmd, permissive
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- === 3. Check tables with RLS enabled but no policies ===
SELECT c.relname FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity = true
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies p 
    WHERE p.schemaname = 'public' AND p.tablename = c.relname
  );

-- === 4. Check triggers ===
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- === 5. Check functions ===
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- === 6. Check sequences ===
SELECT sequence_name FROM information_schema.sequences
WHERE sequence_schema = 'public';

-- === 7. Check stored data ===
SELECT 'courses' as tbl, count(*) as cnt FROM courses
UNION ALL
SELECT 'system_settings', count(*) FROM system_settings;

-- === 8. Check Realtime enabled tables ===
SELECT r.name FROM pg_publication p
JOIN pg_publication_rel pr ON p.oid = pr.prpubid
JOIN pg_class r ON r.oid = pr.prrelid
WHERE p.pubname = 'supabase_realtime';
`
  
  writeFileSync('verify-supabase.sql', verifySQL)
  results.push('\nVerification SQL written to verify-supabase.sql')
  
  writeFileSync('verify-results.txt', results.join('\n'))
  console.log(results.join('\n'))
}

run()