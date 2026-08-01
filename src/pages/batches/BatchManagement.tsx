import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { useBatches, useUsers, useUpdateBatch, useCreateBatch, useDeleteBatch } from '@/hooks/useStudents'
import { useCourses } from '@/hooks/useLeads'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users as UsersIcon, Calendar as CalendarIcon, Clock, CheckCircle, Edit, Plus, Trash2, Eye } from 'lucide-react'
import type { Batch } from '@/types'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input, Label } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'

export default function BatchManagement() {
  const navigate = useNavigate()
  const { can, isOwner } = useAuth()
  const { data: batches = [], isLoading } = useBatches()
  const { data: users = [] } = useUsers()
  const { data: courses = [] } = useCourses()
  const createBatch = useCreateBatch()
  const updateBatch = useUpdateBatch()
  const deleteBatch = useDeleteBatch()

  // Modal States
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null)

  // Form State
  const [formData, setFormData] = useState<Partial<Batch>>({
    batch_name: '',
    course_id: '',
    total_seats: 30,
    start_date: '',
    end_date: '',
    timing: '',
    days_of_week: '',
    schedule_days: '',
    status: 'upcoming',
    faculty_id: 'none',
  })

  const facultyUsers = users.filter((u) => u.role === 'faculty' || u.role === 'admin' || u.role === 'owner')

  const ongoingBatches = batches.filter(b => b.status === 'ongoing')
  const upcomingBatches = batches.filter(b => b.status === 'upcoming')
  const completedBatches = batches.filter(b => b.status === 'completed')

  const handleOpenModal = (batch?: Batch) => {
    if (batch) {
      setSelectedBatch(batch)
      setFormData({
        batch_name: batch.batch_name,
        course_id: batch.course_id || '',
        total_seats: batch.total_seats || 30,
        start_date: batch.start_date || '',
        end_date: batch.end_date || '',
        timing: batch.timing || '',
        days_of_week: batch.days_of_week || batch.schedule_days || '',
        schedule_days: batch.schedule_days || batch.days_of_week || '',
        status: batch.status || 'upcoming',
        faculty_id: batch.faculty_id || 'none',
      })
    } else {
      setSelectedBatch(null)
      setFormData({
        batch_name: '',
        course_id: '',
        total_seats: 30,
        start_date: '',
        end_date: '',
        timing: '',
        days_of_week: '',
        status: 'upcoming',
        faculty_id: 'none',
      })
    }
    setModalOpen(true)
  }

  const handleSaveBatch = async () => {
    if (!formData.batch_name) return

    const payload = {
      ...formData,
      faculty_id: formData.faculty_id === 'none' ? null : formData.faculty_id,
      course_id: formData.course_id === 'none' || !formData.course_id ? null : formData.course_id,
      schedule_days: formData.days_of_week, // Keep columns in sync
    }

    if (selectedBatch) {
      await updateBatch.mutateAsync({
        id: selectedBatch.id,
        updates: payload,
      })
    } else {
      await createBatch.mutateAsync(payload)
    }
    setModalOpen(false)
  }

  const handleDelete = async () => {
    if (!selectedBatch) return
    await deleteBatch.mutateAsync(selectedBatch.id)
    setDeleteOpen(false)
  }

  const columns: Column<Batch>[] = [
    { key: 'batch_name', header: 'Batch Name', sortable: true, render: (r) => <span className="font-semibold">{r.batch_name}</span> },
    { key: 'course', header: 'Course', render: (r) => r.course?.name ?? '—' },
    { key: 'timing', header: 'Timing', render: (r) => (
      <div>
        <p className="text-sm font-medium">{r.timing ?? '—'}</p>
        <p className="text-xs text-slate-500">{r.days_of_week || r.schedule_days || '—'}</p>
      </div>
    ) },
    { key: 'faculty', header: 'Faculty', render: (r) => r.faculty?.name ?? 'Unassigned' },
    { 
      key: 'capacity', 
      header: 'Capacity', 
      render: (r) => {
        const remaining = Math.max(0, r.total_seats - r.enrolled_count)
        const isFull = remaining === 0
        return (
          <div className="flex items-center gap-2">
            <span className={isFull ? 'text-rose-600 font-bold' : ''}>
              {r.enrolled_count} / {r.total_seats} <span className="text-xs text-slate-500 font-normal">({remaining} left)</span>
            </span>
            {isFull && <Badge variant="destructive" className="text-[10px]">FULL</Badge>}
          </div>
        )
      }
    },
    { key: 'start_date', header: 'Start Date', render: (r) => r.start_date ? format(new Date(r.start_date), 'dd MMM yyyy') : '—' },
    { 
      key: 'status', 
      header: 'Status', 
      render: (r) => (
        <Badge variant={r.status === 'ongoing' ? 'success' : r.status === 'upcoming' ? 'default' : 'secondary'} className="capitalize">
          {r.status}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/students?batchId=${r.id}`)} title="View Students">
            <Eye className="h-4 w-4 text-sky-600" />
          </Button>
          {(isOwner || can('manageUsers')) && (
            <>
              <Button variant="ghost" size="icon" onClick={() => handleOpenModal(r)}>
                <Edit className="h-4 w-4 text-slate-600" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => { setSelectedBatch(r); setDeleteOpen(true); }}>
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </>
          )}
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Batch Management" description="Manage class batches, schedules, and capacity allocations.">
        {(isOwner || can('manageUsers')) && (
          <Button onClick={() => handleOpenModal()} className="gap-2">
            <Plus className="h-4 w-4" /> Add Batch
          </Button>
        )}
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="bg-sky-50 border-sky-100 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-sky-700 uppercase font-semibold">Total Batches</p>
              <p className="text-2xl font-bold text-sky-950 mt-1">{batches.length}</p>
            </div>
            <UsersIcon className="h-8 w-8 text-sky-600" />
          </CardContent>
        </Card>
        
        <Card className="bg-emerald-50 border-emerald-100 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-700 uppercase font-semibold">Ongoing</p>
              <p className="text-2xl font-bold text-emerald-950 mt-1">{ongoingBatches.length}</p>
            </div>
            <Clock className="h-8 w-8 text-emerald-600" />
          </CardContent>
        </Card>

        <Card className="bg-amber-50 border-amber-100 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-700 uppercase font-semibold">Upcoming</p>
              <p className="text-2xl font-bold text-amber-950 mt-1">{upcomingBatches.length}</p>
            </div>
            <CalendarIcon className="h-8 w-8 text-amber-600" />
          </CardContent>
        </Card>

        <Card className="bg-slate-50 border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-700 uppercase font-semibold">Completed</p>
              <p className="text-2xl font-bold text-slate-950 mt-1">{completedBatches.length}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-slate-600" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Batches</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={batches}
            loading={isLoading}
            searchable
            rowKey={(r) => r.id}
            emptyTitle="No batches found"
            emptyDescription="Create batches to start allocating students."
          />
        </CardContent>
      </Card>

      {/* CREATE / EDIT MODAL */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedBatch ? 'Edit Batch' : 'Create New Batch'}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4 sm:grid-cols-2">
            <div className="col-span-2">
              <Label>Batch Name *</Label>
              <Input value={formData.batch_name || ''} onChange={e => setFormData({...formData, batch_name: e.target.value})} required />
            </div>

            <div className="col-span-2">
              <Label>Course</Label>
              <Select value={formData.course_id || ''} onValueChange={v => setFormData({...formData, course_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select Course" /></SelectTrigger>
                <SelectContent>
                  {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Total Seats</Label>
              <Input type="number" value={formData.total_seats || 30} onChange={e => setFormData({...formData, total_seats: parseInt(e.target.value) || 0})} />
            </div>

            <div>
              <Label>Status</Label>
              <Select value={formData.status || 'upcoming'} onValueChange={v => setFormData({...formData, status: v as any})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Start Date</Label>
              <Input type="date" value={formData.start_date || ''} onChange={e => setFormData({...formData, start_date: e.target.value})} />
            </div>

            <div>
              <Label>End Date</Label>
              <Input type="date" value={formData.end_date || ''} onChange={e => setFormData({...formData, end_date: e.target.value})} />
            </div>

            <div className="col-span-2">
              <Label>Timing</Label>
              <Input value={formData.timing || ''} onChange={e => setFormData({...formData, timing: e.target.value})} placeholder="e.g. 10:00 AM - 12:00 PM" />
            </div>

            <div className="col-span-2">
              <Label>Days of Week</Label>
              <Input value={formData.days_of_week || ''} onChange={e => setFormData({...formData, days_of_week: e.target.value})} placeholder="e.g. Mon, Wed, Fri" />
            </div>

            <div className="col-span-2">
              <Label>Assign Faculty</Label>
              <Select value={formData.faculty_id || 'none'} onValueChange={v => setFormData({...formData, faculty_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select faculty" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {facultyUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name} ({u.role})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveBatch} disabled={createBatch.isPending || updateBatch.isPending}>
              {selectedBatch ? 'Save Changes' : 'Create Batch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION MODAL */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Batch</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Are you sure you want to delete <span className="font-semibold text-slate-900">{selectedBatch?.batch_name}</span>? This action cannot be undone.
          </p>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteBatch.isPending}>
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
