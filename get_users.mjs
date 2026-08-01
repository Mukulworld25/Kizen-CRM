import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bumjiykhgkgmqyynwtuh.supabase.co',
  'sb_publishable_WvTe_Y2WcJay9k3aeDc8sQ_0W2--LjH'
);

const { data, error } = await supabase.from('users').select('id, name, email, role');
console.log('Users error:', error);
console.log('Users:', data);
