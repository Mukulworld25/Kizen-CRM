import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export interface CalendarEvent {
  id: string
  title: string
  date: string // YYYY-MM-DD
  time?: string // e.g. "10:30 AM"
  type: 'followup' | 'installment' | 'demo'
  status: 'pending' | 'completed' | 'overdue' | 'paid' | 'partial' | 'upcoming'
  description?: string
  counselorId?: string
  counselorName?: string
  leadId?: string
  studentId?: string
  personName: string
  mobile?: string
  courseName?: string
  amount?: number
  raw: any
}

export function useCalendarEvents(startDate?: string, endDate?: string, counselorId?: string) {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['calendar-events', startDate, endDate, counselorId, profile?.id],
    queryFn: async () => {
      // 1. Fetch Follow-ups
      let fuQuery = supabase
        .from('follow_ups')
        .select(`
          id, type, scheduled_at, status, notes, assigned_to,
          lead:leads(id, full_name, mobile, course:courses(name)),
          assignee:users!follow_ups_assigned_to_fkey(name)
        `)
        .order('scheduled_at', { ascending: true })

      if (startDate) fuQuery = fuQuery.gte('scheduled_at', `${startDate}T00:00:00.000Z`)
      if (endDate) fuQuery = fuQuery.lte('scheduled_at', `${endDate}T23:59:59.999Z`)
      if (counselorId) fuQuery = fuQuery.eq('assigned_to', counselorId)

      // 2. Fetch Installment Due Dates
      let instQuery = supabase
        .from('installments')
        .select(`
          id, installment_number, amount, due_date, status, amount_paid, pending_balance,
          student:students(id, full_name, mobile, course:courses(name), assigned_counselor_id)
        `)
        .order('due_date', { ascending: true })

      if (startDate) instQuery = instQuery.gte('due_date', startDate)
      if (endDate) instQuery = instQuery.lte('due_date', endDate)

      // 3. Fetch Leads with Demos/Joining Dates
      let leadQuery = supabase
        .from('leads')
        .select(`
          id, full_name, mobile, status, expected_joining_date, assigned_counselor_id,
          course:courses(name), counselor:users!leads_assigned_counselor_id_fkey(name)
        `)
        .not('expected_joining_date', 'is', null)

      if (startDate) leadQuery = leadQuery.gte('expected_joining_date', startDate)
      if (endDate) leadQuery = leadQuery.lte('expected_joining_date', endDate)
      if (counselorId) leadQuery = leadQuery.eq('assigned_counselor_id', counselorId)

      const [fuRes, instRes, leadRes] = await Promise.all([fuQuery, instQuery, leadQuery])

      if (fuRes.error) throw fuRes.error
      if (instRes.error) throw instRes.error
      if (leadRes.error) throw leadRes.error

      const events: CalendarEvent[] = []

      // Normalize Follow-ups
      ;(fuRes.data || []).forEach((fu: any) => {
        if (!fu.scheduled_at) return
        const d = new Date(fu.scheduled_at)
        const dateStr = format(d, 'yyyy-MM-dd')
        const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        const lead = fu.lead as any
        const personName = lead?.full_name || 'Unassigned Lead'
        const courseName = lead?.course?.name

        events.push({
          id: `fu-${fu.id}`,
          title: `Follow-up: ${personName}`,
          date: dateStr,
          time: timeStr,
          type: 'followup',
          status: fu.status === 'completed' ? 'completed' : fu.status === 'overdue' ? 'overdue' : 'pending',
          description: fu.notes || `Scheduled ${fu.type || 'follow-up'} call`,
          counselorId: fu.assigned_to,
          counselorName: fu.assignee?.name,
          leadId: lead?.id,
          personName,
          mobile: lead?.mobile,
          courseName,
          raw: fu,
        })
      })

      // Normalize Installments
      ;(instRes.data || []).forEach((inst: any) => {
        if (!inst.due_date) return
        const student = inst.student as any
        if (counselorId && student?.assigned_counselor_id !== counselorId) return

        const personName = student?.full_name || 'Student'
        const courseName = student?.course?.name

        events.push({
          id: `inst-${inst.id}`,
          title: `Fee Due: ${personName} (₹${inst.amount})`,
          date: inst.due_date,
          time: 'Due Date',
          type: 'installment',
          status: inst.status as any,
          description: `Installment #${inst.installment_number} — ₹${inst.amount} due`,
          counselorId: student?.assigned_counselor_id,
          studentId: student?.id,
          personName,
          mobile: student?.mobile,
          courseName,
          amount: inst.amount,
          raw: inst,
        })
      })

      // Normalize Demos/Expected Joining
      ;(leadRes.data || []).forEach((l: any) => {
        if (!l.expected_joining_date) return
        const personName = l.full_name || 'Lead'
        const courseName = l.course?.name

        events.push({
          id: `lead-${l.id}`,
          title: `Demo/Joining: ${personName}`,
          date: l.expected_joining_date,
          time: 'Expected Joining',
          type: 'demo',
          status: l.status === 'admitted' || l.status === 'enrolled' ? 'completed' : 'upcoming',
          description: `Expected demo or joining date for ${personName}`,
          counselorId: l.assigned_counselor_id,
          counselorName: l.counselor?.name,
          leadId: l.id,
          personName,
          mobile: l.mobile,
          courseName,
          raw: l,
        })
      })

      return events
    },
    enabled: !!profile,
  })
}
