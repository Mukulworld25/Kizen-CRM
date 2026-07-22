import { useState } from 'react'
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
} from 'date-fns'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Phone,
  Calendar as CalendarIcon,
  Check,
  Clock,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useCounselors, useLeads } from '@/hooks/useLeads'
import { useCreateFollowUp, useCompleteFollowUp, useRescheduleFollowUp } from '@/hooks/useStudents'
import { useCalendarEvents, type CalendarEvent } from '@/hooks/useCalendarEvents'
import { PageHeader } from '@/components/shared/PageHeader'
import { WhatsAppButton } from '@/components/shared/WhatsAppButton'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export default function CalendarPage() {
  const { can } = useAuth()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day' | 'agenda'>('month')
  const [counselorId, setCounselorId] = useState<string>()

  // Event Type Filters
  const [showFollowups, setShowFollowups] = useState(true)
  const [showInstallments, setShowInstallments] = useState(true)
  const [showDemos, setShowDemos] = useState(true)

  // Dialog States
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createDate, setCreateDate] = useState<string>('')
  const [selectedLeadId, setSelectedLeadId] = useState<string>('')
  const [followupNotes, setFollowupNotes] = useState<string>('')
  const [followupTime, setFollowupTime] = useState<string>('10:00')

  // Reschedule State
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState<string>('')
  const [rescheduleTime, setRescheduleTime] = useState<string>('10:00')
  const [rescheduleNotes, setRescheduleNotes] = useState<string>('')

  // Date range for fetching
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const startDateStr = format(startOfWeek(monthStart), 'yyyy-MM-dd')
  const endDateStr = format(endOfWeek(monthEnd), 'yyyy-MM-dd')

  const { data: events = [] } = useCalendarEvents(startDateStr, endDateStr, counselorId)
  const { data: counselors = [] } = useCounselors()
  const { data: leadsData } = useLeads({ pageSize: 1000 })
  const createFollowUp = useCreateFollowUp()
  const completeFollowUp = useCompleteFollowUp()
  const rescheduleFollowUp = useRescheduleFollowUp()

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
    await rescheduleFollowUp.mutateAsync({
      id: selectedEvent.raw?.id,
      scheduledAt,
      notes: rescheduleNotes,
    })
    setIsRescheduleModalOpen(false)
    setSelectedEvent(null)
  }

  const allLeads = leadsData?.leads ?? []

  // Filter events by type and viewMode
  const filteredEvents = events.filter((e) => {
    if (e.type === 'followup' && !showFollowups) return false
    if (e.type === 'installment' && !showInstallments) return false
    if (e.type === 'demo' && !showDemos) return false

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

  const handleScheduleSubmit = async () => {
    if (!selectedLeadId || !createDate) return
    const scheduledAt = new Date(`${createDate}T${followupTime}:00`).toISOString()
    await createFollowUp.mutateAsync({
      lead_id: selectedLeadId,
      scheduled_at: scheduledAt,
      notes: followupNotes,
      assigned_to: counselorId,
      type: 'call',
      status: 'pending',
    })
    setIsCreateModalOpen(false)
    setFollowupNotes('')
    setSelectedLeadId('')
  }

  // Days array for month view grid
  const daysInMonth = eachDayOfInterval({
    start: startOfWeek(monthStart),
    end: endOfWeek(monthEnd),
  })

  // Helper for event styling
  const getEventBadgeClass = (type: CalendarEvent['type'], status: CalendarEvent['status']) => {
    if (status === 'completed' || status === 'paid') {
      return 'bg-emerald-100 text-emerald-800 border-emerald-300'
    }
    if (status === 'overdue') {
      return 'bg-rose-100 text-rose-800 border-rose-300'
    }
    switch (type) {
      case 'followup':
        return 'bg-sky-100 text-sky-800 border-sky-300'
      case 'installment':
        return 'bg-amber-100 text-amber-800 border-amber-300'
      case 'demo':
        return 'bg-purple-100 text-purple-800 border-purple-300'
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300'
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="CRM Calendar & Schedule" description="Interactive schedule for follow-ups, fee installments, and demos">
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
          <Button onClick={() => { setCreateDate(format(new Date(), 'yyyy-MM-dd')); setIsCreateModalOpen(true) }}>
            <Plus className="h-4 w-4 mr-1.5" /> New Follow-up
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
                className={cn('px-3 py-1 text-xs font-semibold rounded-md transition-all', viewMode === 'month' ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900')}
              >
                Month
              </button>
              <button
                type="button"
                onClick={() => setViewMode('week')}
                className={cn('px-3 py-1 text-xs font-semibold rounded-md transition-all', viewMode === 'week' ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900')}
              >
                Week
              </button>
              <button
                type="button"
                onClick={() => setViewMode('day')}
                className={cn('px-3 py-1 text-xs font-semibold rounded-md transition-all', viewMode === 'day' ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900')}
              >
                Day
              </button>
              <button
                type="button"
                onClick={() => setViewMode('agenda')}
                className={cn('px-3 py-1 text-xs font-semibold rounded-md transition-all', viewMode === 'agenda' ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900')}
              >
                Agenda
              </button>
            </div>

            {/* Category Filters */}
            <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
              <button
                type="button"
                onClick={() => setShowFollowups(!showFollowups)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-medium border flex items-center gap-1 transition-all',
                  showFollowups ? 'bg-sky-50 text-sky-700 border-sky-300' : 'bg-slate-50 text-slate-400 border-slate-200 line-through'
                )}
              >
                <span className="w-2 h-2 rounded-full bg-sky-500" /> Follow-ups
              </button>
              <button
                type="button"
                onClick={() => setShowInstallments(!showInstallments)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-medium border flex items-center gap-1 transition-all',
                  showInstallments ? 'bg-amber-50 text-amber-700 border-amber-300' : 'bg-slate-50 text-slate-400 border-slate-200 line-through'
                )}
              >
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Fees Due
              </button>
              <button
                type="button"
                onClick={() => setShowDemos(!showDemos)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-medium border flex items-center gap-1 transition-all',
                  showDemos ? 'bg-purple-50 text-purple-700 border-purple-300' : 'bg-slate-50 text-slate-400 border-slate-200 line-through'
                )}
              >
                <span className="w-2 h-2 rounded-full bg-purple-500" /> Demos
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MONTH VIEW GRID */}
      {viewMode === 'month' && (
        <Card className="border-border/60 shadow-sm overflow-hidden bg-white">
          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-bold text-slate-600 py-2.5">
            <div>SUN</div><div>MON</div><div>TUE</div><div>WED</div><div>THU</div><div>FRI</div><div>SAT</div>
          </div>

          {/* Month Days Grid */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-200">
            {daysInMonth.map((day) => {
              const dayStr = format(day, 'yyyy-MM-dd')
              const dayEvents = filteredEvents.filter((e) => e.date === dayStr)
              const isCurrentMonth = isSameMonth(day, currentMonth)
              const isDayToday = isToday(day)
              const isDaySelected = isSameDay(day, selectedDate)

              return (
                <div
                  key={dayStr}
                  onClick={() => handleDayClick(day)}
                  className={cn(
                    'min-h-[110px] p-1.5 flex flex-col justify-between transition-colors relative cursor-pointer group hover:bg-slate-50/80',
                    !isCurrentMonth && 'bg-slate-50/40 text-slate-400',
                    isDaySelected && 'bg-amber-50/30'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        'text-xs font-semibold h-6 w-6 rounded-full flex items-center justify-center',
                        isDayToday ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-700'
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleOpenCreateForDay(day, e)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-200 text-slate-600 transition-opacity"
                      title="Add follow-up"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Day Events */}
                  <div className="space-y-1 mt-1 overflow-y-auto max-h-[85px] scrollbar-none">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedEvent(event)
                        }}
                        className={cn(
                          'text-[11px] px-1.5 py-0.5 rounded border font-medium truncate flex items-center justify-between cursor-pointer hover:opacity-85 transition-opacity',
                          getEventBadgeClass(event.type, event.status)
                        )}
                      >
                        <span className="truncate">{event.personName}</span>
                        {event.time && <span className="text-[9px] opacity-75 ml-1 shrink-0">{event.time}</span>}
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
                    onClick={() => setSelectedEvent(event)}
                    className="p-4 rounded-xl border border-slate-200 hover:border-amber-300 hover:shadow-sm transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'p-2.5 rounded-xl text-white font-bold text-xs shrink-0',
                          event.type === 'followup' ? 'bg-sky-500' : event.type === 'installment' ? 'bg-amber-500' : 'bg-purple-500'
                        )}
                      >
                        {event.type === 'followup' ? 'CALL' : event.type === 'installment' ? 'FEE' : 'DEMO'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-slate-800 text-sm">{event.personName}</h4>
                          {event.courseName && <Badge variant="outline">{event.courseName}</Badge>}
                          <Badge className={cn('capitalize text-[10px]', getEventBadgeClass(event.type, event.status))}>
                            {event.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(event.date), 'EEEE, MMM d, yyyy')} {event.time && `at ${event.time}`}
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

      {/* EVENT DETAIL DIALOG */}
      {selectedEvent && (
        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span
                  className={cn(
                    'w-3 h-3 rounded-full',
                    selectedEvent.type === 'followup' ? 'bg-sky-500' : selectedEvent.type === 'installment' ? 'bg-amber-500' : 'bg-purple-500'
                  )}
                />
                {selectedEvent.title}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2 text-sm">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-xs text-muted-foreground font-medium">Date & Time</span>
                  <p className="font-semibold text-slate-800">{format(new Date(selectedEvent.date), 'MMM d, yyyy')}</p>
                  <p className="text-xs text-slate-600">{selectedEvent.time || 'All day'}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground font-medium">Category</span>
                  <p className="font-semibold text-slate-800 capitalize">{selectedEvent.type}</p>
                  <Badge variant="outline" className="capitalize text-[10px] mt-0.5">{selectedEvent.status}</Badge>
                </div>
              </div>

              <div>
                <span className="text-xs text-muted-foreground font-medium">Person Details</span>
                <p className="font-semibold text-slate-800 text-base">{selectedEvent.personName}</p>
                {selectedEvent.mobile && <p className="text-xs text-slate-600">Mobile: {selectedEvent.mobile}</p>}
                {selectedEvent.courseName && <p className="text-xs text-slate-600">Course: {selectedEvent.courseName}</p>}
              </div>

              {selectedEvent.description && (
                <div>
                  <span className="text-xs text-muted-foreground font-medium">Notes / Description</span>
                  <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border">{selectedEvent.description}</p>
                </div>
              )}
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              {selectedEvent.mobile && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button variant="outline" size="sm" asChild className="flex-1">
                    <a href={`tel:${selectedEvent.mobile}`}><Phone className="h-4 w-4 mr-1.5" /> Call</a>
                  </Button>
                  <WhatsAppButton name={selectedEvent.personName} mobile={selectedEvent.mobile} course={selectedEvent.courseName} size="sm" />
                </div>
              )}
              {selectedEvent.type === 'followup' && (
                <>
                  <Button variant="outline" size="sm" onClick={handleOpenReschedule}>
                    <Clock className="h-4 w-4 mr-1.5" /> Reschedule
                  </Button>
                  {selectedEvent.status !== 'completed' && (
                    <Button
                      size="sm"
                      onClick={() => {
                        completeFollowUp.mutate(selectedEvent.raw?.id)
                        setSelectedEvent(null)
                      }}
                    >
                      <Check className="h-4 w-4 mr-1.5" /> Mark Completed
                    </Button>
                  )}
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* RESCHEDULE FOLLOW-UP MODAL */}
      <Dialog open={isRescheduleModalOpen} onOpenChange={setIsRescheduleModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule Follow-up ({selectedEvent?.personName})</DialogTitle>
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
              <textarea
                placeholder="Updated follow-up instructions..."
                value={rescheduleNotes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRescheduleNotes(e.target.value)}
                className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRescheduleModalOpen(false)}>Cancel</Button>
            <Button onClick={handleRescheduleSubmit} disabled={!rescheduleDate || rescheduleFollowUp.isPending}>
              {rescheduleFollowUp.isPending ? 'Rescheduling...' : 'Confirm Reschedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CREATE FOLLOW-UP MODAL */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Follow-up Task</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-slate-700">Select Lead *</label>
              <Select value={selectedLeadId} onValueChange={setSelectedLeadId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Choose a lead" /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {allLeads.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.full_name} ({l.mobile})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Date</label>
                <Input type="date" value={createDate} onChange={(e) => setCreateDate(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Time</label>
                <Input type="time" value={followupTime} onChange={(e) => setFollowupTime(e.target.value)} className="mt-1" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Follow-up Notes</label>
              <textarea
                placeholder="Details of call or discussion needed..."
                value={followupNotes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFollowupNotes(e.target.value)}
                className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
            <Button onClick={handleScheduleSubmit} disabled={!selectedLeadId || !createDate || createFollowUp.isPending}>
              {createFollowUp.isPending ? 'Scheduling...' : 'Schedule Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
