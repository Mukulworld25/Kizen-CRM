import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Institution, InstitutionMeeting, InstitutionFollowUp, InstituteExpense } from '@/types'

export function useInstitutions() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['institutions', profile?.id],
    queryFn: async () => {
      let query = supabase
        .from('institutions')
        .select('*, bdm:users!institutions_assigned_bdm_id_fkey(id, name, email)')
        .order('created_at', { ascending: false })
      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as Institution[]
    },
    enabled: !!profile,
  })
}

export function useInstitution(id: string | undefined) {
  return useQuery({
    queryKey: ['institutions', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('institutions')
        .select('*, bdm:users!institutions_assigned_bdm_id_fkey(id, name, email)')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as Institution
    },
    enabled: !!id,
  })
}

export function useCreateInstitution() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (inst: Partial<Institution>) => {
      const { data, error } = await supabase.from('institutions').insert(inst).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institutions'] })
      toast.success('Institution added')
    },
    onError: (err) => toast.error(err.message),
  })
}

export function useUpdateInstitution() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Institution> & { id: string }) => {
      const { data, error } = await supabase.from('institutions').update(updates).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institutions'] })
      toast.success('Institution updated')
    },
    onError: (err) => toast.error(err.message),
  })
}

export function useDeleteInstitution() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('institutions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institutions'] })
      toast.success('Institution deleted')
    },
    onError: (err) => toast.error(err.message),
  })
}

export function useBdmList() {
  return useQuery({
    queryKey: ['bdm-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email')
        .in('role', ['owner', 'admin', 'bdm'])
        .eq('is_active', true)
      if (error) throw error
      return data ?? []
    },
  })
}

// Institution Meetings
export function useInstitutionMeetings(institutionId: string | undefined) {
  return useQuery({
    queryKey: ['institution-meetings', institutionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('institution_meetings')
        .select('*')
        .eq('institution_id', institutionId!)
        .order('meeting_date', { ascending: false })
      if (error) throw error
      return (data ?? []) as InstitutionMeeting[]
    },
    enabled: !!institutionId,
  })
}

export function useCreateInstitutionMeeting() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (meeting: Partial<InstitutionMeeting>) => {
      const { data, error } = await supabase
        .from('institution_meetings')
        .insert({ ...meeting, created_by: profile?.id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['institution-meetings', vars.institution_id] })
      toast.success('Meeting recorded')
    },
    onError: (err) => toast.error(err.message),
  })
}

// Institution Follow-ups
export function useInstitutionFollowUps(institutionId: string | undefined) {
  return useQuery({
    queryKey: ['institution-followups', institutionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('institution_follow_ups')
        .select('*')
        .eq('institution_id', institutionId!)
        .order('scheduled_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as InstitutionFollowUp[]
    },
    enabled: !!institutionId,
  })
}

export function useCreateInstitutionFollowUp() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (fu: Partial<InstitutionFollowUp>) => {
      const { data, error } = await supabase.from('institution_follow_ups').insert(fu).select().single()
      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['institution-followups', vars.institution_id] })
      toast.success('Follow-up scheduled')
    },
    onError: (err) => toast.error(err.message),
  })
}

export function useCompleteInstitutionFollowUp() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('institution_follow_ups')
        .update({ status: 'completed' })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institution-followups'] })
      toast.success('Follow-up completed')
    },
    onError: (err) => toast.error(err.message),
  })
}

// BDM Dashboard
export function useBdmDashboardStats() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['bdm-dashboard', profile?.id],
    queryFn: async () => {
      const isOwner = profile?.is_owner
      let instQuery = supabase.from('institutions').select('*', { count: 'exact' })
      if (!isOwner) instQuery = instQuery.eq('assigned_bdm_id', profile?.id)

      const { count: totalInstitutions } = await instQuery
      const { count: signedMou } = await supabase
        .from('institutions').select('*', { count: 'exact', head: true })
        .eq('mou_status', 'signed')
      const { count: inDiscussion } = await supabase
        .from('institutions').select('*', { count: 'exact', head: true })
        .eq('mou_status', 'in_discussion')

      let meetingsQuery = supabase.from('institution_meetings').select('*', { count: 'exact', head: true })
      if (!isOwner) {
        meetingsQuery = meetingsQuery
          .filter('institution_id', 'in',
            supabase.from('institutions').select('id').eq('assigned_bdm_id', profile?.id))
      }
      const { count: totalMeetings } = await meetingsQuery

      let fuQuery = supabase.from('institution_follow_ups').select('*', { count: 'exact', head: true }).eq('status', 'pending')
      if (!isOwner) {
        fuQuery = fuQuery.eq('assigned_to', profile?.id)
      }
      const { count: pendingFus } = await fuQuery

      return { totalInstitutions: totalInstitutions ?? 0, signedMou: signedMou ?? 0, inDiscussion: inDiscussion ?? 0, totalMeetings: totalMeetings ?? 0, pendingFus: pendingFus ?? 0 }
    },
    enabled: !!profile,
  })
}

export function useUpcomingInstitutionMeetings() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['upcoming-inst-meetings', profile?.id],
    queryFn: async () => {
      let query = supabase
        .from('institution_meetings')
        .select('*, institution:institutions(id, name)')
        .gte('meeting_date', new Date().toISOString().split('T')[0])
        .order('meeting_date', { ascending: true })
        .limit(10)
      if (!profile?.is_owner) {
        query = query.filter('institution_id', 'in',
          supabase.from('institutions').select('id').eq('assigned_bdm_id', profile?.id))
      }
      const { data, error } = await query
      if (error) throw error
      return data ?? []
    },
    enabled: !!profile,
  })
}

// Institute Expenses
export function useInstituteExpenses() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['institute-expenses', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('institute_expenses')
        .select('*, creator:users!institute_expenses_created_by_fkey(name)')
        .order('expense_date', { ascending: false })
      if (error) throw error
      return (data ?? []) as InstituteExpense[]
    },
    enabled: !!profile,
  })
}

export function useCreateInstituteExpense() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (expense: Partial<InstituteExpense>) => {
      const { data, error } = await supabase
        .from('institute_expenses')
        .insert({ ...expense, created_by: profile?.id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institute-expenses'] })
      toast.success('Expense recorded')
    },
    onError: (err) => toast.error(err.message),
  })
}

export function useDeleteInstituteExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('institute_expenses').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institute-expenses'] })
      toast.success('Expense deleted')
    },
    onError: (err) => toast.error(err.message),
  })
}