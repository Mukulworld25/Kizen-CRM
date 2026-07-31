import pg from 'pg'
const { Client } = pg

const NEW_DB_URL = 'postgres://postgres:tkrxsGLSiBs6PVls@db.bumjiykhgkgmqyynwtuh.supabase.co:5432/postgres'

async function main() {
  const client = new Client({ connectionString: NEW_DB_URL, ssl: { rejectUnauthorized: false } })
  await client.connect()

  // Clear existing
  await client.query('TRUNCATE auth.identities, auth.users CASCADE;')

  const users = await client.query('SELECT id, name, email, role FROM public.users;')

  for (const u of users.rows) {
    const { id, email } = u
    await client.query(`
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, 
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
        is_sso_user, deleted_at, phone_change, phone_change_token, 
        email_change_token_current, reauthentication_token
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        $1::uuid,
        'authenticated',
        'authenticated',
        $2::text,
        crypt('Shivam@123', gen_salt('bf', 10)),
        NOW(),
        '{"provider":"email","providers":["email"]}',
        '{}',
        NOW(),
        NOW(),
        FALSE,
        NULL,
        '',
        '',
        '',
        ''
      );
    `, [id, email])

    await client.query(`
      INSERT INTO auth.identities (
        id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
      ) VALUES (
        $1::uuid,
        $1::uuid,
        json_build_object('sub', $1::text, 'email', $2::text),
        'email',
        $1::text,
        NOW(),
        NOW(),
        NOW()
      );
    `, [id, email])

    console.log(`  ✅ Auth user & identity created for: ${email}`)
  }

  await client.query('UPDATE public.users SET auth_id = id;')
  console.log('✅ Linked public.users.auth_id = public.users.id')

  await client.end()
  console.log('🎉 Direct Auth Setup Complete!')
}

main().catch(console.error)
