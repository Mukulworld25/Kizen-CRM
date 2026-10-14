import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const supabaseUser = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user: callerUser } } = await supabaseUser.auth.getUser()
  if (!callerUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
  }

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('is_owner, role')
    .eq('auth_id', callerUser.id)
    .single()

  if (!profile?.is_owner && profile?.role !== 'owner') {
    return new Response(JSON.stringify({ error: 'Owner only' }), { status: 403, headers: corsHeaders })
  }

  const { count } = await supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('is_active', true)
  if ((count ?? 0) >= 15) {
    return new Response(JSON.stringify({ error: 'Maximum 15 active users reached' }), { status: 400, headers: corsHeaders })
  }

  const { name, email, role, password } = await req.json()
  const cleanEmail = String(email || '').trim().toLowerCase()
  const cleanName = String(name || '').trim()
  const cleanRole = String(role || 'counselor').trim().toLowerCase()

  let targetUser = null

  if (password && password.length >= 6) {
    // Direct account creation with password: confirmed immediately, no email required
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password: password.trim(),
      email_confirm: true,
      user_metadata: { name: cleanName, role: cleanRole },
    })
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders })
    }
    targetUser = data.user
  } else {
    // Email invite
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(cleanEmail, {
      data: { name: cleanName, role: cleanRole },
    })
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders })
    }
    targetUser = data.user
  }

  await supabaseAdmin.from('users').upsert({
    auth_id: targetUser?.id,
    email: cleanEmail,
    name: cleanName,
    role: cleanRole,
    is_active: true,
  }, { onConflict: 'email' })

  return new Response(JSON.stringify({ success: true, user: targetUser }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
