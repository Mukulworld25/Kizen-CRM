-- KIZEN CRM - DATABASE VERIFICATION QUERY
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
