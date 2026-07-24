import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useBatches, useUpdateBatch, useUsers } from '@/hooks/useStudents'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatsCard } from '@/components/shared/StatsCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/lib/supabase'
import { GraduationCap, Users, Clock, Calendar, Pencil, UserCheck, Plus } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import type { Student, Batch } from '@/types'

export default function FacultyDashboard() {
  const navigate = useNavigate()
  const { profile, isOwner } = useAuth()
  const queryClient = useQueryClient()
  const { data: batches = [], isLoading: batchesLoading } = useBatches()
  const { data: allUsers = [] } = useUsers()
  const updateBatch = useUpdateBatch()

  const [selectedBatch, setSelectedBatch] = useState<string>('')
  const [attendanceOpen, setAttendanceOpen] = useState(false)
  const [editBatchModal, setEditBatchModal] = useState<Batch | null>(null)
  const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0])

  // Edit Batch State
  const [editFacultyId, setEditFacultyId] = useState<string>('')
  const [editDays, setEditDays] = useState<string>('')
  const [editTiming, setEditTiming] = useState<string>('')
  const [editStatus, setEditStatus] = useState<string>('ongoing')

  // Filter faculty members (role = 'faculty' only)
  const facultyMembers = allUsers.filter((u) => u.role === 'faculty')

  // All Students query across system
  const { data: allStudents = [] } = useQuery({
    queryKey: ['all-enrolled-students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*, course:courses(name), batch:batches(id, batch_name, timing, days_of_week), faculty:users(name)')
        .order('full_name')
      if (error) throw error
      return (data ?? []) as Student[]
    },
  })



  const { data: batchStudents = [] } = useQuery({
    queryKey: ['batch-students', selectedBatch],
    queryFn: async () => {
      if (!selectedBatch) return []
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('batch_id', selectedBatch)
        .order('full_name')
      if (error) throw error
      return (data ?? []) as Student[]
    },
    enabled: !!selectedBatch,
  })

  const markAttendance = useMutation({
    mutationFn: async ({ student_id, status }: { student_id: string; status: string }) => {
      const { error } = await supabase.from('attendance').insert({
        student_id,
        batch_id: selectedBatch,
        date: attDate,
        status,
        marked_by: profile?.id,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch-students'] })
      toast.success('Attendance marked successfully')
    },
    onError: (err) => toast.error(err.message),
  })



  const handleOpenEditBatch = (batch: Batch) => {
    setEditBatchModal(batch)
    setEditFacultyId(batch.faculty_id || '')
    setEditDays(batch.days_of_week || 'Mon, Wed, Fri')
    setEditTiming(batch.timing || '10:00 AM - 12:00 PM')
    setEditStatus(batch.status || 'ongoing')
  }

  const handleSaveBatchSchedule = async () => {
    if (!editBatchModal) return
    await updateBatch.mutateAsync({
      id: editBatchModal.id,
      updates: {
        faculty_id: editFacultyId || null,
        days_of_week: editDays,
        timing: editTiming,
        status: editStatus as 'upcoming' | 'ongoing' | 'completed',
      },
    })
    setEditBatchModal(null)
  }

  const isManagementView = isOwner || profile?.role === 'admin' || profile?.role === 'reception' || profile?.role === 'accounts'

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <PageHeader
          title={isManagementView ? 'Faculty & Timetable Management' : 'Faculty Dashboard'}
          description={isManagementView ? 'Manage faculty assignments, course timetables, class days, and batch rosters' : 'Manage your batches and enrolled students'}
        />
        {isManagementView && (
          <Button onClick={() => navigate('/settings')} className="shrink-0 bg-primary hover:bg-primary/90 text-white shadow-md">
            <Plus className="mr-2 h-4 w-4" /> Add Faculty Member
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
        <StatsCard title="Faculty Members" value={facultyMembers.length} icon={Users} loading={batchesLoading} />
        <StatsCard title="Active Batches" value={batches.length} icon={GraduationCap} color="bg-primary-light" loading={batchesLoading} />
        <StatsCard title="Classes Today" value={batches.filter((b) => b.status === 'ongoing').length} icon={Clock} color="bg-success" loading={batchesLoading} />
      </div>

      <Tabs defaultValue="directory">
        <TabsList className="mb-4">
          <TabsTrigger value="directory">Faculty Directory & Schedule</TabsTrigger>
          <TabsTrigger value="batches">Batch Timetables ({batches.length})</TabsTrigger>
        </TabsList>

        {/* TAB 1: FACULTY DIRECTORY & SCHEDULE */}
        <TabsContent value="directory" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {facultyMembers.map((fac) => {
              const facBatches = batches.filter((b) => b.faculty_id === fac.id)
              const facStudentsCount = allStudents.filter((s) => s.faculty_id === fac.id).length

              return (
                <Card key={fac.id} className="shadow-sm hover:shadow-md transition-all border-border/80">
                  <CardHeader className="pb-3 border-b border-border/40 bg-slate-50/50 rounded-t-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white font-bold text-sm">
                          {fac.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <CardTitle className="text-base font-bold">{fac.name}</CardTitle>
                          <p className="text-xs text-muted-foreground capitalize">{fac.role} · {fac.email}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="capitalize text-xs font-semibold">
                        {facBatches.length} Batches
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    <div className="text-xs text-muted-foreground font-medium">Assigned Batches & Schedule:</div>
                    {facBatches.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No batches assigned yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {facBatches.map((b) => (
                          <div key={b.id} className="rounded-lg bg-slate-50 p-2.5 border border-slate-200/70 text-xs">
                            <div className="font-semibold text-slate-800 flex items-center justify-between">
                              <span>{b.batch_name}</span>
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{b.status}</Badge>
                            </div>
                            <div className="text-muted-foreground mt-1 flex items-center gap-2 text-[11px]">
                              <Calendar className="h-3 w-3 text-primary" />
                              <span>{b.days_of_week || 'Mon, Wed, Fri'}</span>
                              <Clock className="h-3 w-3 text-amber-600 ml-1" />
                              <span>{b.timing || '10:00 AM - 12:00 PM'}</span>
                            </div>
                            <div className="mt-1 text-[11px] text-slate-500 font-medium">
                              Course: {b.course?.name || '—'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pt-2 flex items-center justify-between border-t border-border/40 text-xs">
                      <span className="text-muted-foreground">Enrolled Students: <strong className="text-slate-800">{facStudentsCount}</strong></span>
                      {isManagementView && (
                        <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg" onClick={() => {
                          const targetBatch = facBatches[0] || batches[0]
                          if (targetBatch) handleOpenEditBatch({ ...targetBatch, faculty_id: fac.id })
                        }}>
                          <Pencil className="h-3 w-3 mr-1" /> Edit Schedule
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* TAB 2: BATCH TIMETABLES GRID */}
        <TabsContent value="batches">
          <Card className="shadow-sm">
            <CardHeader className="border-b border-border/50 pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>All Batch Timetables & Schedules</span>
                <span className="text-xs text-muted-foreground font-normal">Click "Edit Schedule" to update Faculty, Days, or Class Timings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Batch Name</TableHead>
                    <TableHead className="font-semibold">Course</TableHead>
                    <TableHead className="font-semibold">Assigned Faculty</TableHead>
                    <TableHead className="font-semibold">Schedule Days</TableHead>
                    <TableHead className="font-semibold">Class Timings</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium text-slate-900">{b.batch_name}</TableCell>
                      <TableCell className="text-slate-600">{b.course?.name ?? '—'}</TableCell>
                      <TableCell>
                        {b.faculty?.name ? (
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                            <UserCheck className="h-3.5 w-3.5 text-success" />
                            {b.faculty.name}
                          </div>
                        ) : (
                          <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-700 font-medium">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-primary" />
                          {b.days_of_week || 'Mon, Wed, Fri'}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-700 font-medium">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-amber-600" />
                          {b.timing || '10:00 AM - 12:00 PM'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={b.status === 'ongoing' ? 'success' : b.status === 'upcoming' ? 'warning' : 'default'} className="capitalize">
                          {b.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" className="h-8 text-xs rounded-lg" onClick={() => { setSelectedBatch(b.id); setAttendanceOpen(true) }}>
                            Mark Attendance
                          </Button>
                          {isManagementView && (
                            <Button size="sm" variant="ghost" className="h-8 text-xs rounded-lg" onClick={() => handleOpenEditBatch(b)}>
                              <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>


      </Tabs>

      {/* EDIT BATCH SCHEDULE & FACULTY MODAL */}
      <Dialog open={!!editBatchModal} onOpenChange={(o) => { if (!o) setEditBatchModal(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Batch Schedule & Faculty — {editBatchModal?.batch_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-semibold">Assign Faculty</Label>
              <Select value={editFacultyId} onValueChange={setEditFacultyId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select Faculty" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {facultyMembers.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name} ({f.role})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Class Days</Label>
              <Select value={editDays} onValueChange={setEditDays}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select Class Days" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mon, Wed, Fri">Mon, Wed, Fri</SelectItem>
                  <SelectItem value="Tue, Thu, Sat">Tue, Thu, Sat</SelectItem>
                  <SelectItem value="Mon to Sat">Mon to Sat (Daily)</SelectItem>
                  <SelectItem value="Saturday & Sunday">Saturday & Sunday (Weekend)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Class Timing</Label>
              <Select value={editTiming} onValueChange={setEditTiming}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select Timing" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10:00 AM - 12:00 PM">10:00 AM - 12:00 PM (Morning)</SelectItem>
                  <SelectItem value="01:00 PM - 03:00 PM">01:00 PM - 03:00 PM (Afternoon)</SelectItem>
                  <SelectItem value="03:00 PM - 05:00 PM">03:00 PM - 05:00 PM (Evening)</SelectItem>
                  <SelectItem value="05:00 PM - 07:00 PM">05:00 PM - 07:00 PM (Late Evening)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Batch Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setEditBatchModal(null)}>Cancel</Button>
            <Button onClick={handleSaveBatchSchedule} disabled={updateBatch.isPending}>
              {updateBatch.isPending ? 'Saving...' : 'Save Schedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attendance Dialog */}
      <Dialog open={attendanceOpen} onOpenChange={setAttendanceOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Mark Attendance — {batches.find(b => b.id === selectedBatch)?.batch_name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label className="text-xs font-semibold">Date</Label><Input type="date" value={attDate} onChange={(e) => setAttDate(e.target.value)} /></div>
            {batchStudents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No students in this batch.</p>
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {batchStudents.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.full_name}</TableCell>
                      <TableCell>
                        <Select onValueChange={(v) => markAttendance.mutate({ student_id: s.id, status: v })}>
                          <SelectTrigger className="w-32"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="present">Present</SelectItem>
                            <SelectItem value="absent">Absent</SelectItem>
                            <SelectItem value="late">Late</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttendanceOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </div>
  )
}