import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Lead, LeadFilters, LeadActivity } from '@/types'

export function useLeads(filters: LeadFilters = {}) {
  const { profile } = useAuth()
  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? 25

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
      if (filters.counselorId) query = query.eq('assigned_counselor_id', filters.counselorId)
      if (filters.courseId) query = query.eq('interested_course_id', filters.courseId)
      if (filters.priority) query = query.eq('priority', filters.priority)
      if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom)
      if (filters.dateTo) query = query.lte('created_at', filters.dateTo + 'T23:59:59')
      if (filters.search) {
        query = query.or(`full_name.ilike.%${filters.search}%,mobile.ilike.%${filters.search}%`)
      }

      const { data, error, count } = await query
      if (error) throw error
      return { leads: (data ?? []) as Lead[], total: count ?? 0 }
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
