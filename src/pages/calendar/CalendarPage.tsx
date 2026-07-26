import { useState } from 'react'
import { Calendar, dateFnsLocalizer, type Event } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { Plus, Bell, Search } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import type { Reminder, FollowUp } from '@/types'
import { enUS } from 'date-fns/locale'

const locales = { 'en-US': enUS }

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
})

interface CalendarEvent extends Event {
  id: string
  type: 'follow_up' | 'fee_due' | 'reminder'
  title: string
  resource?: any
}

export default function CalendarPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [reminderOpen, setReminderOpen] = useState(false)
  const [reminderTitle, setReminderTitle] = useState('')
  const [reminderDesc, setReminderDesc] = useState('')
  const [reminderDate, setReminderDate] = useState('')
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [eventDetailOpen, setEventDetailOpen] = useState(false)

  // Fetch follow-ups
  const { data: followUps = [] } = useQuery({
    queryKey: ['calendar-followups', profile?.id],
    queryFn: async () => {
      let query = supabase
        .from('follow_ups')
        .select('*, lead:leads(id, full_name, mobile)')
        .neq('status', 'completed')
        .order('scheduled_at', { ascending: true })
      if (profile?.role === 'counselor' && !profile?.is_owner) {
        query = query.eq('assigned_to', profile.id)
      }
      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as FollowUp[]
    },
    enabled: !!profile,
  })

  // Fetch installments
  const { data: installments = [] } = useQuery({
    queryKey: ['calendar-installments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('installments')
        .select('*, fee:fees(student:students(full_name))')
        .neq('status', 'paid')
        .order('due_date', { ascending: true })
      if (error) throw error
      return (data ?? []) as any[]
    },
    enabled: !!profile && (profile?.is_owner || profile?.role === 'admin' || profile?.role === 'accounts'),
  })

  // Fetch reminders
  const { data: reminders = [] } = useQuery({
    queryKey: ['calendar-reminders', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', profile!.id)
        .eq('is_completed', false)
        .order('reminder_date', { ascending: true })
      if (error) throw error
      return (data ?? []) as Reminder[]
    },
    enabled: !!profile,
  })

  const createReminder = useMutation({
    mutationFn: async (reminder: Partial<Reminder>) => {
      const { data, error } = await supabase
        .from('reminders')
        .insert({ ...reminder, user_id: profile?.id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-reminders'] })
      toast.success('Reminder added')
      setReminderOpen(false)
      setReminderTitle('')
      setReminderDesc('')
      setReminderDate('')
    },
    onError: (err) => toast.error(err.message),
  })

  const completeReminder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('reminders').update({ is_completed: true }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-reminders'] })
      toast.success('Reminder completed')
      setEventDetailOpen(false)
    },
    onError: (err) => toast.error(err.message),
  })

  // Build calendar events
  const events: CalendarEvent[] = [
    ...followUps.map((fu) => ({
      id: fu.id,
      type: 'follow_up' as const,
      title: `Follow-up: ${fu.lead?.full_name ?? 'Unknown'}`,
      start: new Date(fu.scheduled_at),
      end: new Date(new Date(fu.scheduled_at).getTime() + 30 * 60 * 1000),
      resource: fu,
    })),
    ...installments.map((inst) => ({
      id: inst.id,
      type: 'fee_due' as const,
      title: `Fee Due: ${inst.fee?.student?.full_name ?? 'Unknown'} - ₹${inst.amount}`,
      start: new Date(inst.due_date),
      end: new Date(new Date(inst.due_date).getTime() + 24 * 60 * 60 * 1000),
      resource: inst,
    })),
    ...reminders.map((rem) => ({
      id: rem.id,
      type: 'reminder' as const,
      title: rem.title,
      start: new Date(rem.reminder_date),
      end: new Date(new Date(rem.reminder_date).getTime() + 60 * 60 * 1000),
      resource: rem,
    })),
  ]

  // Filter by search
  const filteredEvents = searchQuery
    ? events.filter((e) => e.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : events

  const eventStyleGetter = (event: CalendarEvent) => {
    const colors: Record<string, string> = {
      follow_up: '#3B82F6',
      fee_due: '#EF4444',
      reminder: '#10B981',
    }
    return {
      style: {
        backgroundColor: colors[event.type] ?? '#6B7280',
        borderRadius: '6px',
        opacity: 0.9,
        color: 'white',
        border: 'none',
        fontSize: '12px',
        padding: '2px 4px',
      },
    }
  }

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setEventDetailOpen(true)
  }

  const handleSelectSlot = (slotInfo: { start: Date }) => {
    setReminderDate(format(slotInfo.start, "yyyy-MM-dd'T'HH:mm"))
    setReminderOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Calendar" description="Follow-ups, fee due dates, and personal reminders">
        <Button onClick={() => { setReminderDate(format(new Date(), "yyyy-MM-dd'T'HH:mm")); setReminderOpen(true) }}>
          <Plus className="h-4 w-4" /> Add Reminder
        </Button>
      </PageHeader>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search events by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-blue-500" /> Follow-up</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-red-500" /> Fee Due</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-emerald-500" /> Reminder</span>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="h-[600px]">
            <Calendar
              localizer={localizer}
              events={filteredEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              eventPropGetter={eventStyleGetter}
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
              selectable
              popup
              defaultView="month"
              views={['month', 'week', 'day', 'agenda']}
            />
          </div>
        </CardContent>
      </Card>

      {/* Add Reminder Dialog */}
      <Dialog open={reminderOpen} onOpenChange={setReminderOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Reminder</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input value={reminderTitle} onChange={(e) => setReminderTitle(e.target.value)} placeholder="e.g. Call parent" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={reminderDesc} onChange={(e) => setReminderDesc(e.target.value)} />
            </div>
            <div>
              <Label>Date & Time</Label>
              <Input type="datetime-local" value={reminderDate} onChange={(e) => setReminderDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReminderOpen(false)}>Cancel</Button>
            <Button onClick={() => createReminder.mutate({ title: reminderTitle, description: reminderDesc, reminder_date: new Date(reminderDate).toISOString() })} disabled={!reminderTitle || !reminderDate}>
              Save Reminder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Event Detail Dialog */}
      <Dialog open={eventDetailOpen} onOpenChange={setEventDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              {selectedEvent?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p><strong>Type:</strong> <span className="capitalize">{selectedEvent?.type?.replace('_', ' ')}</span></p>
            <p><strong>Date:</strong> {selectedEvent?.start ? format(selectedEvent.start, 'MMM d, yyyy h:mm a') : '—'}</p>
            {selectedEvent?.type === 'follow_up' && selectedEvent?.resource?.lead && (
              <div>
                <p><strong>Lead:</strong> {selectedEvent.resource.lead.full_name}</p>
                <p><strong>Mobile:</strong> {selectedEvent.resource.lead.mobile}</p>
                <Button size="sm" variant="outline" onClick={() => { setEventDetailOpen(false); navigate(`/leads/${selectedEvent.resource.lead.id}`) }}>
                  View Lead
                </Button>
              </div>
            )}
            {selectedEvent?.type === 'fee_due' && selectedEvent?.resource?.fee?.student && (
              <div>
                <p><strong>Student:</strong> {selectedEvent.resource.fee.student.full_name}</p>
                <p><strong>Amount:</strong> ₹{selectedEvent.resource.amount}</p>
                <Button size="sm" variant="outline" onClick={() => { setEventDetailOpen(false); navigate(`/students/${selectedEvent.resource.fee.student.id}`) }}>
                  View Student
                </Button>
              </div>
            )}
            {selectedEvent?.type === 'reminder' && (
              <div>
                <p><strong>Description:</strong> {selectedEvent.resource?.description ?? '—'}</p>
                <Button size="sm" variant="outline" className="mt-2" onClick={() => completeReminder.mutate(selectedEvent.id)}>
                  Mark Complete
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEventDetailOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}