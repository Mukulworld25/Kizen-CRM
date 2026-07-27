import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudents, useBatches, useFees } from '@/hooks/useStudents'
import { useCourses } from '@/hooks/useLeads'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import FlagDot from '@/components/ui/FlagDot'
import type { Student } from '@/types'
import { FEE_COURSE_LEVELS } from '@/types'
import { Button } from '@/components/ui/button'
import { Plus, CheckCircle, AlertTriangle, Clock, CreditCard } from 'lucide-react'
import { AddStudentModal } from '@/pages/students/AddStudentModal'

export default function StudentList() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'all' | 'admissions'>('all')
  const [courseId, setCourseId] = useState<string>()
  const [batchId, setBatchId] = useState<string>()
  const [courseLevel, setCourseLevel] = useState<string>('all')
  const [flaggedOnly, setFlaggedOnly] = useState(false)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const { data: rawStudents = [], isLoading } = useStudents({ courseId, batchId })
  const { data: courses = [] } = useCourses()
  const { data: batches = [] } = useBatches()
  const { data: fees = [] } = useFees()

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const students = rawStudents.filter((s) => {
    if (activeTab === 'admissions') {
      const enrollDate = s.created_at || s.admission_date
      if (enrollDate && new Date(enrollDate) < thirtyDaysAgo) return false
    }
    if (flaggedOnly && !s.flag_color) return false
    if (courseLevel === 'all') return true
    const cName = (s.course?.name || '').toLowerCase()
    const lvl = courseLevel.toLowerCase()
    if (lvl === 'acca kl') return cName.includes('knowledge') || cName.includes('kl')
    if (lvl === 'acca sl') return cName.includes('skill') || cName.includes('sl')
    if (lvl === 'acca pl') return cName.includes('professional') || cName.includes('pl')
    if (lvl === 'fia') return cName.includes('fia')
    if (lvl === '11th & 12th') return cName.includes('11') || cName.includes('12')
    if (lvl === 'b.com') return cName.includes('b.com') || cName.includes('bba')
    return true
  })

  // Build student fee map
  const studentFeeMap = new Map(fees.map(f => [f.student_id, f]))

  const columns: Column<Student>[] = [
    {
      key: 'flag',
      header: '',
      render: (r) => (
        <div className="flex items-center justify-center w-4">
          <FlagDot color={r.flag_color} reason={r.flag_reason} />
        </div>
      ),
    },
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
      key: 'fee_status',
      header: 'Fee Status',
      render: (r) => {
        const f = studentFeeMap.get(r.id)
        if (!f) return <span className="text-xs text-slate-400">No Fee</span>
        const isOverdue = f.pending_balance === f.total_fee && f.total_fee > 0
        if (isOverdue) return <Badge variant="destructive" className="text-[10px] flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> OVERDUE</Badge>
        if (f.pending_balance === 0 && f.amount_paid > 0) return <Badge variant="success" className="text-[10px] flex items-center gap-1"><CheckCircle className="w-3 h-3" /> PAID</Badge>
        if (f.amount_paid > 0 && f.pending_balance > 0) return <Badge variant="warning" className="text-[10px] flex items-center gap-1"><Clock className="w-3 h-3" /> PARTIAL</Badge>
        if (f.amount_paid === 0 && f.total_fee > 0) return <Badge variant="destructive" className="text-[10px] flex items-center gap-1"><CreditCard className="w-3 h-3" /> DUE</Badge>
        return <span className="text-xs text-slate-400">—</span>
      },
    },
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
      <PageHeader title="Students" description="Manage enrolled students">
        <Button onClick={() => setAddModalOpen(true)} className="bg-sky-600 hover:bg-sky-700 text-white gap-2">
          <Plus className="h-4 w-4" /> Enroll / Add Student
        </Button>
      </PageHeader>

      <div className="flex gap-2 mb-4">
        <Button
          variant={activeTab === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('all')}
        >
          All Enrolled Students
        </Button>
        <Button
          variant={activeTab === 'admissions' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('admissions')}
        >
          Recent Admissions (New Enrolments)
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 rounded-xl border border-border p-3 shadow-sm" style={{ background: 'var(--card)' }}>
        <Select value={courseLevel} onValueChange={setCourseLevel}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Course Level / Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Course Levels</SelectItem>
            {FEE_COURSE_LEVELS.map((lvl) => (
              <SelectItem key={lvl.value} value={lvl.value}>{lvl.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={courseId ?? 'all'} onValueChange={(v) => setCourseId(v === 'all' ? undefined : v)}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Courses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Specific Courses</SelectItem>
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

        <Button
          variant={flaggedOnly ? 'destructive' : 'outline'}
          size="sm"
          className="text-xs"
          onClick={() => setFlaggedOnly((prev) => !prev)}
        >
          {flaggedOnly ? 'Showing Flagged Queue' : 'Show Flagged Only'}
        </Button>
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

      <AddStudentModal open={addModalOpen} onOpenChange={setAddModalOpen} />
    </div>
  )
}