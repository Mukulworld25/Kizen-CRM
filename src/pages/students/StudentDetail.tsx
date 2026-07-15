import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useStudent, useAttendance, useMarkAttendance, useFees, useFeePayments } from '@/hooks/useStudents'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/table'
import { formatCurrency, cn } from '@/lib/utils'
import { FieldRow } from '@/components/shared/FieldValue'

export default function StudentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { can } = useAuth()
  const { data: student, isLoading } = useStudent(id)
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'))
  const { data: attendance = [] } = useAttendance(id, month)
  const markAttendance = useMarkAttendance()
  const { data: fees = [] } = useFees()
  const studentFee = fees.find((f) => f.student_id === id)
  const { data: payments = [] } = useFeePayments(studentFee?.id)

  if (isLoading) return <Skeleton className="h-64 w-full" />
  if (!student) return <p>Student not found</p>

  const presentCount = attendance.filter((a) => a.status === 'present').length
  const totalDays = attendance.length || 1
  const attendancePct = Math.round((presentCount / totalDays) * 100)

  const daysInMonth = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]), 0).getDate()

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate('/students')}>
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-bold text-white">
          {student.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
        </div>
        <div>
          <PageHeader title={student.full_name} description={student.student_id ?? ''}>
            <Badge>{student.course?.name ?? 'No course'}</Badge>
          </PageHeader>
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          {can('viewFees') && <TabsTrigger value="fees">Fees</TabsTrigger>}
          <TabsTrigger value="progress">Progress</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <Card>
            <CardContent className="grid gap-4 p-6 sm:grid-cols-2 text-sm">
              <FieldRow label="Mobile" value={student.mobile} />
              <FieldRow label="Email" value={student.email} />
              <FieldRow label="City" value={student.city} />
              <FieldRow label="Batch" value={student.batch?.batch_name} />
              <FieldRow label="Admission Date" value={student.admission_date} />
              <FieldRow label="Parent" value={student.parent_name} />
              <FieldRow label="School/College" value={student.school_college} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Attendance — {attendancePct}%</CardTitle>
              <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="rounded border px-2 py-1 text-sm" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1
                  const dateStr = `${month}-${String(day).padStart(2, '0')}`
                  const record = attendance.find((a) => a.date === dateStr)
                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={!can('markAttendance') || !student.batch_id}
                      onClick={() => {
                        if (!student.batch_id) return
                        const next = record?.status === 'present' ? 'absent' : 'present'
                        markAttendance.mutate({
                          student_id: student.id,
                          batch_id: student.batch_id,
                          date: dateStr,
                          status: next,
                        })
                      }}
                      className={cn(
                        'aspect-square rounded text-xs flex items-center justify-center border',
                        record?.status === 'present' && 'bg-green-100 border-green-300',
                        record?.status === 'absent' && 'bg-red-100 border-red-300',
                        !record && 'bg-slate-50',
                        can('markAttendance') && 'hover:ring-2 hover:ring-accent cursor-pointer'
                      )}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fees" className="mt-4">
          {studentFee ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-4">
                <Stat label="Total Fee" value={formatCurrency(studentFee.total_fee)} color="bg-primary" />
                <Stat label="Paid" value={formatCurrency(studentFee.amount_paid)} color="bg-success" />
                <Stat label="Balance" value={formatCurrency(studentFee.pending_balance)} color="bg-accent" />
                <Stat label="Net Fee" value={formatCurrency(studentFee.net_fee)} color="bg-primary-light" />
              </div>
              <Card>
                <CardHeader><CardTitle className="text-base">Payment History</CardTitle></CardHeader>
                <CardContent>
                  {payments.length === 0 ? (
                    <p className="text-sm text-slate-500">No payments recorded.</p>
                  ) : (
                    payments.map((p) => (
                      <div key={p.id} className="flex justify-between border-b py-2 text-sm">
                        <span>{p.receipt_number} · {format(new Date(p.payment_date), 'MMM d, yyyy')}</span>
                        <span className="font-medium">{formatCurrency(p.amount)}</span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <p className="text-slate-500">No fee record for this student.</p>
          )}
        </TabsContent>

        <TabsContent value="progress" className="mt-4">
          <Card>
            <CardContent className="p-6">
              <FieldRow label="Certification Status" value={student.certification_status?.replace('_', ' ')} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Replaced Field with shared FieldRow component

function Stat({ label, value, color = 'bg-primary' }: { label: string; value: string; color?: string }) {
  return (
    <Card className="relative overflow-hidden">
      <div className={cn('absolute top-0 right-0 w-16 h-16 rounded-full -translate-y-1/2 translate-x-1/2 opacity-10', color)} />
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold text-slate-900">{value}</p>
      </CardContent>
    </Card>
  )
}
