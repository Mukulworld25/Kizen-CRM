import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgresql://postgres.zmqvjtenuxlvwfopfroc:Shivam%40123@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

try {
  const res = await pool.query('SELECT current_database(), current_user;');
  console.log('CONNECTED TO ZMQ DB:', res.rows[0]);

  // Create audit_removed_fees table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.audit_removed_fees (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      original_fee_id UUID,
      student_id UUID,
      course_id UUID,
      total_fee NUMERIC,
      discount NUMERIC,
      scholarship NUMERIC,
      registration_amount NUMERIC,
      net_fee NUMERIC,
      amount_paid NUMERIC,
      pending_balance NUMERIC,
      reason TEXT,
      deleted_by UUID,
      deleted_at TIMESTAMPTZ DEFAULT NOW(),
      fee_data JSONB
    );
    ALTER TABLE public.audit_removed_fees DISABLE ROW LEVEL SECURITY;
    GRANT ALL ON public.audit_removed_fees TO authenticated, service_role, anon;
  `);
  console.log('✓ audit_removed_fees table created!');

  // Check function definition
  const funcRes = await pool.query(`SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'delete_fee_with_audit';`);
  console.log('delete_fee_with_audit definition:\n', funcRes.rows[0]?.pg_get_functiondef);

} catch (err) {
  console.error('ZMQ Error:', err);
} finally {
  await pool.end();
}
