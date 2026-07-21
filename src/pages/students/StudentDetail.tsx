import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ArrowLeft, CreditCard, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useStudent, useAttendance, useMarkAttendance, useFees, useFeePayments, useInstallments } from '@/hooks/useStudents'
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
  const { data: installments = [] } = useInstallments(studentFee?.id)

  if (isLoading) return <Skeleton className="h-64 w-full" />
  if (!student) return <p>Student not found</p>

  const presentCount = attendance.filter((a) => a.status === 'present').length
  const totalDays = attendance.length || 1
  const attendancePct = Math.round((presentCount / totalDays) * 100)
  const daysInMonth = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]), 0).getDate()

  // Payment Status Badge Logic
  let paymentBadge = null
  if (studentFee) {
    const hasOverdue = installments.some(i => i.status === 'overdue' || (i.status === 'pending' && new Date(i.due_date) < new Date()))
    if (hasOverdue) {
      paymentBadge = (
        <Badge variant="destructive" className="ml-2 animate-pulse flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> OVERDUE
        </Badge>
      )
    } else if (studentFee.pending_balance === 0 && studentFee.amount_paid > 0) {
      paymentBadge = (
        <Badge variant="success" className="ml-2 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" /> PAID
        </Badge>
      )
    } else if (studentFee.amount_paid > 0 && studentFee.pending_balance > 0) {
      paymentBadge = (
        <Badge variant="warning" className="ml-2 flex items-center gap-1">
          <Clock className="w-3 h-3" /> PARTIAL
        </Badge>
      )
    } else if (studentFee.amount_paid === 0 && studentFee.total_fee > 0) {
      paymentBadge = (
        <Badge variant="destructive" className="ml-2 flex items-center gap-1 bg-red-100 text-red-700 hover:bg-red-200 border-red-200">
          <CreditCard className="w-3 h-3" /> DUE
        </Badge>
      )
    }
  }

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate('/students')}>
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-bold text-white shadow-sm">
          {student.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
        </div>
        <div>
          <PageHeader title={student.full_name} description={student.student_id ?? ''}>
            <div className="flex items-center">
              <Badge variant="outline">{student.course?.name ?? 'No course'}</Badge>
              {paymentBadge}
            </div>
          </PageHeader>
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="mb-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="admission">Admission</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          {can('viewFees') && <TabsTrigger value="fees">Fees</TabsTrigger>}
          <TabsTrigger value="progress">Progress</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Personal Details */}
            <Card>
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-sm font-semibold text-slate-800">Personal Details</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 grid gap-3 text-sm">
                <FieldRow label="Full Name" value={student.full_name} />
                <FieldRow label="Student ID" value={student.student_id} />
                <FieldRow label="DOB" value={student.dob ? format(new Date(student.dob), 'dd MMM yyyy') : '—'} />
                <FieldRow label="Gender" value={student.gender ? student.gender.charAt(0).toUpperCase() + student.gender.slice(1) : '—'} />
                <FieldRow label="Mobile" value={student.mobile} />
                <FieldRow label="Email" value={student.email} />
                <FieldRow label="Address" value={student.address} />
                <FieldRow label="City" value={student.city} />
              </CardContent>
            </Card>

            {/* Academic Details */}
            <Card>
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-sm font-semibold text-slate-800">Academic Details</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 grid gap-3 text-sm">
                <FieldRow label="Course" value={student.course?.name} />
                <FieldRow label="Batch" value={student.batch?.batch_name} />
                <FieldRow label="Batch Timing" value={student.batch?.timing} />
                <FieldRow label="Faculty" value={(student.batch as any)?.faculty?.name} />
                <FieldRow label="Roll Number" value={student.roll_number} />
                <FieldRow label="School/College" value={student.school_college} />
                <FieldRow label="Certification" value={student.certification_status?.replace('_', ' ')} />
              </CardContent>
            </Card>

            {/* Family Details */}
            <Card>
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-sm font-semibold text-slate-800">Family Details</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 grid gap-3 text-sm">
                <FieldRow label="Father's Name" value={student.parent_name} />
                <FieldRow label="Parent Contact" value={student.parent_contact} />
                <FieldRow label="Emergency Contact" value={student.emergency_contact} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="admission" className="mt-4">
          <Card>
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-sm font-semibold text-slate-800">Admission & Lead Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 p-6 sm:grid-cols-2 text-sm">
              <div className="space-y-4">
                <h3 className="font-medium text-slate-900 border-b pb-2">Admission Timeline</h3>
                <FieldRow label="Lead Date" value={(student as any).lead?.created_at ? format(new Date((student as any).lead.created_at), 'dd MMM yyyy') : '—'} />
                <FieldRow label="Admission Date" value={student.admission_date ? format(new Date(student.admission_date), 'dd MMM yyyy') : '—'} />
              </div>
              <div className="space-y-4">
                <h3 className="font-medium text-slate-900 border-b pb-2">Source & Referral</h3>
                <FieldRow label="Lead Source" value={(student as any).lead?.source || 'Direct'} />
                <FieldRow label="Referred By" value={(student as any).lead?.referred_by_lead_id ? 'Yes (Has Referral)' : 'No'} />
                <FieldRow label="Referral Code" value={(student as any).lead?.referral_code} />
              </div>
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
                        record?.status === 'present' && 'bg-green-100 border-green-300 text-green-700 font-medium',
                        record?.status === 'absent' && 'bg-red-100 border-red-300 text-red-700 font-medium',
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
                    <div className="space-y-1">
                      {payments.map((p) => (
                        <div key={p.id} className="flex justify-between border-b py-2 text-sm last:border-0">
                          <span className="text-slate-600">
                            <span className="font-medium text-slate-800">{p.receipt_number}</span> &middot; {p.payment_date ? format(new Date(p.payment_date), 'MMM d, yyyy') : '—'}
                          </span>
                          <span className="font-bold text-slate-800">{formatCurrency(p.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <CreditCard className="w-10 h-10 text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">No fee record for this student.</p>
            </div>
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

function Stat({ label, value, color = 'bg-primary' }: { label: string; value: string; color?: string }) {
  return (
    <Card className="relative overflow-hidden border-none shadow-sm">
      <div className={cn('absolute top-0 right-0 w-16 h-16 rounded-full -translate-y-1/2 translate-x-1/2 opacity-[0.08]', color)} />
      <CardContent className="p-4 bg-white/50 backdrop-blur-sm">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">{label}</p>
        <p className="text-xl font-bold text-slate-900 tabular-nums">{value}</p>
      </CardContent>
    </Card>
  )
}
