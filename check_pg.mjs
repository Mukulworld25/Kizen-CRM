import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgresql://postgres.bumjiykhgkgmqyynwtuh:Shivam%40123@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

try {
  const res = await pool.query(`SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'delete_fee_with_audit';`);
  console.log('Function def:\n', res.rows[0]?.pg_get_functiondef);

  // Check if audit_removed_fees table exists
  const tabRes = await pool.query(`SELECT to_regclass('public.audit_removed_fees');`);
  console.log('Table check:', tabRes.rows[0]);

  if (!tabRes.rows[0].to_regclass) {
    console.log('Creating audit_removed_fees table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.audit_removed_fees (
        id UUID PRIMARY KEY DEFAULT gen_random_path(),
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
    console.log('audit_removed_fees table created successfully!');
  }
} catch (err) {
  console.error('PG Error:', err);
} finally {
  await pool.end();
}
