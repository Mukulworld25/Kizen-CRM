import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useBatches } from '@/hooks/useStudents'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatsCard } from '@/components/shared/StatsCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { GraduationCap, Users, ClipboardCheck, Award } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import type { Student } from '@/types'

export default function FacultyDashboard() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { data: batches = [], isLoading: batchesLoading } = useBatches()
  const [selectedBatch, setSelectedBatch] = useState<string>('')
  const [attendanceOpen, setAttendanceOpen] = useState(false)
  const [certOpen, setCertOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0])

  const { data: students = [] } = useQuery({
    queryKey: ['faculty-students', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*, course:courses(name), batch:batches(id, batch_name)')
        .eq('faculty_id', profile?.id)
        .order('full_name')
      if (error) throw error
      return (data ?? []) as Student[]
    },
    enabled: !!profile,
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
      toast.success('Attendance marked')
    },
    onError: (err) => toast.error(err.message),
  })

  const updateCertification = useMutation({
    mutationFn: async ({ student_id, status }: { student_id: string; status: string }) => {
      const { error } = await supabase.from('students').update({ certification_status: status }).eq('id', student_id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faculty-students'] })
      toast.success('Certification status updated')
      setCertOpen(false)
    },
    onError: (err) => toast.error(err.message),
  })

  const activeStudents = students.filter(s => s.is_active)
  const needsCert = students.filter(s => s.certification_status === 'in_progress')
  const completed = students.filter(s => s.certification_status === 'completed' || s.certification_status === 'issued')

  return (
    <div>
      <PageHeader title="Faculty Dashboard" description="Manage your batches and students" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatsCard title="My Batches" value={batches.length} icon={GraduationCap} loading={batchesLoading} />
        <StatsCard title="Active Students" value={activeStudents.length} icon={Users} color="bg-primary-light" loading={batchesLoading} />
        <StatsCard title="Certification In Progress" value={needsCert.length} icon={ClipboardCheck} color="bg-accent" loading={batchesLoading} />
        <StatsCard title="Certification Completed" value={completed.length} icon={Award} color="bg-success" loading={batchesLoading} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        <Card>
          <CardHeader><CardTitle className="text-base">My Batches</CardTitle></CardHeader>
          <CardContent>
            {batches.length === 0 ? (
              <p className="text-sm text-muted-foreground">No batches assigned yet.</p>
            ) : (
              <div className="space-y-2">
                {batches.map((b) => (
                  <div key={b.id} className="rounded-lg border border-border p-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{b.batch_name}</p>
                        <p className="text-xs text-muted-foreground">{b.course?.name} — {b.timing ?? '—'}</p>
                      </div>
                      <Badge variant={b.status === 'ongoing' ? 'success' : b.status === 'upcoming' ? 'warning' : 'default'}>
                        {b.status}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{b.enrolled_count ?? 0}/{b.total_seats ?? 0} enrolled</span>
                      <span>{b.start_date ? format(new Date(b.start_date), 'MMM d') : '—'} → {b.end_date ? format(new Date(b.end_date), 'MMM d') : '—'}</span>
                      <Button size="sm" variant="outline" onClick={() => { setSelectedBatch(b.id); setAttendanceOpen(true) }}>Mark Attendance</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">All Students</CardTitle></CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <p className="text-sm text-muted-foreground">No students assigned.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Certification</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.full_name}</TableCell>
                      <TableCell>{s.course?.name ?? '—'}</TableCell>
                      <TableCell>{s.batch?.batch_name ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant={s.certification_status === 'completed' || s.certification_status === 'issued' ? 'success' : 'warning'}>
                          {s.certification_status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => { setSelectedStudent(s); setCertOpen(true) }}>
                          Update
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Attendance Dialog */}
      <Dialog open={attendanceOpen} onOpenChange={setAttendanceOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Mark Attendance — {batches.find(b => b.id === selectedBatch)?.batch_name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Date</Label><Input type="date" value={attDate} onChange={(e) => setAttDate(e.target.value)} /></div>
            {batchStudents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No students in this batch.</p>
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {batchStudents.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.full_name}</TableCell>
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

      {/* Certification Dialog */}
      <Dialog open={certOpen} onOpenChange={setCertOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Certification — {selectedStudent?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Label>Certification Status</Label>
            <Select onValueChange={(v) => updateCertification.mutate({ student_id: selectedStudent!.id, status: v })}>
              <SelectTrigger><SelectValue placeholder={selectedStudent?.certification_status?.replace('_', ' ')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="issued">Issued</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCertOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}