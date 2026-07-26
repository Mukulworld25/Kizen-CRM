import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useBatches, useUpdateBatch } from '@/hooks/useStudents'
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { GraduationCap, Users, Award, BookOpen, ShieldAlert, Plus, Pencil } from 'lucide-react'
import type { Student, User } from '@/types'

export default function FacultyDashboard() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { data: batches = [], isLoading: batchesLoading } = useBatches()
  const [selectedBatch, setSelectedBatch] = useState<string>('')
  const [attendanceOpen, setAttendanceOpen] = useState(false)
  const [certOpen, setCertOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0])

  // Add Faculty state
  const [addFacultyOpen, setAddFacultyOpen] = useState(false)
  const [facultyName, setFacultyName] = useState('')
  const [facultyEmail, setFacultyEmail] = useState('')
  const [facultyPhone, setFacultyPhone] = useState('')

  // Batch assignment state
  const [batchAssignOpen, setBatchAssignOpen] = useState(false)
  const [selectedFacultyId, setSelectedFacultyId] = useState<string | null>(null)
  const [selectedFacultyName, setSelectedFacultyName] = useState('')
  const [batchFacultyId, setBatchFacultyId] = useState<string>('')
  const updateBatch = useUpdateBatch()

  const addFaculty = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .insert({ name: facultyName, email: facultyEmail, phone: facultyPhone || null, role: 'faculty', is_active: true })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faculty-roster'] })
      toast.success('Faculty member added')
      setAddFacultyOpen(false)
      setFacultyName('')
      setFacultyEmail('')
      setFacultyPhone('')
    },
    onError: (err) => toast.error(err.message),
  })

  // Real faculty roster from database (no fake names)
  const { data: facultyRoster = [], isLoading: rosterLoading } = useQuery({
    queryKey: ['faculty-roster'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'faculty')
        .order('name')
      if (error) throw error
      return (data ?? []) as User[]
    },
  })

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

  const activeStudents = students.filter((s) => s.is_active)
  const completed = students.filter((s) => s.certification_status === 'completed' || s.certification_status === 'issued')

  return (
    <div>
      <PageHeader title="Faculty Module" description="Faculty roster, batch management & student grading" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatsCard title="Faculty Roster" value={facultyRoster.length} icon={BookOpen} loading={rosterLoading} />
        <StatsCard title="Assigned Batches" value={batches.length} icon={GraduationCap} loading={batchesLoading} />
        <StatsCard title="Active Students" value={activeStudents.length} icon={Users} color="bg-primary-light" loading={batchesLoading} />
        <StatsCard title="Certifications Issued" value={completed.length} icon={Award} color="bg-success" loading={batchesLoading} />
      </div>

      {/* Real Faculty Roster Section */}
      <Card className="mb-6 border border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-3">
          <div>
            <CardTitle className="text-base font-bold">Faculty Roster</CardTitle>
            <p className="text-xs text-muted-foreground">Official registered teaching faculty members</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">Real Roster Only</Badge>
            <Button size="sm" variant="outline" onClick={() => setAddFacultyOpen(true)}>
              <Plus className="h-4 w-4" /> Add Faculty
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {rosterLoading ? (
            <p className="text-xs text-slate-500 py-4 text-center">Loading faculty roster...</p>
          ) : facultyRoster.length === 0 ? (
            <div className="text-center py-8 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <ShieldAlert className="mx-auto h-8 w-8 text-amber-500 mb-2" />
              <p className="text-sm font-semibold text-slate-700">No faculty members in roster</p>
              <p className="text-xs text-slate-500 mt-1">
                Faculty accounts will populate here automatically once added to user accounts with the 'faculty' role.
              </p>
              <Button size="sm" className="mt-3" onClick={() => setAddFacultyOpen(true)}>
                <Plus className="h-4 w-4" /> Add First Faculty
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Faculty Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned Batches</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {facultyRoster.map((f) => {
                  const facultyBatches = batches.filter(b => b.faculty_id === f.id)
                  return (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{f.name}</TableCell>
                      <TableCell>{f.email}</TableCell>
                      <TableCell>{f.phone ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant={f.is_active ? 'success' : 'secondary'}>
                          {f.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {facultyBatches.length === 0 ? (
                            <span className="text-xs text-slate-400">None</span>
                          ) : (
                            facultyBatches.map(b => (
                              <Badge key={b.id} variant="outline" className="text-[10px]">{b.batch_name}</Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => {
                          setSelectedFacultyId(f.id)
                          setSelectedFacultyName(f.name)
                          setBatchFacultyId('')
                          setBatchAssignOpen(true)
                        }}>
                          <Pencil className="h-3.5 w-3.5" /> Assign Batch
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Batches</CardTitle></CardHeader>
          <CardContent>
            {batches.length === 0 ? (
              <p className="text-sm text-muted-foreground">No batches assigned yet.</p>
            ) : (
              <div className="space-y-2">
                {batches.map((b) => (
                  <div key={b.id} className="rounded-lg border border-border p-3 hover:bg-[var(--muted)] transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{b.batch_name}</p>
                        <p className="text-xs text-muted-foreground">{b.course?.name} — {b.timing ?? '—'}</p>
                      </div>
                      <Badge variant={b.status === 'ongoing' ? 'success' : b.status === 'upcoming' ? 'warning' : 'default'}>
                        {b.status}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-4 text-xs text-muted-foreground">
                      <span>{b.enrolled_count ?? 0}/{b.total_seats ?? 0} enrolled</span>
                      <Button size="sm" variant="outline" onClick={() => { setSelectedBatch(b.id); setAttendanceOpen(true) }}>Mark Attendance</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Assigned Students</CardTitle></CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <p className="text-sm text-muted-foreground">No students assigned to your profile.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Certification</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.full_name}</TableCell>
                      <TableCell>{s.course?.name ?? '—'}</TableCell>
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
          <DialogHeader><DialogTitle>Mark Attendance — {batches.find((b) => b.id === selectedBatch)?.batch_name}</DialogTitle></DialogHeader>
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

      {/* Add Faculty Dialog */}
      <Dialog open={addFacultyOpen} onOpenChange={setAddFacultyOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Faculty Member</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Full Name</Label>
              <Input value={facultyName} onChange={(e) => setFacultyName(e.target.value)} placeholder="e.g. Dr. Priya Sharma" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={facultyEmail} onChange={(e) => setFacultyEmail(e.target.value)} placeholder="priya@kizen.com" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={facultyPhone} onChange={(e) => setFacultyPhone(e.target.value)} placeholder="+91 98765 43210" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddFacultyOpen(false)}>Cancel</Button>
            <Button onClick={() => addFaculty.mutate()} disabled={!facultyName || !facultyEmail}>
              Add Faculty
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Assignment Dialog */}
      <Dialog open={batchAssignOpen} onOpenChange={setBatchAssignOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Batch — {selectedFacultyName}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Label>Select a batch to assign</Label>
            <Select value={batchFacultyId} onValueChange={setBatchFacultyId}>
              <SelectTrigger><SelectValue placeholder="Choose batch..." /></SelectTrigger>
              <SelectContent>
                {batches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.batch_name} ({b.course?.name ?? 'No course'}) — Current: {b.faculty?.name ?? 'Unassigned'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchAssignOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (batchFacultyId) {
                  updateBatch.mutate({ id: batchFacultyId, faculty_id: selectedFacultyId })
                  setBatchAssignOpen(false)
                }
              }}
              disabled={!batchFacultyId}
            >
              Assign
            </Button>
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