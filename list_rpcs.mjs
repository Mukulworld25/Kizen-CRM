import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bumjiykhgkgmqyynwtuh.supabase.co',
  'sb_publishable_WvTe_Y2WcJay9k3aeDc8sQ_0W2--LjH'
);

await supabase.auth.signInWithPassword({
  email: 'shivam.kizen.test@gmail.com',
  password: 'Shivam@123',
});

// Test exec / query RPCs if any exist
const rpcs = ['exec_sql', 'exec', 'execute_sql', 'run_sql', 'query'];
for (const rpc of rpcs) {
  const { data, error } = await supabase.rpc(rpc, { sql: 'SELECT 1' });
  console.log(`RPC ${rpc}:`, error ? error.message : data);
}
