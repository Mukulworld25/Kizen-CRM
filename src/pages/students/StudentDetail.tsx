import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ArrowLeft, FileText, Plus, Download, Printer, CreditCard, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import {
  useStudent, useUpdateStudent, useAttendance, useMarkAttendance,
  useFees, useFeePayments, useBatches, useStudentDocuments, useUploadStudentDocument, useInstallments,
  useStudents
} from '@/hooks/useStudents'
import { useCourses, useLeads } from '@/hooks/useLeads'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Input, Label } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/table'
import { formatCurrency, cn } from '@/lib/utils'
import { InlineEdit } from '@/components/shared/InlineEdit'
import { ReceiptModal } from '@/components/shared/ReceiptModal'
import { InvoiceModal } from '@/components/shared/InvoiceModal'
import type { FeePayment, Student } from '@/types'

export default function StudentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { can, isOwner, profile } = useAuth()

  const { data: student, isLoading } = useStudent(id)
  const updateStudent = useUpdateStudent()
  const { data: courses = [] } = useCourses()
  const { data: batches = [] } = useBatches()
  const { data: students = [] } = useStudents()
  const { data: leadsData } = useLeads({ pageSize: 1000 })

  const otherStudents = students.filter((s) => s.id !== id)
  const studentOptions = otherStudents.map((s) => ({ value: s.id, label: `${s.full_name} (${s.mobile})` }))
  const leadOptions = (leadsData?.leads ?? []).map((l) => ({ value: l.id, label: `${l.full_name} (${l.mobile})` }))

  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'))
  const { data: attendance = [] } = useAttendance(id, month)
  const markAttendance = useMarkAttendance()

  const { data: fees = [] } = useFees()
  const studentFee = fees.find((f) => f.student_id === id)
  const { data: payments = [] } = useFeePayments(studentFee?.id)
  const { data: installments = [] } = useInstallments(studentFee?.id)

  const { data: documents = [], isLoading: docsLoading } = useStudentDocuments(id)
  const uploadDoc = useUploadStudentDocument()

  // Modals state
  const [selectedPayment, setSelectedPayment] = useState<FeePayment | null>(null)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [invoiceOpen, setInvoiceOpen] = useState(false)

  // Document Upload state
  const [docModalOpen, setDocModalOpen] = useState(false)
  const [docName, setDocName] = useState('')
  const [docUrl, setDocUrl] = useState('')
  const [docType, setDocType] = useState('identity_proof')

  if (isLoading) return <Skeleton className="h-64 w-full rounded-2xl" />
  if (!student) return <p className="p-8 text-center text-slate-500">Student profile not found</p>

  const canInlineEdit = can('editStudents') || isOwner || profile?.role === 'admin'

  const handleSaveField = async (field: keyof Student, value: any) => {
    if (!id) return
    await updateStudent.mutateAsync({ id, [field]: value })
  }

  const courseOptions = courses.map((c) => ({ value: c.id, label: c.name }))
  const batchOptions = batches
    .filter((b) => !student.course_id || b.course_id === student.course_id)
    .map((b) => ({ value: b.id, label: b.batch_name }))
  const certOptions = [
    { value: 'not_started', label: 'Not Started' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'issued', label: 'Issued' },
  ]
  const statusOptions = [
    { value: 'true', label: 'Active Student' },
    { value: 'false', label: 'Inactive' },
  ]
  const genderOptions = [
    { value: 'Male', label: 'Male' },
    { value: 'Female', label: 'Female' },
    { value: 'Other', label: 'Other' },
  ]

  const presentCount = attendance.filter((a) => a.status === 'present').length
  const totalDays = attendance.length || 1
  const attendancePct = Math.round((presentCount / totalDays) * 100)
  const daysInMonth = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]), 0).getDate()

  const handleUploadDoc = async () => {
    if (!docName || !docUrl || !id) return
    await uploadDoc.mutateAsync({
      entity_id: id,
      doc_name: docName,
      doc_url: docUrl,
      doc_type: docType,
    })
    setDocModalOpen(false)
    setDocName('')
    setDocUrl('')
  }

  // Payment Status Badge Logic
  let paymentBadge = null
  if (studentFee) {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const hasOverdue = installments.some(i => i.status === 'overdue' || (i.status === 'pending' && new Date(`${i.due_date}T00:00:00`) < todayStart))
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
    } else if (studentFee.total_fee === 0) {
      paymentBadge = (
        <Badge variant="secondary" className="ml-2 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" /> NO FEE
        </Badge>
      )
  }
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="mb-2 gap-2" onClick={() => navigate('/students')}>
        <ArrowLeft className="h-4 w-4" /> Back to Students List
      </Button>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-600 to-indigo-700 text-2xl font-bold text-white shadow-md">
            {student.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{student.full_name}</h1>
              <Badge variant={student.is_active ? 'success' : 'secondary'}>
                {student.is_active ? 'Active' : 'Inactive'}
              </Badge>
              {paymentBadge}
              {canInlineEdit && (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full">
                  Admin Edit Enabled
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Student ID: <span className="font-mono font-semibold">{student.student_id ?? '—'}</span> · Enrolled: {format(new Date(student.created_at), 'MMM d, yyyy')}
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="profile" className="rounded-lg text-xs font-medium">Central Profile</TabsTrigger>
          <TabsTrigger value="attendance" className="rounded-lg text-xs font-medium">Attendance ({attendancePct}%)</TabsTrigger>
          {can('viewFees') && <TabsTrigger value="fees" className="rounded-lg text-xs font-medium">Fees & Ledger</TabsTrigger>}
          <TabsTrigger value="documents" className="rounded-lg text-xs font-medium">Documents ({documents.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4 space-y-6">
          <Card className="border border-slate-200">
            <CardHeader className="border-b pb-3">
              <CardTitle className="text-base font-bold">Personal & Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
              <InlineEdit label="Full Name" value={student.full_name} onSave={(v) => handleSaveField('full_name', v)} />
              <InlineEdit label="Mobile Number" value={student.mobile} onSave={(v) => handleSaveField('mobile', v)} />
              <InlineEdit label="Email Address" value={student.email} onSave={(v) => handleSaveField('email', v)} />
              <InlineEdit label="Parent / Guardian Name" value={student.parent_name} onSave={(v) => handleSaveField('parent_name', v)} />
              <InlineEdit label="Parent Contact" value={student.parent_contact} onSave={(v) => handleSaveField('parent_contact', v)} />
              <InlineEdit label="Emergency Contact" value={student.emergency_contact} onSave={(v) => handleSaveField('emergency_contact', v)} />
              <InlineEdit label="Date of Birth" type="date" value={student.dob} onSave={(v) => handleSaveField('dob', v)} />
              <InlineEdit label="Gender" type="select" options={genderOptions} value={student.gender} onSave={(v) => handleSaveField('gender', v)} />
              <InlineEdit label="City" value={student.city} onSave={(v) => handleSaveField('city', v)} />
              <InlineEdit className="lg:col-span-3" label="Address" type="textarea" value={student.address} onSave={(v) => handleSaveField('address', v)} />
            </CardContent>
          </Card>
          <Card className="border border-slate-200">
            <CardHeader className="border-b pb-3">
              <CardTitle className="text-base font-bold">Academic & Course Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
              <InlineEdit label="Student ID" mono value={student.student_id} onSave={(v) => handleSaveField('student_id', v)} />
              <InlineEdit label="Roll Number" mono value={student.roll_number} onSave={(v) => handleSaveField('roll_number', v)} />
              <InlineEdit label="Course" type="select" options={courseOptions} value={student.course_id} onSave={(v) => handleSaveField('course_id', v)} />
              <InlineEdit label="Batch" type="select" options={batchOptions} value={student.batch_id} onSave={(v) => handleSaveField('batch_id', v)} />
              <InlineEdit label="Admission Date" type="date" value={student.admission_date} onSave={(v) => handleSaveField('admission_date', v)} />
              <InlineEdit label="School / College" value={student.school_college} onSave={(v) => handleSaveField('school_college', v)} />
              <InlineEdit label="Certification Status" type="select" options={certOptions} value={student.certification_status} onSave={(v) => handleSaveField('certification_status', v)} />
              <InlineEdit label="Enrollment Status" type="select" options={statusOptions} value={String(student.is_active)} onSave={(v) => handleSaveField('is_active', v === 'true')} />
            </CardContent>
          </Card>
          <Card className="border border-slate-200">
            <CardHeader className="border-b pb-3">
              <CardTitle className="text-base font-bold">Referral Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
              <InlineEdit
                label="Referred By (Student)"
                type="select"
                options={[{ value: '', label: 'None' }, ...studentOptions]}
                value={student.referred_by_student_id}
                onSave={(v) => handleSaveField('referred_by_student_id', v || null)}
              />
              <InlineEdit
                label="Referred By (Lead)"
                type="select"
                options={[{ value: '', label: 'None' }, ...leadOptions]}
                value={student.referred_by_lead_id}
                onSave={(v) => handleSaveField('referred_by_lead_id', v || null)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="mt-4">
          <Card className="border border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-3">
              <div>
                <CardTitle className="text-base font-bold">Attendance Matrix — {attendancePct}%</CardTitle>
                <p className="text-xs text-muted-foreground">{presentCount} present out of {attendance.length} marked days</p>
              </div>
              <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="rounded border border-slate-300 px-3 py-1.5 text-xs font-medium bg-white" />
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-7 gap-2">
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
                        markAttendance.mutate({ student_id: student.id, batch_id: student.batch_id, date: dateStr, status: next })
                      }}
                      className={cn(
                        'aspect-square rounded-xl text-xs font-semibold flex flex-col items-center justify-center border transition-all',
                        record?.status === 'present' && 'bg-emerald-50 text-emerald-700 border-emerald-300',
                        record?.status === 'absent' && 'bg-rose-50 text-rose-700 border-rose-300',
                        !record && 'bg-slate-50 text-slate-600 border-slate-200',
                        can('markAttendance') && 'hover:ring-2 hover:ring-sky-500 cursor-pointer'
                      )}
                    >
                      <span>{day}</span>
                      {record && <span className="text-[9px] uppercase mt-0.5">{record.status}</span>}
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fees" className="mt-4 space-y-6">
          {studentFee ? (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-4">
                <Card className="bg-slate-900 text-white">
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-400 font-semibold uppercase">Total Fee</p>
                    <p className="text-2xl font-bold mt-1">{formatCurrency(studentFee.total_fee)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-emerald-50 border-emerald-200">
                  <CardContent className="p-4">
                    <p className="text-xs text-emerald-700 font-semibold uppercase">Amount Paid</p>
                    <p className="text-2xl font-bold text-emerald-950 mt-1">{formatCurrency(studentFee.amount_paid)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-amber-50 border-amber-200">
                  <CardContent className="p-4">
                    <p className="text-xs text-amber-700 font-semibold uppercase">Pending Balance</p>
                    <p className="text-2xl font-bold text-amber-950 mt-1">{formatCurrency(studentFee.pending_balance)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-sky-50 border-sky-200">
                  <CardContent className="p-4">
                    <p className="text-xs text-sky-700 font-semibold uppercase">Net Fee</p>
                    <p className="text-2xl font-bold text-sky-950 mt-1">{formatCurrency(studentFee.net_fee)}</p>
                  </CardContent>
                </Card>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Card className="border border-slate-200"><CardContent className="p-4"><p className="text-xs text-slate-500 uppercase font-semibold">Subject</p><p className="text-lg font-bold text-slate-900 mt-1">{studentFee.subject ?? student.course?.name ?? '—'}</p></CardContent></Card>
                <Card className="border border-slate-200"><CardContent className="p-4"><p className="text-xs text-slate-500 uppercase font-semibold">Duration</p><p className="text-lg font-bold text-slate-900 mt-1">{studentFee.duration ?? (student.course?.duration_days ? `${student.course.duration_days} days` : student.course?.duration_hours ? `${student.course.duration_hours} hrs` : '—')}</p></CardContent></Card>
                <Card className="border border-slate-200"><CardContent className="p-4"><p className="text-xs text-slate-500 uppercase font-semibold">Next Due Date</p><p className="text-lg font-bold text-slate-900 mt-1">{studentFee.next_due_date ? format(new Date(studentFee.next_due_date), 'dd MMM yyyy') : '—'}{studentFee.next_due_amount ? <span className="text-sm text-amber-600 ml-2">(₹{studentFee.next_due_amount})</span> : ''}</p></CardContent></Card>
              </div>
              <Card className="border border-slate-200">
                <CardHeader className="flex flex-row items-center justify-between border-b pb-3">
                  <CardTitle className="text-base font-bold">Payment Receipts History</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => setInvoiceOpen(true)}><Printer className="h-4 w-4 mr-2" /> GST Invoice</Button>
                </CardHeader>
                <CardContent className="p-4">
                  {payments.length === 0 ? (
                    <p className="text-sm text-slate-500 py-4 text-center">No payment transactions recorded yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {payments.map((p) => (
                        <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900 text-sm">{p.receipt_number ?? 'REC-' + p.id.slice(0, 6)}</span>
                              <Badge variant="outline" className="capitalize text-xs">{p.payment_method?.replace('_', ' ')}</Badge>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">Date: {format(new Date(p.payment_date), 'dd MMM yyyy')}{p.transaction_id && ` · Txn: ${p.transaction_id}`}</p>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-4">
                            <span className="font-extrabold text-emerald-700 text-base">{formatCurrency(p.amount)}</span>
                            <Button size="sm" variant="outline" className="gap-1.5 text-xs text-sky-700 border-sky-200 hover:bg-sky-50" onClick={() => { setSelectedPayment(p); setReceiptOpen(true); }}><Printer className="h-3.5 w-3.5" /> Receipt PDF</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="p-8 text-center border-dashed">
              <p className="text-sm text-slate-500">No fee record generated for this student.</p>
            </Card>
          )}
        </TabsContent>

        {/* DOCUMENTS TAB */}
        <TabsContent value="documents" className="mt-4">
          <Card className="border border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-3">
              <div>
                <CardTitle className="text-base font-bold">Student Documents</CardTitle>
                <p className="text-xs text-slate-500">ID proof, certificates & academic records</p>
              </div>
              <Button size="sm" className="gap-2" onClick={() => setDocModalOpen(true)}>
                <Plus className="h-4 w-4" /> Upload Document
              </Button>
            </CardHeader>
            <CardContent className="p-4">
              {docsLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : documents.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                  <p className="text-sm text-slate-600">No documents uploaded yet</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <p className="font-semibold text-xs text-slate-900 truncate">{doc.doc_name}</p>
                        <p className="text-[10px] text-slate-500 uppercase">{doc.doc_type?.replace('_', ' ')}</p>
                      </div>
                      <Button size="sm" variant="ghost" asChild>
                        <a href={doc.doc_url} target="_blank" rel="noreferrer">
                          <Download className="h-4 w-4 text-sky-600" />
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* RECEIPT MODAL */}
      {selectedPayment && studentFee && (
        <ReceiptModal
          open={receiptOpen}
          onOpenChange={setReceiptOpen}
          payment={selectedPayment}
          student={student}
          fee={studentFee}
        />
      )}

      {/* INVOICE MODAL */}
      {studentFee && (
        <InvoiceModal
          open={invoiceOpen}
          onOpenChange={setInvoiceOpen}
          fee={studentFee}
          student={student}
        />
      )}

      {/* UPLOAD DOCUMENT MODAL */}
      <Dialog open={docModalOpen} onOpenChange={setDocModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Student Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Document Name</Label>
              <Input
                placeholder="e.g. Aadhaar Card / 12th Marksheet"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
              />
            </div>
            <div>
              <Label>Document URL</Label>
              <Input
                placeholder="https://..."
                value={docUrl}
                onChange={(e) => setDocUrl(e.target.value)}
              />
            </div>
            <div>
              <Label>Document Type</Label>
              <select
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
              >
                <option value="identity_proof">Identity Proof</option>
                <option value="marksheet">Academic Marksheet</option>
                <option value="agreement">Agreement / Form</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocModalOpen(false)}>Cancel</Button>
            <Button onClick={handleUploadDoc} disabled={!docName || !docUrl}>Save Document</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

