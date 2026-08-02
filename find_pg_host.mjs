import pkg from 'pg';
const { Pool } = pkg;

const hosts = [
  'postgresql://postgres.bumjiykhgkgmqyynwtuh:Shivam%40123@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
  'postgresql://postgres.bumjiykhgkgmqyynwtuh:Shivam%40123@aws-0-ap-south-1.pooler.supabase.com:5432/postgres',
  'postgresql://postgres.bumjiykhgkgmqyynwtuh:Shivam%40123@aws-0-us-east-1.pooler.supabase.com:6543/postgres',
  'postgresql://postgres.bumjiykhgkgmqyynwtuh:Shivam%40123@aws-0-eu-central-1.pooler.supabase.com:6543/postgres',
  'postgresql://postgres:Shivam%40123@db.bumjiykhgkgmqyynwtuh.supabase.co:5432/postgres',
];

for (const conn of hosts) {
  console.log('Testing connection:', conn);
  const pool = new Pool({ connectionString: conn, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 5000 });
  try {
    const res = await pool.query('SELECT current_database();');
    console.log('SUCCESS! Connected:', res.rows[0]);
    
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
    console.log('Successfully ensured audit_removed_fees table!');
    await pool.end();
    break;
  } catch (err) {
    console.log('FAILED:', err.message);
    await pool.end();
  }
}
