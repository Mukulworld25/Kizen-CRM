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

  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
  }

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('is_owner, role')
    .eq('auth_id', user.id)
    .single()

  if (!profile?.is_owner && profile?.role !== 'owner') {
    return new Response(JSON.stringify({ error: 'Owner only' }), { status: 403, headers: corsHeaders })
  }

  const { count } = await supabaseAdmin.from('users').select('*', { count: 'exact', head: true })
  if ((count ?? 0) >= 15) {
    return new Response(JSON.stringify({ error: 'Maximum 15 users reached' }), { status: 400, headers: corsHeaders })
  }

  const { name, email, role } = await req.json()

  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: { name, role },
  })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders })
  }

  await supabaseAdmin.from('users').upsert({
    auth_id: data.user?.id,
    email,
    name,
    role,
    is_active: true,
  }, { onConflict: 'email' })

  return new Response(JSON.stringify({ success: true, user: data.user }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
