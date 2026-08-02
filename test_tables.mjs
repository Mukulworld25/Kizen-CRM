import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bumjiykhgkgmqyynwtuh.supabase.co',
  'sb_publishable_WvTe_Y2WcJay9k3aeDc8sQ_0W2--LjH'
);

const res1 = await supabase.from('audit_removed_fees').select('*').limit(5);
console.log('audit_removed_fees select:', res1);

const res2 = await supabase.from('audit_logs').select('*').limit(5);
console.log('audit_logs select:', res2);
