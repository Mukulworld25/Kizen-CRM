import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudents, useBatches } from '@/hooks/useStudents'
import { useCourses } from '@/hooks/useLeads'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Student } from '@/types'

export default function StudentList() {
  const navigate = useNavigate()
  const [courseId, setCourseId] = useState<string>()
  const [batchId, setBatchId] = useState<string>()
  const { data: students = [], isLoading } = useStudents({ courseId, batchId })
  const { data: courses = [] } = useCourses()
  const { data: batches = [] } = useBatches()

  const columns: Column<Student>[] = [
    {
      key: 'photo',
      header: '',
      render: (r) => (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs text-white">
          {r.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
        </div>
      ),
    },
    { key: 'student_id', header: 'Student ID', sortable: true, exportValue: (r) => r.student_id ?? '' },
    { key: 'full_name', header: 'Name', sortable: true, exportValue: (r) => r.full_name },
    { key: 'course', header: 'Course', render: (r) => r.course?.name ?? '—' },
    { key: 'batch', header: 'Batch', render: (r) => r.batch?.batch_name ?? '—' },
    {
      key: 'certification_status',
      header: 'Certification',
      render: (r) => <Badge variant="outline" className="capitalize">{r.certification_status.replace('_', ' ')}</Badge>,
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (r) => <Badge variant={r.is_active ? 'success' : 'secondary'}>{r.is_active ? 'Active' : 'Inactive'}</Badge>,
    },
  ]

  return (
    <div>
      <PageHeader title="Students" description="Manage enrolled students" />

      <div className="mb-4 flex gap-2 bg-white rounded-xl border border-border p-3 shadow-sm">
        <Select value={courseId ?? 'all'} onValueChange={(v) => setCourseId(v === 'all' ? undefined : v)}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Courses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courses</SelectItem>
            {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={batchId ?? 'all'} onValueChange={(v) => setBatchId(v === 'all' ? undefined : v)}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Batches" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Batches</SelectItem>
            {batches.map((b) => <SelectItem key={b.id} value={b.id}>{b.batch_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={students}
        loading={isLoading}
        searchable
        rowKey={(r) => r.id}
        onRowClick={(r) => navigate(`/students/${r.id}`)}
        emptyTitle="No students yet"
        emptyDescription="Convert admitted leads to create student profiles."
      />
    </div>
  )
}
