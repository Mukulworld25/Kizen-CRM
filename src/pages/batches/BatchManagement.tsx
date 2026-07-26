import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { useBatches, useUsers, useUpdateBatch } from '@/hooks/useStudents'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users as UsersIcon, Calendar as CalendarIcon, Clock, CheckCircle, Edit } from 'lucide-react'
import type { Batch } from '@/types'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'

export default function BatchManagement() {
  const { can, isOwner } = useAuth()
  const { data: batches = [], isLoading } = useBatches()
  const { data: users = [] } = useUsers()
  const updateBatch = useUpdateBatch()

  const [editOpen, setEditOpen] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null)
  const [facultyId, setFacultyId] = useState<string>('none')

  const facultyUsers = users.filter((u) => u.role === 'faculty' || u.role === 'admin' || u.role === 'owner')

  const ongoingBatches = batches.filter(b => b.status === 'ongoing')
  const upcomingBatches = batches.filter(b => b.status === 'upcoming')
  const completedBatches = batches.filter(b => b.status === 'completed')

  const columns: Column<Batch>[] = [
    { key: 'batch_name', header: 'Batch Name', sortable: true, render: (r) => <span className="font-semibold">{r.batch_name}</span> },
    { key: 'course', header: 'Course', render: (r) => r.course?.name ?? '—' },
    { key: 'timing', header: 'Timing', render: (r) => r.timing ?? '—' },
    { key: 'faculty', header: 'Faculty', render: (r) => (
        <div className="flex items-center gap-2">
          <span>{r.faculty?.name ?? 'Unassigned'}</span>
          {(isOwner || can('manageUsers')) && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
              setSelectedBatch(r)
              setFacultyId(r.faculty_id ?? 'none')
              setEditOpen(true)
            }}>
              <Edit className="h-3 w-3" />
            </Button>
          )}
        </div>
      )
    },
    { 
      key: 'capacity', 
      header: 'Capacity (Enrolled / Total)', 
      render: (r) => {
        const pct = (r.enrolled_count / r.total_seats) * 100
        const isFull = pct >= 100
        return (
          <div className="flex items-center gap-2">
            <span className={isFull ? 'text-rose-600 font-bold' : ''}>{r.enrolled_count} / {r.total_seats}</span>
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
  ]

  const handleSaveFaculty = async () => {
    if (!selectedBatch) return
    await updateBatch.mutateAsync({
      id: selectedBatch.id,
      faculty_id: facultyId === 'none' ? null : facultyId
    })
    setEditOpen(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Batch Management" description="Manage class batches, schedules, and capacity allocations." />

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

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Faculty</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label className="mb-2 block">Select Faculty</Label>
            <Select value={facultyId} onValueChange={setFacultyId}>
              <SelectTrigger>
                <SelectValue placeholder="Select faculty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {facultyUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name} ({u.role})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveFaculty} disabled={updateBatch.isPending}>
              Save Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
