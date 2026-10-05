import React, { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { format } from 'date-fns'
import { Phone, CheckCircle, Calendar as CalendarIcon, ListChecks, CalendarDays, Plus, Search } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useFollowUps, useCompleteFollowUp, useCreateFollowUp } from '@/hooks/useStudents'
import { useCounselors } from '@/hooks/useLeads'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/shared/PageHeader'
import { WhatsAppButton } from '@/components/shared/WhatsAppButton'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import HodTaskSheet from '@/components/shared/HodTaskSheet'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

interface MinimalLead {
  id: string
  full_name: string
  mobile: string
}

export default function FollowUps() {
  const [searchParams] = useSearchParams()
  const { profile, can } = useAuth()
  const [tab, setTab] = useState('staff-tasks')
  const [counselorId, setCounselorId] = useState<string>()
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [followupFilterQuery, setFollowupFilterQuery] = useState('')

  useEffect(() => {
    const tabParam = searchParams.get('tab') || searchParams.get('filter')
    if (tabParam === 'overdue') {
      setTab('overdue')
    } else if (tabParam === 'today') {
      setTab('today')
    } else if (tabParam === 'staff-tasks') {
      setTab('staff-tasks')
    } else if (tabParam) {
      setTab(tabParam)
    }
  }, [searchParams])

  // Add Task Modal State (for lead follow-up calls)
  const [addTaskOpen, setAddTaskOpen] = useState(false)
  const [leadSearch, setLeadSearch] = useState('')
  const [searchResults, setSearchResults] = useState<MinimalLead[]>([])
  const [selectedLead, setSelectedLead] = useState<MinimalLead | null>(null)
  const [taskType, setTaskType] = useState<'call' | 'whatsapp' | 'email' | 'meeting' | 'demo'>('call')
  const [scheduledTime, setScheduledTime] = useState('')
  const [taskNotes, setTaskNotes] = useState('')
  const [assignedTo, setAssignedTo] = useState<string>('')

  const targetDate = tab === 'date' ? selectedDate : undefined
  const { data: followUps = [], isLoading } = useFollowUps(
    tab === 'staff-tasks' ? 'today' : tab,
    counselorId,
    targetDate
  )
  const completeFollowUp = useCompleteFollowUp()
  const createFollowUp = useCreateFollowUp()
  const { data: counselors = [] } = useCounselors()

  const completedCount = followUps.filter((f) => f.status === 'completed').length
  const totalCount = followUps.length
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const handleDateChange = (val: string) => {
    setSelectedDate(val)
    if (val) {
      setTab('date')
    }
  }

  const handleSearchLeads = async (query: string) => {
    setLeadSearch(query)
    if (query.trim().length < 2) {
      setSearchResults([])
      return
    }
    const { data } = await supabase
      .from('leads')
      .select('id, full_name, mobile')
      .or(`full_name.ilike.%${query}%,mobile.ilike.%${query}%`)
      .limit(6)
    setSearchResults(data || [])
  }

  const handleCreateTask = async () => {
    if (!selectedLead) {
      toast.error('Please select a lead or student')
      return
    }
    if (!scheduledTime) {
      toast.error('Please select date & time for the follow-up')
      return
    }

    try {
      await createFollowUp.mutateAsync({
        lead_id: selectedLead.id,
        type: taskType,
        scheduled_at: new Date(scheduledTime).toISOString(),
        notes: taskNotes,
        assigned_to: assignedTo || profile?.id,
        status: 'pending',
      })
      toast.success('Follow-up scheduled successfully!')
      setAddTaskOpen(false)
      setSelectedLead(null)
      setLeadSearch('')
      setTaskNotes('')
      setScheduledTime('')
    } catch (err) {
      toast.error('Failed to create follow-up: ' + (err as Error).message)
    }
  }

  const filteredFollowUps = followUps.filter((f) => {
    if (!followupFilterQuery.trim()) return true
    const q = followupFilterQuery.toLowerCase().trim()
    const nameMatch = (f.lead?.full_name || '').toLowerCase().includes(q)
    const mobileMatch = (f.lead?.mobile || '').toLowerCase().includes(q)
    const notesMatch = (f.notes || '').toLowerCase().includes(q)
    return nameMatch || mobileMatch || notesMatch
  })

  const renderFollowUpList = () => (
    <div className="space-y-4">
      {/* Search Bar for Leads */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search student or lead by name, phone, or notes..."
            value={followupFilterQuery}
            onChange={(e) => setFollowupFilterQuery(e.target.value)}
            className="pl-9 h-9 text-xs bg-white"
          />
        </div>
        <Button size="sm" onClick={() => setAddTaskOpen(true)} className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold h-9">
          <Plus className="h-4 w-4 mr-1.5" /> Schedule Call / Demo
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : filteredFollowUps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center bg-white rounded-xl border border-slate-200">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-slate-800">All caught up!</p>
          <p className="text-xs text-muted-foreground mt-1">No student follow-up calls in this view.</p>
          <Button size="sm" onClick={() => setAddTaskOpen(true)} className="mt-4 bg-amber-500 text-slate-950 font-bold">
            <Plus className="h-4 w-4 mr-1.5" /> Schedule Follow-up
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredFollowUps.map((fu) => (
            <Card key={fu.id} className={cn(fu.status === 'overdue' ? 'ring-2 ring-rose-500 ring-offset-1' : 'hover:shadow-xs transition-all')}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900 text-sm">{fu.lead?.full_name || 'Prospective Lead'}</span>
                    <Badge variant="outline" className="capitalize text-[10px]">{fu.type}</Badge>
                    {fu.status === 'overdue' && <Badge variant="destructive" className="text-[10px]">Overdue</Badge>}
                    {fu.status === 'completed' && <Badge variant="success" className="text-[10px]">Completed</Badge>}
                    {(fu.lead as any)?.course?.name && (
                      <span className="text-xs text-slate-500 font-medium">· {(fu.lead as any).course.name}</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1 font-mono">{fu.lead?.mobile}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {fu.scheduled_at ? format(new Date(fu.scheduled_at), 'MMM d, yyyy h:mm a') : '—'}
                    {fu.notes && ` · ${fu.notes}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {fu.lead?.mobile && (
                    <>
                      <Button variant="outline" size="sm" asChild className="h-8">
                        <a href={`tel:${fu.lead?.mobile}`}><Phone className="h-3.5 w-3.5 mr-1" /> Call</a>
                      </Button>
                      <WhatsAppButton
                        name={fu.lead.full_name}
                        mobile={fu.lead.mobile}
                        course={(fu.lead as { course?: { name: string } }).course?.name}
                        size="sm"
                      />
                    </>
                  )}
                  {fu.status !== 'completed' && (
                    <Button size="sm" onClick={() => completeFollowUp.mutate(fu.id)} className="h-8 bg-slate-900 text-white hover:bg-slate-800">
                      <CheckCircle className="h-3.5 w-3.5 mr-1" /> Complete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader title="Tasks & Follow-ups" description="Manage team task delegations and daily student follow-up calls">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link to="/calendar">
              <CalendarDays className="h-4 w-4 mr-2 text-primary" /> Full Calendar
            </Link>
          </Button>
          {can('assignCounselor') && (
            <Select value={counselorId ?? 'all'} onValueChange={(v) => setCounselorId(v === 'all' ? undefined : v)}>
              <SelectTrigger className="w-44 bg-white"><SelectValue placeholder="All Counselors" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Counselors</SelectItem>
                {counselors.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      </PageHeader>

      {/* Tabs Layout */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-slate-100 p-1 rounded-xl flex-wrap h-auto gap-1">
          <TabsTrigger value="staff-tasks" className="font-semibold text-xs px-3 py-1.5 data-[state=active]:bg-white data-[state=active]:shadow-xs">
            📋 Team Tasks & Delegation
          </TabsTrigger>
          <TabsTrigger value="today" className="font-semibold text-xs px-3 py-1.5 data-[state=active]:bg-white data-[state=active]:shadow-xs">
            📞 Today's Calls ({followUps.filter((f) => f.status !== 'completed').length})
          </TabsTrigger>
          <TabsTrigger value="overdue" className="font-semibold text-xs px-3 py-1.5 data-[state=active]:bg-white data-[state=active]:shadow-xs">
            ⚠️ Overdue Calls
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="font-semibold text-xs px-3 py-1.5 data-[state=active]:bg-white data-[state=active]:shadow-xs">
            🗓️ Upcoming Calls
          </TabsTrigger>
          {selectedDate && (
            <TabsTrigger value="date" className="font-semibold text-xs px-3 py-1.5 data-[state=active]:bg-white data-[state=active]:shadow-xs">
              📅 Date ({selectedDate})
            </TabsTrigger>
          )}
          <TabsTrigger value="all-followups" className="font-semibold text-xs px-3 py-1.5 data-[state=active]:bg-white data-[state=active]:shadow-xs">
            🗂️ All Student Calls
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Staff Tasks & Delegation (ONLY renders HodTaskSheet, ZERO student leads) */}
        <TabsContent value="staff-tasks" className="mt-4">
          <HodTaskSheet />
        </TabsContent>

        {/* Tab 2: Today's Student Calls */}
        <TabsContent value="today" className="mt-4">
          {/* Daily Task List Overview Card */}
          <Card className="border-border/60 shadow-sm bg-gradient-to-br from-amber-500/5 to-slate-50 mb-4">
            <CardContent className="p-4 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                  <ListChecks className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 text-sm">Today's Student Calling Checklist</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {completedCount} of {totalCount} calls completed today ({progressPercent}%)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className="flex-1 sm:w-36 h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                </div>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-slate-500" />
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-36 h-8 text-xs bg-white border-slate-200"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          {renderFollowUpList()}
        </TabsContent>

        {/* Tab 3: Overdue Student Calls */}
        <TabsContent value="overdue" className="mt-4">
          <div className="mb-3">
            <h3 className="font-semibold text-slate-800 text-sm">Overdue Student Calls</h3>
            <p className="text-xs text-muted-foreground">Follow-ups whose scheduled time has passed and require immediate attention</p>
          </div>
          {renderFollowUpList()}
        </TabsContent>

        {/* Tab 4: Upcoming Student Calls */}
        <TabsContent value="upcoming" className="mt-4">
          <div className="mb-3">
            <h3 className="font-semibold text-slate-800 text-sm">Upcoming Student Calls</h3>
            <p className="text-xs text-muted-foreground">Scheduled future follow-up calls and admission counseling sessions</p>
          </div>
          {renderFollowUpList()}
        </TabsContent>

        {/* Tab 5: By Date */}
        {selectedDate && (
          <TabsContent value="date" className="mt-4">
            <div className="mb-3">
              <h3 className="font-semibold text-slate-800 text-sm">Follow-up Calls on {selectedDate}</h3>
            </div>
            {renderFollowUpList()}
          </TabsContent>
        )}

        {/* Tab 6: All Student Calls */}
        <TabsContent value="all-followups" className="mt-4">
          <div className="mb-3">
            <h3 className="font-semibold text-slate-800 text-sm">All Student & Lead Follow-up History</h3>
            <p className="text-xs text-muted-foreground">Complete record of student admissions calls and prospective inquiries</p>
          </div>
          {renderFollowUpList()}
        </TabsContent>
      </Tabs>

      {/* Add Lead Follow-up Modal */}
      <Dialog open={addTaskOpen} onOpenChange={setAddTaskOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Student / Lead Follow-up</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Search Lead */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Select Lead / Student <span className="text-rose-500">*</span></label>
              {selectedLead ? (
                <div className="flex items-center justify-between p-2.5 rounded-xl border border-amber-300 bg-amber-50">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{selectedLead.full_name}</p>
                    <p className="text-xs text-slate-500">{selectedLead.mobile}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedLead(null)} className="h-7 text-xs text-red-600">
                    Change
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Type name or mobile to search..."
                    value={leadSearch}
                    onChange={(e) => handleSearchLeads(e.target.value)}
                    className="pl-9"
                  />
                  {searchResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                      {searchResults.map((l) => (
                        <div
                          key={l.id}
                          onClick={() => { setSelectedLead(l); setSearchResults([]) }}
                          className="p-2.5 hover:bg-amber-50 cursor-pointer border-b last:border-0"
                        >
                          <p className="text-sm font-medium text-slate-800">{l.full_name}</p>
                          <p className="text-xs text-slate-500">{l.mobile}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Task Type */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Follow-up Type</label>
              <Select value={taskType} onValueChange={(v) => setTaskType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">📞 Phone Call</SelectItem>
                  <SelectItem value="whatsapp">💬 WhatsApp Message</SelectItem>
                  <SelectItem value="email">✉️ Email</SelectItem>
                  <SelectItem value="meeting">🤝 In-Person Meeting</SelectItem>
                  <SelectItem value="demo">🎓 Demo Session</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date & Time */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Scheduled Date & Time <span className="text-rose-500">*</span></label>
              <Input
                type="datetime-local"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              />
            </div>

            {/* Assigned Counselor */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Assigned Counselor</label>
              <Select value={assignedTo || profile?.id || ''} onValueChange={setAssignedTo}>
                <SelectTrigger><SelectValue placeholder="Select Counselor" /></SelectTrigger>
                <SelectContent>
                  {counselors.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Discussion Agenda / Notes</label>
              <textarea
                placeholder="Follow up discussion agenda..."
                value={taskNotes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTaskNotes(e.target.value)}
                className="w-full min-h-[80px] p-3 text-sm border rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none border-slate-200"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => setAddTaskOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateTask} disabled={createFollowUp.isPending || !selectedLead || !scheduledTime} className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
                {createFollowUp.isPending ? 'Saving...' : 'Save Follow-up'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
