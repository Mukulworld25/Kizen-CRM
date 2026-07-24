import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Lead, LeadFilters, LeadActivity } from '@/types'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string

export function useLeads(filters: LeadFilters = {}) {
  const { profile } = useAuth()
  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? 15

  return useQuery({
    queryKey: ['leads', filters, profile?.id],
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select('*, course:courses(*), counselor:users!leads_assigned_counselor_id_fkey(id, name)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)

      if (filters.status) query = query.eq('status', filters.status)
      if (filters.source) query = query.eq('source', filters.source)
      if (filters.sheetSource) {
        let term = filters.sheetSource
        if (term === 'ACCA (April)' || term === 'ACCA SL') term = 'ACCA'
        else if (term.includes('NEW ACCA')) term = 'PAN IND'
        query = query.or(`source_sheet.ilike.${term},notes.ilike.%[${term}]%`)
      }
      if (filters.city) query = query.ilike('city', `%${filters.city}%`)
      if (filters.counselorId) query = query.eq('assigned_counselor_id', filters.counselorId)
      if (filters.courseId) query = query.eq('interested_course_id', filters.courseId)
      if (filters.priority) query = query.eq('priority', filters.priority)
      if (filters.temperature) query = query.eq('temperature', filters.temperature)
      if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom)
      if (filters.dateTo) query = query.lte('created_at', filters.dateTo + 'T23:59:59')
      if (filters.search) {
        query = query.or(`full_name.ilike.%${filters.search}%,mobile.ilike.%${filters.search}%,city.ilike.%${filters.search}%`)
      }

      const { data, error, count } = await query
      if (error) throw error

      const now = new Date().getTime()
      const leads = ((data ?? []) as Lead[]).map((lead) => {
        const createdAtTime = new Date(lead.created_at).getTime()
        const diffHours = (now - createdAtTime) / (1000 * 60 * 60)

        let flag_color: 'red' | 'yellow' | null = null
        let flag_reason: string | null = null

        if ((lead.status === 'new_lead' || lead.status === 'follow_up') && diffHours > 48) {
          flag_color = 'red'
          flag_reason = `Uncontacted / Pinned >48 hours (${Math.round(diffHours)}h ago)`
        } else if (lead.status === 'lost') {
          flag_color = 'red'
          flag_reason = 'Cold Lead Pool / High Risk'
        } else if (lead.status === 'follow_up' || lead.status === 'demo_booked') {
          flag_color = 'yellow'
          flag_reason = 'Follow-up / Demo Scheduled'
        }

        return { ...lead, flag_color, flag_reason }
      })

      return { leads, total: count ?? 0 }
    },
    enabled: !!profile,
  })
}

export function useLead(id: string | undefined) {
  return useQuery({
    queryKey: ['leads', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*, course:courses(*), counselor:users!leads_assigned_counselor_id_fkey(id, name, email)')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as Lead
    },
    enabled: !!id,
  })
}

export function useLeadActivities(leadId: string | undefined) {
  return useQuery({
    queryKey: ['lead-activities', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_activities')
        .select('*, creator:users!lead_activities_created_by_fkey(name)')
        .eq('lead_id', leadId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as LeadActivity[]
    },
    enabled: !!leadId,
  })
}

export function useGenerateSummary() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ activityId, note }: { activityId: string; note: string }) => {
      const funcUrl = `${SUPABASE_URL}/functions/v1/ai-summary`
      const { data: session } = await supabase.auth.getSession()
      const token = session?.session?.access_token
      if (!token) throw new Error('Not authenticated')

      const res = await fetch(funcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ note }),
      })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(err)
      }
      const { summary } = await res.json()

      const { error } = await supabase
        .from('lead_activities')
        .update({ ai_summary: summary })
        .eq('id', activityId)
      if (error) throw error

      return summary
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-activities'] })
      toast.success('AI summary generated')
    },
    onError: (err) => toast.error(err.message),
  })
}

export function useCreateLead() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async (lead: Partial<Lead>) => {
      const { data, error } = await supabase
        .from('leads')
        .insert({ ...lead, created_by: profile?.id })
        .select()
        .single()
      if (error) throw error

      await supabase.from('audit_logs').insert({
        user_id: profile?.id,
        action: 'create_lead',
        entity_type: 'lead',
        entity_id: data.id,
        new_data: data,
      })

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      toast.success('Lead added successfully')
    },
    onError: (err) => toast.error(err.message),
  })
}

export function useUpdateLead() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Lead> & { id: string }) => {
      const { data, error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error

      await supabase.from('audit_logs').insert({
        user_id: profile?.id,
        action: 'update_lead',
        entity_type: 'lead',
        entity_id: id,
        new_data: updates,
      })

      return data
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['leads', vars.id] })
      toast.success('Lead updated')
    },
    onError: (err) => toast.error(err.message),
  })
}

export function useDeleteLead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('leads').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      toast.success('Lead deleted')
    },
    onError: (err) => toast.error(err.message),
  })
}

export function useAddActivity() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async (activity: Partial<LeadActivity>) => {
      const { data, error } = await supabase
        .from('lead_activities')
        .insert({ ...activity, created_by: profile?.id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['lead-activities', vars.lead_id] })
      toast.success('Activity added')
    },
    onError: (err) => toast.error(err.message),
  })
}

export function useUpdateLeadScore() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('compute_lead_scores')
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      toast.success('Lead scores updated')
    },
    onError: (err) => toast.error(err.message),
  })
}

export function useCounselors() {
  return useQuery({
    queryKey: ['counselors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email')
        .in('role', ['owner', 'admin', 'counselor'])
        .eq('is_active', true)
      if (error) throw error
      return data ?? []
    },
  })
}

export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('courses').select('*').eq('is_active', true)
      if (error) throw error
      return data ?? []
    },
  })
}
