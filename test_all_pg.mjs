import pkg from 'pg';
const { Pool } = pkg;

const regions = ['ap-south-1', 'us-east-1', 'us-west-1', 'eu-central-1', 'sa-east-1', 'ap-southeast-1', 'ap-northeast-1'];

for (const reg of regions) {
  const conn = `postgresql://postgres.bumjiykhgkgmqyynwtuh:Shivam%40123@aws-0-${reg}.pooler.supabase.com:6543/postgres`;
  const pool = new Pool({ connectionString: conn, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 3000 });
  try {
    const res = await pool.query('SELECT 1;');
    console.log(`✅ SUCCESS in region ${reg}!`);
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
    await pool.end();
    break;
  } catch (err) {
    console.log(`❌ ${reg}: ${err.message}`);
    await pool.end();
  }
}
