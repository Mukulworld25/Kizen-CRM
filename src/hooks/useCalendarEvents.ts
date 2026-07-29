import { useQuery } from '@tanstack/react-query'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export interface CalendarEvent {
  id: string
  title: string
  date: string // YYYY-MM-DD
  time?: string // e.g. "10:30 AM"
  type: 'followup' | 'installment' | 'demo' | 'reminder' | 'task' | 'meeting' | 'batch_schedule' | 'institution_fu'
  status: 'pending' | 'completed' | 'overdue' | 'paid' | 'partial' | 'upcoming' | 'ongoing'
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

export function useCalendarEvents(currentMonth: Date, counselorId?: string) {
  const { profile } = useAuth()

  // Calculate full grid range (start of first week to end of last week)
  const gridStart = startOfWeek(startOfMonth(currentMonth))
  const gridEnd = endOfWeek(endOfMonth(currentMonth))
  const startDateStr = format(gridStart, 'yyyy-MM-dd')
  const endDateStr = format(gridEnd, 'yyyy-MM-dd')

  return useQuery({
    queryKey: ['calendar-events', startDateStr, endDateStr, counselorId, profile?.id],
    queryFn: async () => {
      // 1. Fetch Follow-ups / Tasks / Reminders / Meetings
      let fuQuery = supabase
        .from('follow_ups')
        .select(`
          id, type, scheduled_at, status, notes, assigned_to,
          lead:leads!follow_ups_lead_id_fkey!left(id, full_name, mobile, course:courses(name)),
          assignee:users!follow_ups_assigned_to_fkey(name)
        `)
        .order('scheduled_at', { ascending: true })

      if (startDateStr) fuQuery = fuQuery.gte('scheduled_at', `${startDateStr}T00:00:00.000Z`)
      if (endDateStr) fuQuery = fuQuery.lte('scheduled_at', `${endDateStr}T23:59:59.999Z`)
      if (counselorId) fuQuery = fuQuery.eq('assigned_to', counselorId)

      // 2. Fetch Installment Due Dates
      let instQuery = supabase
        .from('installments')
        .select(`
          id, installment_number, amount, due_date, status, amount_paid, pending_balance,
          student:students(id, full_name, mobile, course:courses(name), assigned_counselor_id)
        `)
        .order('due_date', { ascending: true })

      if (startDateStr) instQuery = instQuery.gte('due_date', startDateStr)
      if (endDateStr) instQuery = instQuery.lte('due_date', endDateStr)

      // 3. Fetch Leads with Demos/Joining Dates
      let leadQuery = supabase
        .from('leads')
        .select(`
          id, full_name, mobile, status, expected_joining_date, assigned_counselor_id,
          course:courses(name), counselor:users!leads_assigned_counselor_id_fkey(name)
        `)
        .not('expected_joining_date', 'is', null)

      if (startDateStr) leadQuery = leadQuery.gte('expected_joining_date', startDateStr)
      if (endDateStr) leadQuery = leadQuery.lte('expected_joining_date', endDateStr)
      if (counselorId) leadQuery = leadQuery.eq('assigned_counselor_id', counselorId)

      const [fuRes, instRes, leadRes] = await Promise.all([fuQuery, instQuery, leadQuery])

      if (fuRes.error) throw fuRes.error
      if (instRes.error) throw instRes.error
      if (leadRes.error) throw leadRes.error

      const events: CalendarEvent[] = []

      // Normalize Follow-ups / Tasks / Reminders / Meetings
      ;(fuRes.data || []).forEach((fu: any) => {
        if (!fu.scheduled_at) return
        const d = new Date(fu.scheduled_at)
        const dateStr = format(d, 'yyyy-MM-dd')
        const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        const lead = fu.lead as any
        const leadName = lead?.full_name || ''
        const rawType = (fu.type || 'task').toLowerCase()

        let eventType: CalendarEvent['type'] = 'task'
        let prefix = '📝 Task'
        if (rawType.includes('meeting')) {
          eventType = 'meeting'
          prefix = '🤝 Meeting'
        } else if (rawType.includes('reminder')) {
          eventType = 'reminder'
          prefix = '📌 Reminder'
        } else if (rawType.includes('followup') || rawType.includes('call')) {
          eventType = 'followup'
          prefix = '📞 Follow-up'
        }

        const titleText = leadName ? `${prefix}: ${leadName}` : `${prefix}: ${fu.notes || 'General'}`

        events.push({
          id: `fu-${fu.id}`,
          title: titleText,
          date: dateStr,
          time: timeStr,
          type: eventType,
          status: fu.status === 'completed' ? 'completed' : fu.status === 'overdue' ? 'overdue' : 'pending',
          description: fu.notes || `${prefix} scheduled`,
          counselorId: fu.assigned_to,
          counselorName: fu.assignee?.name,
          leadId: lead?.id,
          personName: leadName || fu.notes || 'Personal Item',
          mobile: lead?.mobile,
          courseName: lead?.course?.name,
          raw: fu,
        })
      })

      // Normalize Fee Installments
      ;(instRes.data || []).forEach((inst: any) => {
        if (!inst.due_date) return
        const student = inst.student as any
        if (counselorId && student?.assigned_counselor_id !== counselorId) return

        events.push({
          id: `inst-${inst.id}`,
          title: `💳 Fee Due: ₹${inst.amount?.toLocaleString('en-IN')} - ${student?.full_name || 'Student'}`,
          date: inst.due_date,
          type: 'installment',
          status: inst.status === 'paid' ? 'paid' : inst.status === 'partial' ? 'partial' : 'pending',
          description: `Installment #${inst.installment_number} due for ${student?.course?.name || 'Course'}`,
          counselorId: student?.assigned_counselor_id,
          studentId: student?.id,
          personName: student?.full_name || 'Student',
          mobile: student?.mobile,
          courseName: student?.course?.name,
          amount: inst.amount,
          raw: inst,
        })
      })

      // Normalize Leads Expected Joining / Demos
      ;(leadRes.data || []).forEach((l: any) => {
        if (!l.expected_joining_date) return
        events.push({
          id: `lead-join-${l.id}`,
          title: `🎓 Expected Joining: ${l.full_name}`,
          date: l.expected_joining_date,
          type: 'demo',
          status: 'upcoming',
          description: `Lead expected to join. Mobile: ${l.mobile || 'N/A'}`,
          counselorId: l.assigned_counselor_id,
          counselorName: l.counselor?.name,
          leadId: l.id,
          personName: l.full_name,
          mobile: l.mobile,
          courseName: l.course?.name,
          raw: l,
        })
      })

      return events
    },
    enabled: !!profile,
  })
}
