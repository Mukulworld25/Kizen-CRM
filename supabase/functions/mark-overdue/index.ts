import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const now = new Date().toISOString()
  const today = new Date().toISOString().split('T')[0]

  const { data: overdueFollowUps } = await supabase
    .from('follow_ups')
    .update({ status: 'overdue' })
    .eq('status', 'pending')
    .lt('scheduled_at', now)
    .select('id, assigned_to, lead_id')

  const { data: overdueInstallments } = await supabase
    .from('installments')
    .update({ status: 'overdue' })
    .eq('status', 'pending')
    .lt('due_date', today)
    .select('id, student_id, assigned_to:student_id')

  for (const fu of overdueFollowUps ?? []) {
    if (fu.assigned_to) {
      await supabase.from('notifications').insert({
        user_id: fu.assigned_to,
        title: 'Follow-up Overdue',
        message: 'A scheduled follow-up is now overdue',
        type: 'follow_up',
        related_id: fu.id,
      })
    }
  }

  return new Response(
    JSON.stringify({
      follow_ups: overdueFollowUps?.length ?? 0,
      installments: overdueInstallments?.length ?? 0,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
