import { useState } from 'react'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addDays,
} from 'date-fns'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Phone,
  Calendar as CalendarIcon,
  Check,
  Clock,
  Edit2,
  Trash2,
  User as UserIcon,
  Users,
  Video,
  MapPin,
  AlertCircle,
  Lock,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useCounselors, useLeads } from '@/hooks/useLeads'
import {
  useCreateFollowUp,
  useCompleteFollowUp,
  useRescheduleFollowUp,
  useUpdateFollowUp,
  useDeleteFollowUp,
  useStudents,
} from '@/hooks/useStudents'
import { useCalendarEvents, type CalendarEvent } from '@/hooks/useCalendarEvents'
import { PageHeader } from '@/components/shared/PageHeader'
import { WhatsAppButton } from '@/components/shared/WhatsAppButton'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import type { User as UserType } from '@/types'

export default function CalendarPage() {
  const { profile, can, isOwner } = useAuth()
  const queryClient = useQueryClient()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day' | 'agenda'>('month')
  const [counselorId, setCounselorId] = useState<string>()

  // Event Type Filters
  const [showFollowups, setShowFollowups] = useState(true)
  const [showInstallments, setShowInstallments] = useState(true)
  const [showDemos, setShowDemos] = useState(true)
  const [showReminders, setShowReminders] = useState(true)
  const [showTasks, setShowTasks] = useState(true)
  const [showMeetings, setShowMeetings] = useState(true)
  const [showBatchSchedules, setShowBatchSchedules] = useState(true)
  const [showInstFus, setShowInstFus] = useState(true)

  // Selected Event & Dialog States
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [isEditingEvent, setIsEditingEvent] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editTime, setEditTime] = useState('10:00')
  const [editNotes, setEditNotes] = useState('')
  const [editAssignee, setEditAssignee] = useState('')

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [scheduleType, setScheduleType] = useState<'meeting' | 'followup' | 'task' | 'reminder'>('meeting')
  const [eventTitle, setEventTitle] = useState('')
  const [participantType, setParticipantType] = useState<'staff' | 'lead' | 'none'>('staff')
  const [selectedStaffId, setSelectedStaffId] = useState<string>('')
  const [selectedLeadId, setSelectedLeadId] = useState<string>('')
  const [createDate, setCreateDate] = useState<string>('')
  const [followupTime, setFollowupTime] = useState<string>('11:00')
  const [durationMinutes, setDurationMinutes] = useState<string>('30')
  const [followupNotes, setFollowupNotes] = useState<string>('')
  const [leadSearchText, setLeadSearchText] = useState('')
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [isPrivateTask, setIsPrivateTask] = useState(false)

  // Reschedule State
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState<string>('')
  const [rescheduleTime, setRescheduleTime] = useState<string>('10:00')
  const [rescheduleNotes, setRescheduleNotes] = useState<string>('')

  // Queries
  const { data: events = [] } = useCalendarEvents(currentMonth, counselorId)
  const { data: counselors = [] } = useCounselors()
  const { data: leadsData } = useLeads({ pageSize: 1000 })
  const { data: studentsData } = useStudents({})
  const allLeads = leadsData?.leads ?? []
  const allStudents = studentsData ?? []

  // Active Users for Staff Meetings
  const { data: allUsers = [] } = useQuery({
    queryKey: ['active-staff-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, role')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return (data ?? []) as UserType[]
    },
  })

  // Mutations
  const createFollowUp = useCreateFollowUp()
  const completeFollowUp = useCompleteFollowUp()
  const rescheduleFollowUp = useRescheduleFollowUp()
  const updateFollowUp = useUpdateFollowUp()
  const deleteFollowUp = useDeleteFollowUp()

  // Task Mutations for calendar tasks
  const updateTask = async (id: string, updates: any) => {
    const { error } = await supabase.from('tasks').update(updates).eq('id', id)
    if (error) {
      toast.error('Failed to update task: ' + error.message)
    } else {
      toast.success('Task updated successfully')
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      queryClient.invalidateQueries({ queryKey: ['hod-tasks'] })
      setSelectedEvent(null)
      setIsEditingEvent(false)
    }
  }

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) {
      toast.error('Failed to delete task: ' + error.message)
    } else {
      toast.success('Task deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      queryClient.invalidateQueries({ queryKey: ['hod-tasks'] })
      setSelectedEvent(null)
    }
  }

  // Open Edit Mode
  const handleOpenEdit = () => {
    if (!selectedEvent) return
    setIsEditingEvent(true)
    // Strip emoji prefixes from title for clean editing
    const cleanTitle = selectedEvent.title.replace(/^[🤝📞💳📝📌🎓]\s*/, '')
    setEditTitle(cleanTitle)
    setEditDate(selectedEvent.date)
    setEditTime(selectedEvent.time ? selectedEvent.time.replace(/\s*[AP]M/i, '').trim() : '10:00')
    setEditNotes(selectedEvent.description || '')
    setEditAssignee(selectedEvent.counselorId || '')
  }

  // Save Edit Mode
  const handleSaveEdit = async () => {
    if (!selectedEvent || !editTitle.trim()) return

    const timeFormatted = editTime ? `${editTime}:00` : '10:00:00'
    const scheduledAt = new Date(`${editDate}T${timeFormatted}`).toISOString()

    if (selectedEvent.sourceTable === 'tasks') {
      await updateTask(selectedEvent.raw?.id, {
        title: editTitle.trim(),
        description: editNotes.trim() || null,
        due_date: `${editDate}T${timeFormatted}`,
        assigned_to: editAssignee || null,
      })
    } else {
      await updateFollowUp.mutateAsync({
        id: selectedEvent.raw?.id,
        notes: editTitle.trim() + (editNotes.trim() && editNotes.trim() !== editTitle.trim() ? ` · ${editNotes.trim()}` : ''),
        scheduled_at: scheduledAt,
        assigned_to: editAssignee || null,
      })
      setSelectedEvent(null)
      setIsEditingEvent(false)
    }
  }

  // Quick Reschedule
  const handleQuickRescheduleDays = async (daysToAdd: number) => {
    if (!selectedEvent) return
    const current = new Date(selectedEvent.date)
    const newDateStr = format(addDays(current, daysToAdd), 'yyyy-MM-dd')
    const timeFormatted = selectedEvent.time ? '10:00:00' : '10:00:00'
    const scheduledAt = new Date(`${newDateStr}T${timeFormatted}`).toISOString()

    if (selectedEvent.sourceTable === 'tasks') {
      await updateTask(selectedEvent.raw?.id, { due_date: `${newDateStr}T${timeFormatted}` })
    } else {
      await rescheduleFollowUp.mutateAsync({
        id: selectedEvent.raw?.id,
        scheduledAt,
        notes: selectedEvent.description,
      })
      setSelectedEvent(null)
    }
  }

  // Reschedule Dialog Handlers
  const handleOpenReschedule = () => {
    if (!selectedEvent) return
    setRescheduleDate(selectedEvent.date)
    setRescheduleTime('10:00')
    setRescheduleNotes(selectedEvent.description || '')
    setIsRescheduleModalOpen(true)
  }

  const handleRescheduleSubmit = async () => {
    if (!selectedEvent || !rescheduleDate) return
    const scheduledAt = new Date(`${rescheduleDate}T${rescheduleTime}:00`).toISOString()

    if (selectedEvent.sourceTable === 'tasks') {
      await updateTask(selectedEvent.raw?.id, { due_date: scheduledAt, description: rescheduleNotes })
    } else {
      await rescheduleFollowUp.mutateAsync({
        id: selectedEvent.raw?.id,
        scheduledAt,
        notes: rescheduleNotes,
      })
    }
    setIsRescheduleModalOpen(false)
    setSelectedEvent(null)
  }

  // Delete / Cancel Event
  const handleDeleteEvent = async () => {
    if (!selectedEvent) return
    if (!confirm(`Are you sure you want to remove "${selectedEvent.title}" from the calendar?`)) return

    if (selectedEvent.sourceTable === 'tasks') {
      await deleteTask(selectedEvent.raw?.id)
    } else if (selectedEvent.sourceTable === 'follow_ups') {
      await deleteFollowUp.mutateAsync(selectedEvent.raw?.id)
      setSelectedEvent(null)
    } else {
      toast.error('This automated record cannot be deleted from the calendar.')
    }
  }

  // Filter events by type and viewMode
  const filteredEvents = events.filter((e) => {
    if (e.type === 'followup' && !showFollowups) return false
    if (e.type === 'installment' && !showInstallments) return false
    if (e.type === 'demo' && !showDemos) return false
    if (e.type === 'reminder' && !showReminders) return false
    if (e.type === 'task' && !showTasks) return false
    if (e.type === 'meeting' && !showMeetings) return false
    if (e.type === 'batch_schedule' && !showBatchSchedules) return false
    if (e.type === 'institution_fu' && !showInstFus) return false

    if (viewMode === 'day') {
      return e.date === format(selectedDate, 'yyyy-MM-dd')
    }
    if (viewMode === 'week') {
      const wStart = format(startOfWeek(selectedDate), 'yyyy-MM-dd')
      const wEnd = format(endOfWeek(selectedDate), 'yyyy-MM-dd')
      return e.date >= wStart && e.date <= wEnd
    }
    return true
  })

  // Date handlers
  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const handleToday = () => {
    const today = new Date()
    setCurrentMonth(today)
    setSelectedDate(today)
    setViewMode('day')
  }

  const handleDayClick = (day: Date) => {
    setSelectedDate(day)
    setCreateDate(format(day, 'yyyy-MM-dd'))
  }

  const handleOpenCreateForDay = (day: Date, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedDate(day)
    setCreateDate(format(day, 'yyyy-MM-dd'))
    setIsCreateModalOpen(true)
  }

  // Submit Schedule Creation
  const handleScheduleSubmit = async () => {
    if (!createDate) {
      toast.error('Please pick a date')
      return
    }

    const scheduledAt = new Date(`${createDate}T${followupTime}:00`).toISOString()

    if (scheduleType === 'task') {
      // Insert into tasks table
      if (!eventTitle.trim()) {
        toast.error('Please enter a task title')
        return
      }
      const { error } = await supabase.from('tasks').insert({
        title: eventTitle.trim(),
        description: followupNotes.trim() || null,
        assigned_to: selectedStaffId || null,
        due_date: scheduledAt,
        priority: taskPriority,
        is_private: isPrivateTask,
        created_by: profile?.id,
        status: 'pending',
      })
      if (error) {
        toast.error('Failed to create task: ' + error.message)
        return
      }
      toast.success('Team task added to calendar')
    } else {
      // Insert into follow_ups table
      let targetLeadId: string | null = null
      let targetAssigneeId: string | null = null

      if (scheduleType === 'meeting') {
        if (!eventTitle.trim()) {
          toast.error('Please enter a meeting title or agenda')
          return
        }
        if (participantType === 'staff') {
          targetAssigneeId = selectedStaffId || null
        } else if (participantType === 'lead') {
          targetLeadId = selectedLeadId.startsWith('stu-') ? null : (selectedLeadId === 'none' ? null : selectedLeadId)
        }
      } else if (scheduleType === 'followup') {
        targetLeadId = selectedLeadId.startsWith('stu-') ? null : (selectedLeadId === 'none' ? null : selectedLeadId)
        targetAssigneeId = counselorId || null
      }

      const noteContent = eventTitle.trim()
        ? (followupNotes.trim() ? `${eventTitle.trim()} · ${followupNotes.trim()}` : eventTitle.trim())
        : (followupNotes.trim() || `${scheduleType} scheduled`)

      await createFollowUp.mutateAsync({
        lead_id: targetLeadId || null,
        scheduled_at: scheduledAt,
        notes: noteContent,
        assigned_to: targetAssigneeId || counselorId || null,
        type: (scheduleType === 'followup' ? 'call' : scheduleType) as any,
        status: 'pending',
      })
    }

    await queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
    await queryClient.invalidateQueries({ queryKey: ['hod-tasks'] })
    setIsCreateModalOpen(false)
    setEventTitle('')
    setFollowupNotes('')
    setSelectedLeadId('none')
    setSelectedStaffId('')
    setLeadSearchText('')
  }

  // Days array for month view grid
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const daysInMonth = eachDayOfInterval({
    start: startOfWeek(monthStart),
    end: endOfWeek(monthEnd),
  })

  // Helper for event styling
  const getEventBadgeClass = (type: string, status: string) => {
    if (status === 'completed' || status === 'paid') {
      return 'bg-emerald-100 text-emerald-800 border-emerald-300'
    }
    if (status === 'overdue') {
      return 'bg-rose-100 text-rose-800 border-rose-300'
    }
    switch (type) {
      case 'meeting':
        return 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
      case 'task':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300 hover:bg-indigo-200'
      case 'followup':
        return 'bg-sky-100 text-sky-800 border-sky-300 hover:bg-sky-200'
      case 'installment':
        return 'bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-200'
      case 'demo':
        return 'bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200'
      case 'reminder':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200'
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="CRM Calendar & Schedule" description="Interactive schedule for meetings, team tasks, follow-up calls, and fee deadlines">
        <div className="flex items-center gap-3 flex-wrap">
          {can('assignCounselor') && (
            <Select value={counselorId ?? 'all'} onValueChange={(v) => setCounselorId(v === 'all' ? undefined : v)}>
              <SelectTrigger className="w-44 bg-white"><SelectValue placeholder="All Counselors" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Counselors</SelectItem>
                {counselors.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Button
            onClick={() => {
              setCreateDate(format(new Date(), 'yyyy-MM-dd'))
              setScheduleType('meeting')
              setEventTitle('')
              setIsCreateModalOpen(true)
            }}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Schedule Event
          </Button>
        </div>
      </PageHeader>

      {/* Toolbar & Filters */}
      <Card className="border-border/60 shadow-sm bg-white">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Navigation */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleToday} className="font-medium">
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-bold text-slate-800 ml-2 min-w-44">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
          </div>

          {/* View Toggles */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setViewMode('month')}
                className={cn('px-3 py-1 text-xs font-semibold rounded-md transition-all', viewMode === 'month' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600 hover:text-slate-900')}
              >
                Month
              </button>
              <button
                type="button"
                onClick={() => setViewMode('agenda')}
                className={cn('px-3 py-1 text-xs font-semibold rounded-md transition-all', viewMode === 'agenda' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600 hover:text-slate-900')}
              >
                Agenda
              </button>
            </div>

            {/* Category Toggles */}
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              <Badge
                variant={showMeetings ? 'default' : 'outline'}
                className={cn('cursor-pointer select-none text-[11px] font-semibold', showMeetings ? 'bg-amber-600 hover:bg-amber-700' : 'opacity-60')}
                onClick={() => setShowMeetings(!showMeetings)}
              >
                🤝 Meetings
              </Badge>
              <Badge
                variant={showTasks ? 'default' : 'outline'}
                className={cn('cursor-pointer select-none text-[11px] font-semibold', showTasks ? 'bg-indigo-600 hover:bg-indigo-700' : 'opacity-60')}
                onClick={() => setShowTasks(!showTasks)}
              >
                📝 Tasks
              </Badge>
              <Badge
                variant={showFollowups ? 'default' : 'outline'}
                className={cn('cursor-pointer select-none text-[11px] font-semibold', showFollowups ? 'bg-sky-600 hover:bg-sky-700' : 'opacity-60')}
                onClick={() => setShowFollowups(!showFollowups)}
              >
                📞 Calls
              </Badge>
              <Badge
                variant={showInstallments ? 'default' : 'outline'}
                className={cn('cursor-pointer select-none text-[11px] font-semibold', showInstallments ? 'bg-orange-600 hover:bg-orange-700' : 'opacity-60')}
                onClick={() => setShowInstallments(!showInstallments)}
              >
                💳 Fees
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MONTH VIEW GRID */}
      {viewMode === 'month' && (
        <Card className="border-border/60 shadow-sm bg-white overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-bold text-slate-600 py-2.5">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100">
            {daysInMonth.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const dayEvents = filteredEvents.filter((e) => e.date === dateStr)
              const isCurrentMonth = isSameMonth(day, currentMonth)
              const isSelected = isSameDay(day, selectedDate)
              const isDayToday = isToday(day)

              return (
                <div
                  key={day.toString()}
                  onClick={() => handleDayClick(day)}
                  className={cn(
                    'min-h-[110px] p-1.5 transition-colors relative group cursor-pointer',
                    !isCurrentMonth && 'bg-slate-50/50 text-slate-400',
                    isSelected && 'bg-amber-50/40 ring-1 ring-amber-400 inset-0',
                    isDayToday && 'bg-sky-50/30'
                  )}
                >
                  {/* Day number & Quick add */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={cn(
                        'text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full',
                        isDayToday && 'bg-amber-500 text-slate-950',
                        !isDayToday && isCurrentMonth && 'text-slate-800'
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleOpenCreateForDay(day, e)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-200 text-slate-600 transition-opacity"
                      title="Add schedule on this day"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Day Events Tiles */}
                  <div className="space-y-1 mt-1 overflow-y-auto max-h-[85px] scrollbar-none">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedEvent(event)
                          setIsEditingEvent(false)
                        }}
                        className={cn(
                          'text-[11px] px-1.5 py-0.5 rounded border font-medium truncate flex items-center justify-between cursor-pointer transition-all shadow-xs',
                          getEventBadgeClass(event.type, event.status)
                        )}
                        title={`${event.title} (${event.time || 'All day'}) - ${event.status}`}
                      >
                        <span className="truncate font-semibold flex-1 min-w-0 mr-1">{event.title}</span>
                        {event.time && <span className="text-[9px] opacity-80 shrink-0 font-mono">{event.time}</span>}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] font-semibold text-slate-500 pl-1">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* AGENDA VIEW */}
      {(viewMode === 'agenda' || viewMode === 'week' || viewMode === 'day') && (
        <Card className="border-border/60 shadow-sm bg-white">
          <CardContent className="p-6">
            <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-amber-500" /> Schedule Agenda ({filteredEvents.length} items)
            </h3>
            {filteredEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No scheduled events in this date range.</p>
            ) : (
              <div className="space-y-3">
                {filteredEvents.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => {
                      setSelectedEvent(event)
                      setIsEditingEvent(false)
                    }}
                    className="p-4 rounded-xl border border-slate-200 hover:border-amber-300 hover:shadow-xs transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'p-2.5 rounded-xl text-white font-bold text-xs shrink-0',
                          event.type === 'meeting' ? 'bg-amber-600' : event.type === 'task' ? 'bg-indigo-600' : event.type === 'installment' ? 'bg-orange-600' : 'bg-sky-600'
                        )}
                      >
                        {event.type === 'meeting' ? 'MEET' : event.type === 'task' ? 'TASK' : event.type === 'installment' ? 'FEE' : 'CALL'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-slate-900 text-sm">{event.title}</h4>
                          <Badge className={cn('capitalize text-[10px]', getEventBadgeClass(event.type, event.status))}>
                            {event.status}
                          </Badge>
                          {event.priority && (
                            <Badge variant="outline" className="text-[10px] capitalize">
                              {event.priority}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(event.date), 'EEEE, MMM d, yyyy')} {event.time && `at ${event.time}`}
                          {event.personName && ` · ${event.personName}`}
                        </p>
                        {event.description && <p className="text-xs text-slate-600 mt-1">{event.description}</p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {event.mobile && (
                        <>
                          <Button variant="outline" size="sm" asChild onClick={(e) => e.stopPropagation()}>
                            <a href={`tel:${event.mobile}`}><Phone className="h-4 w-4" /></a>
                          </Button>
                          <div onClick={(e) => e.stopPropagation()}>
                            <WhatsAppButton name={event.personName} mobile={event.mobile} course={event.courseName} size="sm" />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* EVENT DETAIL & IN-PLACE EDIT DIALOG */}
      {selectedEvent && (
        <Dialog open={!!selectedEvent} onOpenChange={() => { setSelectedEvent(null); setIsEditingEvent(false) }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between gap-2 text-base">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={cn(
                      'w-3 h-3 rounded-full shrink-0',
                      selectedEvent.type === 'meeting' ? 'bg-amber-500' : selectedEvent.type === 'task' ? 'bg-indigo-500' : selectedEvent.type === 'installment' ? 'bg-orange-500' : 'bg-sky-500'
                    )}
                  />
                  <span className="truncate">{isEditingEvent ? 'Edit Schedule Event' : selectedEvent.title}</span>
                </div>
                {!isEditingEvent && (selectedEvent.sourceTable === 'follow_ups' || selectedEvent.sourceTable === 'tasks') && (
                  <Button variant="outline" size="sm" onClick={handleOpenEdit} className="h-7 text-xs gap-1">
                    <Edit2 className="h-3 w-3" /> Edit
                  </Button>
                )}
              </DialogTitle>
            </DialogHeader>

            {isEditingEvent ? (
              /* Inline Edit Mode */
              <div className="space-y-4 py-2 text-sm">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Title / Subject <span className="text-rose-500">*</span></label>
                  <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Date</label>
                    <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Time</label>
                    <Input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Assigned Staff / Attendee</label>
                  <Select value={editAssignee || 'none'} onValueChange={(v) => setEditAssignee(v === 'none' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="Select staff member" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Staff Assigned</SelectItem>
                      {allUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.name} ({u.role})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Agenda / Notes</label>
                  <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button variant="outline" size="sm" onClick={() => setIsEditingEvent(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleSaveEdit} className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
                    Save Changes
                  </Button>
                </div>
              </div>
            ) : (
              /* View Details Mode */
              <div className="space-y-4 py-2 text-sm">
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-xs text-muted-foreground font-medium">Date & Time</span>
                    <p className="font-semibold text-slate-800">{format(new Date(selectedEvent.date), 'EEE, MMM d, yyyy')}</p>
                    <p className="text-xs text-slate-600 font-mono mt-0.5">{selectedEvent.time || 'All day'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground font-medium">Category</span>
                    <p className="font-semibold text-slate-800 capitalize">{selectedEvent.type}</p>
                    <Badge variant="outline" className="capitalize text-[10px] mt-1">{selectedEvent.status}</Badge>
                  </div>
                </div>

                {/* Attendee / Person Details */}
                <div className="p-3 rounded-xl border border-slate-200 bg-white">
                  <span className="text-xs text-muted-foreground font-medium block mb-1">Participant / Attendee</span>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        <UserIcon className="h-3.5 w-3.5 text-amber-600" />
                        {selectedEvent.personName}
                      </p>
                      {selectedEvent.courseName && <p className="text-xs text-slate-500 mt-0.5">Course: {selectedEvent.courseName}</p>}
                      {selectedEvent.mobile && <p className="text-xs text-slate-600 font-mono mt-0.5">{selectedEvent.mobile}</p>}
                    </div>
                    {selectedEvent.mobile && (
                      <div className="flex items-center gap-1.5">
                        <Button variant="outline" size="sm" asChild className="h-7 text-xs">
                          <a href={`tel:${selectedEvent.mobile}`}><Phone className="h-3 w-3 mr-1" /> Call</a>
                        </Button>
                        <WhatsAppButton name={selectedEvent.personName} mobile={selectedEvent.mobile} course={selectedEvent.courseName} size="sm" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes & Description */}
                {selectedEvent.description && (
                  <div>
                    <span className="text-xs text-muted-foreground font-medium block mb-1">Agenda & Notes</span>
                    <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border leading-relaxed whitespace-pre-wrap">
                      {selectedEvent.description}
                    </p>
                  </div>
                )}

                {/* Quick Reschedule Presets */}
                {(selectedEvent.sourceTable === 'follow_ups' || selectedEvent.sourceTable === 'tasks') && (
                  <div className="pt-2 border-t">
                    <span className="text-[11px] font-semibold text-slate-600 block mb-1.5">Quick Reschedule:</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Button variant="outline" size="sm" onClick={() => handleQuickRescheduleDays(1)} className="h-7 text-xs">
                        Tomorrow
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleQuickRescheduleDays(3)} className="h-7 text-xs">
                        +3 Days
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleQuickRescheduleDays(7)} className="h-7 text-xs">
                        Next Week
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleOpenReschedule} className="h-7 text-xs">
                        <Clock className="h-3 w-3 mr-1" /> Custom Date
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!isEditingEvent && (
              <DialogFooter className="flex-col sm:flex-row gap-2 justify-between border-t pt-3">
                <div>
                  {(selectedEvent.sourceTable === 'follow_ups' || selectedEvent.sourceTable === 'tasks') && (
                    <Button variant="destructive" size="sm" onClick={handleDeleteEvent} className="h-8 text-xs gap-1">
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedEvent(null)}>Close</Button>
                  {selectedEvent.sourceTable === 'follow_ups' && selectedEvent.status !== 'completed' && (
                    <Button
                      size="sm"
                      onClick={() => {
                        completeFollowUp.mutate(selectedEvent.raw?.id)
                        setSelectedEvent(null)
                      }}
                      className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                    >
                      <Check className="h-3.5 w-3.5 mr-1" /> Mark Completed
                    </Button>
                  )}
                  {selectedEvent.sourceTable === 'tasks' && selectedEvent.status !== 'completed' && (
                    <Button
                      size="sm"
                      onClick={() => updateTask(selectedEvent.raw?.id, { status: 'completed' })}
                      className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                    >
                      <Check className="h-3.5 w-3.5 mr-1" /> Mark Completed
                    </Button>
                  )}
                </div>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* RESCHEDULE MODAL */}
      <Dialog open={isRescheduleModalOpen} onOpenChange={setIsRescheduleModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule Event</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">New Date</label>
                <Input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">New Time</label>
                <Input type="time" value={rescheduleTime} onChange={(e) => setRescheduleTime(e.target.value)} className="mt-1" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Updated Notes</label>
              <Textarea
                placeholder="Updated instructions or agenda..."
                value={rescheduleNotes}
                onChange={(e) => setRescheduleNotes(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRescheduleModalOpen(false)}>Cancel</Button>
            <Button onClick={handleRescheduleSubmit} disabled={!rescheduleDate} className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
              Confirm Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CREATE EVENT MODAL (MEETING, TASK, FOLLOWUP, REMINDER) */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add to Schedule</DialogTitle>
          </DialogHeader>

          {/* Type Selector Tabs */}
          <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-xl text-center text-xs font-semibold">
            <button
              type="button"
              onClick={() => setScheduleType('meeting')}
              className={cn(
                'py-2 rounded-lg transition-all',
                scheduleType === 'meeting' ? 'bg-amber-500 text-slate-950 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              🤝 Meeting
            </button>
            <button
              type="button"
              onClick={() => setScheduleType('task')}
              className={cn(
                'py-2 rounded-lg transition-all',
                scheduleType === 'task' ? 'bg-indigo-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              📝 Task
            </button>
            <button
              type="button"
              onClick={() => setScheduleType('followup')}
              className={cn(
                'py-2 rounded-lg transition-all',
                scheduleType === 'followup' ? 'bg-sky-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              📞 Follow-up
            </button>
            <button
              type="button"
              onClick={() => setScheduleType('reminder')}
              className={cn(
                'py-2 rounded-lg transition-all',
                scheduleType === 'reminder' ? 'bg-emerald-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              📌 Reminder
            </button>
          </div>

          <div className="space-y-3.5 py-2">
            {/* Title / Subject (Mandatory for Meeting, Task, Reminder) */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                {scheduleType === 'meeting' ? 'Meeting Title / Subject' : scheduleType === 'task' ? 'Task Title' : scheduleType === 'reminder' ? 'Reminder Title' : 'Follow-up Subject'}
                <span className="text-rose-500 ml-0.5">*</span>
              </label>
              <Input
                placeholder={
                  scheduleType === 'meeting'
                    ? 'e.g. Meeting with Aadya Sharma / Admissions Review'
                    : scheduleType === 'task'
                    ? 'e.g. Prepare batch timetable & student lists'
                    : scheduleType === 'reminder'
                    ? 'e.g. Call accountant regarding GST filing'
                    : 'e.g. Course counseling follow-up'
                }
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
              />
            </div>

            {/* Meeting Attendees (Staff vs Lead vs General) */}
            {scheduleType === 'meeting' && (
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">Meeting With</label>
                  <div className="flex rounded-md bg-slate-200/70 p-0.5 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setParticipantType('staff')}
                      className={cn('px-2 py-0.5 rounded transition-all', participantType === 'staff' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600')}
                    >
                      Staff Member
                    </button>
                    <button
                      type="button"
                      onClick={() => setParticipantType('lead')}
                      className={cn('px-2 py-0.5 rounded transition-all', participantType === 'lead' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600')}
                    >
                      Student / Lead
                    </button>
                    <button
                      type="button"
                      onClick={() => setParticipantType('none')}
                      className={cn('px-2 py-0.5 rounded transition-all', participantType === 'none' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600')}
                    >
                      General
                    </button>
                  </div>
                </div>

                {participantType === 'staff' && (
                  <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                    <SelectTrigger className="bg-white"><SelectValue placeholder="Choose a colleague (e.g. Aadya Sharma)" /></SelectTrigger>
                    <SelectContent>
                      {allUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          👤 {u.name} ({u.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {participantType === 'lead' && (
                  <div className="space-y-1.5">
                    <Input
                      placeholder="Search lead or student by name or mobile..."
                      value={leadSearchText}
                      onChange={(e) => setLeadSearchText(e.target.value)}
                      className="text-xs bg-white"
                    />
                    <Select value={selectedLeadId || 'none'} onValueChange={setSelectedLeadId}>
                      <SelectTrigger className="bg-white"><SelectValue placeholder="Choose a lead or student" /></SelectTrigger>
                      <SelectContent className="max-h-52">
                        <SelectItem value="none">No Lead Selected</SelectItem>
                        {allLeads
                          .filter((l) =>
                            !leadSearchText ||
                            l.full_name.toLowerCase().includes(leadSearchText.toLowerCase()) ||
                            (l.mobile && l.mobile.includes(leadSearchText))
                          )
                          .slice(0, 30)
                          .map((l) => (
                            <SelectItem key={l.id} value={l.id}>
                              📋 {l.full_name} ({l.mobile})
                            </SelectItem>
                          ))}
                        {allStudents
                          .filter((s: any) =>
                            !leadSearchText ||
                            (s.full_name && s.full_name.toLowerCase().includes(leadSearchText.toLowerCase())) ||
                            (s.mobile && s.mobile.includes(leadSearchText))
                          )
                          .slice(0, 20)
                          .map((s: any) => (
                            <SelectItem key={`stu-${s.id}`} value={`stu-${s.id}`}>
                              🎓 {s.full_name} ({s.mobile}) [Student]
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {/* Task Assignee & Priority */}
            {scheduleType === 'task' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Assign To Staff</label>
                  <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                    <SelectTrigger className="bg-white"><SelectValue placeholder="Select staff member" /></SelectTrigger>
                    <SelectContent>
                      {allUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          👤 {u.name} ({u.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Priority</label>
                  <Select value={taskPriority} onValueChange={(v) => setTaskPriority(v as any)}>
                    <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">🔵 Low</SelectItem>
                      <SelectItem value="medium">🟡 Medium</SelectItem>
                      <SelectItem value="high">🔴 High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Date <span className="text-rose-500">*</span></label>
                <Input type="date" value={createDate} onChange={(e) => setCreateDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Time</label>
                <Input type="time" value={followupTime} onChange={(e) => setFollowupTime(e.target.value)} />
              </div>
            </div>

            {/* Discussion Notes / Agenda */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Agenda & Notes</label>
              <Textarea
                placeholder={
                  scheduleType === 'meeting'
                    ? 'Enter meeting agenda, discussion topics, location or Google Meet link...'
                    : scheduleType === 'task'
                    ? 'Enter task instructions and deliverables...'
                    : 'Enter details...'
                }
                value={followupNotes}
                onChange={(e) => setFollowupNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* Private Task Toggle */}
            {scheduleType === 'task' && (
              <div className="flex items-center justify-between rounded-xl border border-slate-200 p-2.5 bg-slate-50/50">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <Lock className="h-3 w-3 text-purple-600" /> Private Task
                  </span>
                  <p className="text-[11px] text-muted-foreground">Only creator and Owner role can view this task</p>
                </div>
                <Switch checked={isPrivateTask} onCheckedChange={setIsPrivateTask} />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
            <Button
              onClick={handleScheduleSubmit}
              disabled={!createDate || (scheduleType !== 'followup' && !eventTitle.trim()) || createFollowUp.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
            >
              {createFollowUp.isPending ? 'Scheduling...' : `Add ${scheduleType.charAt(0).toUpperCase() + scheduleType.slice(1)}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
