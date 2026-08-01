import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bumjiykhgkgmqyynwtuh.supabase.co',
  'sb_publishable_WvTe_Y2WcJay9k3aeDc8sQ_0W2--LjH'
);

async function testAuth(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  console.log(`Auth result for ${email}:`, error ? `ERROR: ${error.message}` : `SUCCESS (ID: ${data.user?.id})`);
}

await testAuth('counselor1@kizen.edu', 'Shivam@123');
await testAuth('reception@kizen.edu', 'Shivam@123');
await testAuth('shivam.kizen.test@gmail.com', 'Shivam@123');
