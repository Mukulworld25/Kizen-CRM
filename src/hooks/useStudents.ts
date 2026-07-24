import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { FollowUp, Student, Fee, FeePayment, Installment, InstituteExpense, Batch } from '@/types'

export function useFollowUps(tab: string, counselorId?: string, targetDate?: string) {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['follow-ups', tab, counselorId, targetDate, profile?.id],
    queryFn: async () => {
      let query = supabase
        .from('follow_ups')
        .select('*, lead:leads(id, full_name, mobile, interested_course_id, course:courses(name)), assignee:users!follow_ups_assigned_to_fkey(name)')
        .order('scheduled_at', { ascending: true })

      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString()

      if (targetDate) {
        const selected = new Date(targetDate)
        const dStart = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate()).toISOString()
        const dEnd = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate(), 23, 59, 59).toISOString()
        query = query.gte('scheduled_at', dStart).lte('scheduled_at', dEnd)
      } else if (tab === 'today') {
        query = query.gte('scheduled_at', todayStart).lte('scheduled_at', todayEnd).neq('status', 'completed')
      } else if (tab === 'overdue') {
        query = query.eq('status', 'overdue')
      } else if (tab === 'upcoming') {
        query = query.gt('scheduled_at', todayEnd).eq('status', 'pending')
      }

      if (counselorId) query = query.eq('assigned_to', counselorId)

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as FollowUp[]
    },
    enabled: !!profile,
  })
}

export function useOverdueCount() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['follow-ups-overdue-count', profile?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('follow_ups')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'overdue')
      if (error) throw error
      return count ?? 0
    },
    enabled: !!profile,
  })
}

export function useCompleteFollowUp() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('follow_ups')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-ups'] })
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      toast.success('Follow-up marked complete')
    },
    onError: (err) => toast.error(err.message),
  })
}

export function useCreateFollowUp() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async (followUp: Partial<FollowUp>) => {
      const { data, error } = await supabase
        .from('follow_ups')
        .insert({ ...followUp, created_by: profile?.id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-ups'] })
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      toast.success('Follow-up scheduled')
    },
    onError: (err) => toast.error(err.message),
  })
}

export function useRescheduleFollowUp() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, scheduledAt, notes }: { id: string; scheduledAt: string; notes?: string }) => {
      const payload: Record<string, any> = { scheduled_at: scheduledAt, status: 'pending' }
      if (notes !== undefined) payload.notes = notes
      const { error } = await supabase
        .from('follow_ups')
        .update(payload)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-ups'] })
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      toast.success('Follow-up rescheduled successfully')
    },
    onError: (err) => toast.error(err.message),
  })
}

export function useStudents(filters: { courseId?: string; batchId?: string; search?: string } = {}) {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['students', filters, profile?.id],
    queryFn: async () => {
      let query = supabase
        .from('students')
        .select('*, course:courses(name), batch:batches(batch_name)')
        .order('created_at', { ascending: false })

      if (filters.courseId) query = query.eq('course_id', filters.courseId)
      if (filters.batchId) query = query.eq('batch_id', filters.batchId)
      if (filters.search) {
        query = query.or(`full_name.ilike.%${filters.search}%,student_id.ilike.%${filters.search}%,mobile.ilike.%${filters.search}%`)
      }

      const { data, error } = await query
      if (error) throw error
      const students = ((data ?? []) as Student[]).map((s) => {
        let flag_color: 'red' | 'yellow' | null = null
        let flag_reason: string | null = null
        if (!s.is_active || s.certification_status === 'not_started') {
          flag_color = 'red'
          flag_reason = 'Certification Not Started / Inactive Status'
        } else if (s.certification_status === 'in_progress') {
          flag_color = 'yellow'
          flag_reason = 'Certification In Progress'
        }
        return { ...s, flag_color, flag_reason }
      })
      return students
    },
    enabled: !!profile,
  })
}

export function useStudent(id: string | undefined) {
  return useQuery({
    queryKey: ['students', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*, course:courses(*), batch:batches(*, faculty:users(*)), lead:leads(*)')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as Student
    },
    enabled: !!id,
  })
}

export function useCreateStudent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (student: Partial<Student>) => {
      const { data, error } = await supabase.from('students').insert(student).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
      toast.success('Student created')
    },
    onError: (err) => toast.error(err.message),
  })
}

export function useFees(filters: { overdue?: boolean; courseId?: string; courseLevel?: string; paymentStatus?: string; counselorId?: string } = {}) {
  const { profile, can } = useAuth()

  return useQuery({
    queryKey: ['fees', filters, profile?.id],
    queryFn: async () => {
      let query = supabase
        .from('fees')
        .select('*, student:students(full_name, student_id, mobile), course:courses(name)')
        .order('created_at', { ascending: false })

      if (filters.courseId) query = query.eq('course_id', filters.courseId)

      const { data, error } = await query
      if (error) throw error

      let rawFees = (data ?? []) as Fee[]
      if (filters.overdue) {
        rawFees = rawFees.filter((f) => f.pending_balance > 0)
      }

      if (filters.courseLevel && filters.courseLevel !== 'all') {
        rawFees = rawFees.filter((f) => {
          const cName = (f.course?.name || '').toLowerCase()
          const sheet = ((f as any).source_sheet || '').toLowerCase()
          const level = filters.courseLevel!.toLowerCase()
          if (sheet && (sheet === level || sheet.includes(level))) return true
          if (level === 'acca kl') return cName.includes('knowledge') || cName.includes('kl') || sheet.includes('kl')
          if (level === 'acca sl') return cName.includes('skill') || cName.includes('sl') || sheet.includes('sl')
          if (level === 'acca pl') return cName.includes('professional') || cName.includes('pl') || sheet.includes('pl')
          if (level === 'fia') return cName.includes('fia') || sheet.includes('fia')
          if (level === '11th & 12th') return cName.includes('11') || cName.includes('12') || sheet.includes('11')
          if (level === 'b.com') return cName.includes('b.com') || cName.includes('bba') || sheet.includes('b.com')
          return false
        })
      }

      if (filters.paymentStatus) {
        if (filters.paymentStatus === 'paid') rawFees = rawFees.filter((f) => f.pending_balance <= 0)
        if (filters.paymentStatus === 'pending') rawFees = rawFees.filter((f) => f.pending_balance > 0)
        if (filters.paymentStatus === 'overdue') rawFees = rawFees.filter((f) => f.pending_balance > 50000)
      }

      const fees = rawFees.map((f) => {
        let flag_color: 'red' | 'yellow' | null = null
        let flag_reason: string | null = null
        if (f.pending_balance > 50000) {
          flag_color = 'red'
          flag_reason = `High Outstanding Balance (₹${f.pending_balance.toLocaleString()})`
        } else if (f.pending_balance > 0) {
          flag_color = 'yellow'
          flag_reason = `Installment Balance Pending (₹${f.pending_balance.toLocaleString()})`
        }
        return { ...f, flag_color, flag_reason }
      })

      return fees
    },
    enabled: !!profile && can('viewFees'),
  })
}

export function useFee(id: string | undefined) {
  return useQuery({
    queryKey: ['fees', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fees')
        .select('*, student:students(*), course:courses(*)')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as Fee
    },
    enabled: !!id,
  })
}

export function useFeePayments(feeId: string | undefined) {
  return useQuery({
    queryKey: ['fee-payments', feeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fee_payments')
        .select('*')
        .eq('fee_id', feeId!)
        .order('payment_date', { ascending: false })
      if (error) throw error
      return (data ?? []) as FeePayment[]
    },
    enabled: !!feeId,
  })
}

export function useInstallments(feeId: string | undefined) {
  return useQuery({
    queryKey: ['installments', feeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('installments')
        .select('*')
        .eq('fee_id', feeId!)
        .order('installment_number')
      if (error) throw error
      return (data ?? []) as Installment[]
    },
    enabled: !!feeId,
  })
}

export function useRecordPayment() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async (payment: Partial<FeePayment>) => {
      const { data, error } = await supabase
        .from('fee_payments')
        .insert({ ...payment, recorded_by: profile?.id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['fees'] })
      queryClient.invalidateQueries({ queryKey: ['fee-payments', vars.fee_id] })
      queryClient.invalidateQueries({ queryKey: ['installments', vars.fee_id] })
      toast.success('Payment recorded')
    },
    onError: (err) => toast.error(err.message),
  })
}

export function useNotifications() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['notifications', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile!.id)
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data ?? []
    },
    enabled: !!profile,
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

export function useBatches() {
  return useQuery({
    queryKey: ['batches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batches')
        .select('*, course:courses(name), faculty:users(id, name, email)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useUpdateBatch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Batch> }) => {
      const { data, error } = await supabase
        .from('batches')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] })
      queryClient.invalidateQueries({ queryKey: ['faculty-students'] })
      toast.success('Batch schedule & faculty updated')
    },
    onError: (err) => toast.error(err.message),
  })
}

export function useUsers() {
  const { can } = useAuth()

  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('users').select('*')
      if (error) throw error

      const rolePriority: Record<string, number> = {
        owner: 1,
        admin: 2,
        counselor: 3,
        reception: 4,
        accounts: 5,
        faculty: 6,
        bdm: 7,
      }

      return (data ?? []).sort((a, b) => {
        const priorityA = rolePriority[a.role] ?? 99
        const priorityB = rolePriority[b.role] ?? 99
        if (priorityA !== priorityB) return priorityA - priorityB
        return a.name.localeCompare(b.name)
      })
    },
    enabled: can('manageUsers'),
  })
}

export function useAttendance(studentId: string | undefined, month: string) {
  return useQuery({
    queryKey: ['attendance', studentId, month],
    queryFn: async () => {
      const start = `${month}-01`
      const end = `${month}-31`
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', studentId!)
        .gte('date', start)
        .lte('date', end)
      if (error) throw error
      return data ?? []
    },
    enabled: !!studentId,
  })
}

export function useMarkAttendance() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async (record: { student_id: string; batch_id: string; date: string; status: string }) => {
      const { error } = await supabase.from('attendance').upsert(
        { ...record, marked_by: profile?.id },
        { onConflict: 'student_id,batch_id,date' }
      )
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
      toast.success('Attendance saved')
    },
    onError: (err) => toast.error(err.message),
  })
}

export function useDashboardStats() {
  const { profile, isOwner } = useAuth()

  return useQuery({
    queryKey: ['dashboard', profile?.id, isOwner],
    queryFn: async () => {
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString()
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      let leadsQuery = supabase.from('leads').select('*', { count: 'exact', head: true })
      if (!isOwner && profile?.role === 'counselor') {
        leadsQuery = leadsQuery.eq('assigned_counselor_id', profile.id)
      }

      const [
        { count: totalLeads },
        { count: leadsToday },
        { count: leadsYesterday },
        { count: leadsWeek },
        { count: admissionsMonth },
        { data: fees },
        { count: followUpsDue },
        { count: followUpsOverdue },
        { data: leadsBySource },
        { data: students },
      ] = await Promise.all([
        leadsQuery,
        supabase.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
        supabase.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', yesterdayStart).lt('created_at', todayStart),
        supabase.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', weekStart),
        supabase.from('students').select('*', { count: 'exact', head: true }).gte('admission_date', monthStart.split('T')[0]),
        isOwner || profile?.role === 'accounts' ? supabase.from('fees').select('amount_paid, pending_balance') : Promise.resolve({ data: [] }),
        supabase.from('follow_ups').select('*', { count: 'exact', head: true }).gte('scheduled_at', todayStart).lte('scheduled_at', new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString()).eq('status', 'pending'),
        supabase.from('follow_ups').select('*', { count: 'exact', head: true }).eq('status', 'overdue'),
        supabase.from('leads').select('source'),
        supabase.from('students').select('course_id, created_at, course:courses(name)').gte('created_at', new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30).toISOString()),
      ])

      const revenue = (fees ?? []).reduce((s, f) => s + Number(f.amount_paid), 0)
      const pending = (fees ?? []).reduce((s, f) => s + Number(f.pending_balance), 0)

      const sourceMap: Record<string, number> = {}
      for (const l of leadsBySource ?? []) {
        const src = l.source ?? 'other'
        sourceMap[src] = (sourceMap[src] ?? 0) + 1
      }

      return {
        totalLeads: totalLeads ?? 0,
        leadsToday: leadsToday ?? 0,
        leadsYesterday: leadsYesterday ?? 0,
        leadsWeek: leadsWeek ?? 0,
        admissionsMonth: admissionsMonth ?? 0,
        revenue,
        pending,
        followUpsDue: followUpsDue ?? 0,
        followUpsOverdue: followUpsOverdue ?? 0,
        sourceBreakdown: Object.entries(sourceMap).map(([name, value]) => ({ name, value })),
        recentAdmissions: students ?? [],
      }
    },
    enabled: !!profile,
  })
}

export function useExpenses() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('institute_expenses')
        .select('*')
        .order('expense_date', { ascending: false })
      if (error) throw error
      return (data ?? []) as InstituteExpense[]
    },
    enabled: !!profile,
  })
}

export function useDashboardInsights() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['dashboard-insights'],
    queryFn: async () => {
      const [
        { count: coldLeads },
        { data: fullBatches },
        { count: overdueInstallments },
      ] = await Promise.all([
        supabase.from('leads').select('id', { count: 'exact', head: true })
          .not('status', 'in', '("converted","lost")'),
        supabase.from('batches').select('id, batch_name, enrolled_count, total_seats'),
        supabase.from('installments').select('id', { count: 'exact', head: true }).eq('status', 'overdue'),
      ])
      // Filter cold leads client-side (no activity in 5+ days)
      const noActivityIds: string[] = []
      if (coldLeads && coldLeads > 0) {
        const { data: activeIds } = await supabase
          .from('lead_activities')
          .select('lead_id')
          .gte('created_at', new Date(Date.now() - 5 * 86400000).toISOString())
        const activeSet = new Set(activeIds?.map(a => a.lead_id) ?? [])
        const { data: allCandidates } = await supabase
          .from('leads')
          .select('id')
          .not('status', 'in', '("converted","lost")')
        for (const l of allCandidates ?? []) {
          if (!activeSet.has(l.id)) noActivityIds.push(l.id)
        }
      }
      return {
        coldLeads: noActivityIds.length,
        fullBatches: (fullBatches ?? []).filter(b => b.enrolled_count >= b.total_seats * 0.9) as Array<{ id: string; batch_name: string; enrolled_count: number; total_seats: number }>,
        overdueInstallments: overdueInstallments ?? 0,
      }
    },
    enabled: !!profile,
  })
}

export function useGlobalSearch(query: string) {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['search', query, profile?.id],
    queryFn: async () => {
      if (!query || query.length < 2) return []

      const [leadsRes, studentsRes] = await Promise.all([
        supabase.from('leads').select('id, display_id, full_name, mobile').or(`full_name.ilike.%${query}%,mobile.ilike.%${query}%,display_id.ilike.%${query}%`).limit(5),
        supabase.from('students').select('id, full_name, student_id, mobile').or(`full_name.ilike.%${query}%,student_id.ilike.%${query}%,mobile.ilike.%${query}%`).limit(5),
      ])

      const results = [
        ...(leadsRes.data ?? []).map((l) => ({ ...l, display_id: (l as any).display_id, type: 'lead' as const })),
        ...(studentsRes.data ?? []).map((s) => ({ ...s, display_id: (s as any).student_id, type: 'student' as const })),
      ]
      return results
    },
    enabled: !!profile && query.length >= 2,
  })
}
