import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bumjiykhgkgmqyynwtuh.supabase.co',
  'sb_publishable_WvTe_Y2WcJay9k3aeDc8sQ_0W2--LjH'
);

// Sign in as owner first if needed
const { error: authErr } = await supabase.auth.signInWithPassword({
  email: 'shivam.kizen.test@gmail.com',
  password: 'Shivam@123',
});

console.log('Auth:', authErr ? authErr.message : 'OK');

// Try calling RPC with a dummy ID to see parameter names / schema
const { data, error } = await supabase.rpc('delete_fee_with_audit', { target_fee_id: '00000000-0000-0000-0000-000000000000' });
console.log('RPC test with target_fee_id:', { data, error });

const { data: data2, error: error2 } = await supabase.rpc('delete_fee_with_audit', { fee_id_to_delete: '00000000-0000-0000-0000-000000000000' });
console.log('RPC test with fee_id_to_delete:', { data: data2, error: error2 });

const { data: data3, error: error3 } = await supabase.rpc('delete_fee_with_audit', { p_fee_id: '00000000-0000-0000-0000-000000000000' });
console.log('RPC test with p_fee_id:', { data: data3, error: error3 });

const { data: data4, error: error4 } = await supabase.rpc('delete_fee_with_audit', { fee_id: '00000000-0000-0000-0000-000000000000' });
console.log('RPC test with fee_id:', { data: data4, error: error4 });
