import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bumjiykhgkgmqyynwtuh.supabase.co',
  'sb_publishable_WvTe_Y2WcJay9k3aeDc8sQ_0W2--LjH'
);

// Sign in as owner
await supabase.auth.signInWithPassword({
  email: 'shivam.kizen.test@gmail.com',
  password: 'Shivam@123',
});

// Fetch one fee record to test
const { data: fees, error: feeErr } = await supabase.from('fees').select('id, student_id, total_fee').limit(1);
console.log('Sample Fee:', fees, feeErr);

if (fees && fees.length > 0) {
  const feeId = fees[0].id;
  console.log('Attempting RPC delete_fee_with_audit for fee:', feeId);
  const { data: rpcRes, error: rpcErr } = await supabase.rpc('delete_fee_with_audit', {
    p_fee_id: feeId,
    p_reason: 'Testing delete_fee_with_audit RPC'
  });
  console.log('RPC Result:', { data: rpcRes, error: rpcErr });
}
