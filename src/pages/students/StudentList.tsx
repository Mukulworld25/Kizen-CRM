import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudents, useBatches, useFees, useDashboardStats } from '@/hooks/useStudents'
import { useCourses } from '@/hooks/useLeads'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { GraduationCap, IndianRupee, Calendar, UserCheck, Plus } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { Student } from '@/types'
import { AddStudentModal } from '@/pages/students/AddStudentModal'

export default function StudentList() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('all')
  const [addModalOpen, setAddModalOpen] = useState(false)

  const [courseId, setCourseId] = useState<string>()
  const [batchId, setBatchId] = useState<string>()
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const { data: students = [], isLoading } = useStudents({ courseId, batchId })
  const { data: courses = [] } = useCourses()
  const { data: batches = [] } = useBatches()
  const { data: fees = [] } = useFees()
  const { data: stats } = useDashboardStats()

  // Filter admissions by date if set
  const filteredStudents = students.filter((s) => {
    if (dateFrom && s.admission_date && s.admission_date < dateFrom) return false
    if (dateTo && s.admission_date && s.admission_date > dateTo) return false
    return true
  })

  // Calculate Admissions metrics
  const activeStudentsCount = filteredStudents.filter((s) => s.is_active).length

  // Calculate fee metrics for filtered students
  const studentFeeMap = new Map(fees.map((f) => [f.student_id, f]))
  const totalPaid = filteredStudents.reduce((sum, s) => {
    const f = studentFeeMap.get(s.id)
    return sum + (f ? Number(f.amount_paid) : 0)
  }, 0)
  const totalPending = filteredStudents.reduce((sum, s) => {
    const f = studentFeeMap.get(s.id)
    return sum + (f ? Number(f.pending_balance) : 0)
  }, 0)

  const columns: Column<Student>[] = [
    {
      key: 'photo',
      header: '',
      render: (r) => (
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-600 to-indigo-700 text-xs font-bold text-white shadow-sm">
          {r.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
        </div>
      ),
    },
    { key: 'student_id', header: 'Student ID', sortable: true, exportValue: (r) => r.student_id ?? '' },
    { key: 'roll_number', header: 'Roll No', render: (r) => r.roll_number ?? '—' },
    { key: 'full_name', header: 'Student Name', sortable: true, exportValue: (r) => r.full_name },
    { key: 'course', header: 'Course', render: (r) => r.course?.name ?? '—' },
    { key: 'batch', header: 'Batch', render: (r) => r.batch?.batch_name ?? '—' },
    { key: 'admission_date', header: 'Admission Date', sortable: true, render: (r) => r.admission_date ?? '—' },
    {
      key: 'fee_status',
      header: 'Fee Ledger',
      render: (r) => {
        const f = studentFeeMap.get(r.id)
        if (!f) return <span className="text-xs text-slate-400">No record</span>
        return (
          <div className="text-xs">
            <span className="font-semibold text-emerald-700">{formatCurrency(f.amount_paid)}</span>
            {f.pending_balance > 0 ? (
              <span className="text-amber-600 block">Due: {formatCurrency(f.pending_balance)}</span>
            ) : (
              <span className="text-emerald-600 block">Cleared</span>
            )}
          </div>
        )
      },
    },
    {
      key: 'certification_status',
      header: 'Certification',
      render: (r) => <Badge variant="outline" className="capitalize text-xs">{r.certification_status?.replace('_', ' ')}</Badge>,
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (r) => <Badge variant={r.is_active ? 'success' : 'secondary'}>{r.is_active ? 'Active' : 'Inactive'}</Badge>,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Students & Admissions" description="Manage central student records and admissions pipeline">
        <Button onClick={() => setAddModalOpen(true)} className="bg-sky-600 hover:bg-sky-700 text-white gap-2">
          <Plus className="h-4 w-4" /> Enroll / Add Student
        </Button>
      </PageHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="all" className="rounded-lg text-xs font-medium">All Enrolled Students ({students.length})</TabsTrigger>
          <TabsTrigger value="admissions" className="rounded-lg text-xs font-medium">Admissions Tab</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4 space-y-4">
          {/* Admissions Summary Bar */}
          <div className="grid gap-4 sm:grid-cols-4">
            <Card className="bg-slate-900 text-white border-none shadow-md">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 uppercase font-semibold">Admissions Month</p>
                  <p className="text-2xl font-bold mt-1">{stats?.admissionsMonth ?? 0}</p>
                </div>
                <Calendar className="h-8 w-8 text-sky-400 opacity-80" />
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-sky-50 to-white border-sky-100 shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-sky-700 uppercase font-semibold">Active Students</p>
                  <p className="text-2xl font-bold text-sky-950 mt-1">{activeStudentsCount}</p>
                </div>
                <GraduationCap className="h-8 w-8 text-sky-600" />
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100 shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-emerald-700 uppercase font-semibold">Revenue Collected</p>
                  <p className="text-2xl font-bold text-emerald-950 mt-1">{formatCurrency(totalPaid)}</p>
                </div>
                <IndianRupee className="h-8 w-8 text-emerald-600" />
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100 shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-amber-700 uppercase font-semibold">Pending Fees Balance</p>
                  <p className="text-2xl font-bold text-amber-950 mt-1">{formatCurrency(totalPending)}</p>
                </div>
                <UserCheck className="h-8 w-8 text-amber-600" />
              </CardContent>
            </Card>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 rounded-xl border border-slate-200 p-3 bg-white shadow-sm">
            <Select value={courseId ?? 'all'} onValueChange={(v) => setCourseId(v === 'all' ? undefined : v)}>
              <SelectTrigger className="w-full sm:w-48 text-xs"><SelectValue placeholder="All Courses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={batchId ?? 'all'} onValueChange={(v) => setBatchId(v === 'all' ? undefined : v)}>
              <SelectTrigger className="w-full sm:w-40 text-xs"><SelectValue placeholder="All Batches" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Batches</SelectItem>
                {batches.map((b) => <SelectItem key={b.id} value={b.id}>{b.batch_name}</SelectItem>)}
              </SelectContent>
            </Select>

            {activeTab === 'admissions' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Admitted:</span>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="text-xs h-9 w-36"
                />
                <span className="text-xs text-slate-400">to</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="text-xs h-9 w-36"
                />
              </div>
            )}
          </div>

          {/* Data Table */}
          <DataTable
            columns={columns}
            data={filteredStudents}
            loading={isLoading}
            searchable
            rowKey={(r) => r.id}
            onRowClick={(r) => navigate(`/students/${r.id}`)}
            emptyTitle="No students found"
            emptyDescription="Convert admitted leads to create central student profiles."
          />
        </TabsContent>
      </Tabs>

      <AddStudentModal open={addModalOpen} onOpenChange={setAddModalOpen} />
    </div>
  )
}
