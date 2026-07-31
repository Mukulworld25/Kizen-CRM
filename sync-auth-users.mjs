import pg from 'pg'
const { Client } = pg

const NEW_DB_URL = 'postgres://postgres:tkrxsGLSiBs6PVls@db.bumjiykhgkgmqyynwtuh.supabase.co:5432/postgres'

async function syncAuth() {
  const newClient = new Client({ connectionString: NEW_DB_URL, ssl: { rejectUnauthorized: false } })
  await newClient.connect()

  const getUsers = await newClient.query('SELECT id, email FROM public.users')
  console.log(`Found ${getUsers.rows.length} users in public.users. Creating Auth accounts...`)

  for (const user of getUsers.rows) {
    const { id, email } = user
    try {
      await newClient.query(`
        INSERT INTO auth.users (
          instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, 
          raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
          is_sso_user, deleted_at
        ) VALUES (
          '00000000-0000-0000-0000-000000000000',
          $1::uuid,
          'authenticated',
          'authenticated',
          $2::text,
          crypt('Shivam@123', gen_salt('bf')),
          NOW(),
          '{"provider":"email","providers":["email"]}',
          '{}',
          NOW(),
          NOW(),
          FALSE,
          NULL
        ) ON CONFLICT DO NOTHING;
      `, [id, email])

      await newClient.query(`
        INSERT INTO auth.identities (
          id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
        ) VALUES (
          $1::uuid,
          $2::uuid,
          json_build_object('sub', $2::text, 'email', $3::text),
          'email',
          $2::text,
          NOW(),
          NOW(),
          NOW()
        ) ON CONFLICT DO NOTHING;
      `, [id, id, email])

      console.log(`  ✅ Auth user created for: ${email}`)
    } catch (e) {
      console.error(`  ❌ Error creating auth user ${email}:`, e.message)
    }
  }

  await newClient.query('UPDATE public.users SET auth_id = id WHERE auth_id IS NULL OR auth_id != id;')
  console.log('✅ Synchronized public.users.auth_id = public.users.id')

  await newClient.end()
  console.log('🎉 All Auth Accounts Created and Synced Successfully!')
}

syncAuth().catch(console.error)
