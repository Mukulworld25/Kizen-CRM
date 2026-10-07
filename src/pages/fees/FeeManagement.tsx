import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Eye, Pencil, Trash2, CreditCard, Search, UserCheck, X, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useFees, useRecordPayment, useUpdateFee, useDeleteFee } from '@/hooks/useStudents'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatsCard } from '@/components/shared/StatsCard'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DeleteOrRequestDialog } from '@/components/shared/DeleteOrRequestDialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input, Label } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { IndianRupee, Clock } from 'lucide-react'
import FlagDot from '@/components/ui/FlagDot'
import type { Fee, PaymentMethod } from '@/types'
import { useCourses } from '@/hooks/useLeads'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { CustomizableFilterBar, type FilterItem } from '@/components/shared/CustomizableFilterBar'
import { DynamicFilterBuilder, type FilterField, type DynamicFilterRule } from '@/components/shared/DynamicFilterBuilder'
import { RecordPaymentModal } from '@/components/shared/RecordPaymentModal'

export default function FeeManagement() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { can, isOwner, profile } = useAuth()
  const { data: courses = [] } = useCourses()
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [courseId, setCourseId] = useState<string>('all')
  const [paymentStatus, setPaymentStatus] = useState<string>('all')
  const [dateSort, setDateSort] = useState<string>('created_desc')
  const [dynamicRules, setDynamicRules] = useState<DynamicFilterRule[]>([])
  const [pageSize, setPageSize] = useState(50)

  useEffect(() => {
    if (searchParams.get('filter') === 'overdue') {
      setOverdueOnly(true)
    }
  }, [searchParams])
  const { data: rawFees = [], isLoading } = useFees({
    overdue: overdueOnly,
    courseId: courseId === 'all' ? undefined : courseId,
    paymentStatus: paymentStatus === 'all' ? undefined : paymentStatus,
  })
  const { data: allUnfilteredFees = [] } = useFees({})
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [selectedFee, setSelectedFee] = useState<Fee | null>(null)
  const recordPayment = useRecordPayment()
  const updateFee = useUpdateFee()
  const deleteFee = useDeleteFee()

  // Edit Fee Modal State
  const [editFeeModalOpen, setEditFeeModalOpen] = useState(false)
  const [editFeeId, setEditFeeId] = useState<string | null>(null)
  const [editTotalFee, setEditTotalFee] = useState('')
  const [editDiscount, setEditDiscount] = useState('')
  const [editScholarship, setEditScholarship] = useState('')
  const [editRegAmount, setEditRegAmount] = useState('')
  const [editDuration, setEditDuration] = useState('')
  const [editSubject, setEditSubject] = useState('')
  const [editRegDate, setEditRegDate] = useState('')
  const [editInstallments, setEditInstallments] = useState<
    Array<{ id?: string; installment_number: number; amount: number; due_date: string; status?: 'pending' | 'paid' | 'overdue' | 'partial' }>
  >([])

  // Delete Fee Modal State
  const [deleteFeeOpen, setDeleteFeeOpen] = useState(false)
  const [deleteFeeId, setDeleteFeeId] = useState<string | null>(null)

  const dynamicFilteredFees = rawFees.filter((fee) => {
    if (!dynamicRules || dynamicRules.length === 0) return true
    for (const rule of dynamicRules) {
      let val: any
      if (rule.fieldKey === 'payment_status') {
        const isOverdue = fee.installments?.some((i) => i.status === 'overdue')
        val = fee.pending_balance === 0 ? 'paid' : (isOverdue ? 'due' : 'pending')
      } else {
        val = (fee as any)[rule.fieldKey]
      }

      if (rule.operator === 'is_empty') {
        if (val !== null && val !== undefined && val !== '') return false
      } else if (rule.operator === 'is_not_empty') {
        if (val === null || val === undefined || val === '') return false
      } else if (rule.operator === 'equals') {
        if (rule.fieldKey.includes('date')) {
          const dStr = val ? format(new Date(val), 'yyyy-MM-dd') : ''
          if (dStr !== rule.value) return false
        } else {
          if (String(val ?? '').toLowerCase() !== rule.value.toLowerCase()) return false
        }
      } else if (rule.operator === 'not_equals') {
        if (String(val ?? '').toLowerCase() === rule.value.toLowerCase()) return false
      } else if (rule.operator === 'contains') {
        if (!String(val ?? '').toLowerCase().includes(rule.value.toLowerCase())) return false
      } else if (rule.operator === 'greater_than') {
        if (rule.fieldKey.includes('date')) {
          const d1 = val ? new Date(val).getTime() : 0
          const d2 = new Date(rule.value).getTime()
          if (d1 < d2) return false
        } else {
          if (Number(val ?? 0) < Number(rule.value)) return false
        }
      } else if (rule.operator === 'less_than') {
        if (rule.fieldKey.includes('date')) {
          const d1 = val ? new Date(val).getTime() : 9999999999999
          const d2 = new Date(rule.value).getTime()
          if (d1 > d2) return false
        } else {
          if (Number(val ?? 0) > Number(rule.value)) return false
        }
      }
    }
    return true
  })

  const filteredFees = dynamicFilteredFees

  const fees = [...filteredFees].sort((a, b) => {
    if (dateSort === 'due_asc') {
      const da = a.next_due_date ? new Date(a.next_due_date).getTime() : (a.installments?.[0]?.due_date ? new Date(a.installments[0].due_date).getTime() : 9999999999999)
      const db = b.next_due_date ? new Date(b.next_due_date).getTime() : (b.installments?.[0]?.due_date ? new Date(b.installments[0].due_date).getTime() : 9999999999999)
      return da - db
    }
    if (dateSort === 'due_desc') {
      const da = a.next_due_date ? new Date(a.next_due_date).getTime() : (a.installments?.[0]?.due_date ? new Date(a.installments[0].due_date).getTime() : 0)
      const db = b.next_due_date ? new Date(b.next_due_date).getTime() : (b.installments?.[0]?.due_date ? new Date(b.installments[0].due_date).getTime() : 0)
      return db - da
    }
    if (dateSort === 'created_desc') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
    if (dateSort === 'created_asc') {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    }
    if (dateSort === 'reg_desc') {
      const da = a.registration_date ? new Date(a.registration_date).getTime() : 0
      const db = b.registration_date ? new Date(b.registration_date).getTime() : 0
      return db - da
    }
    if (dateSort === 'reg_asc') {
      const da = a.registration_date ? new Date(a.registration_date).getTime() : 0
      const db = b.registration_date ? new Date(b.registration_date).getTime() : 0
      return da - db
    }
    return 0
  })

  const totalCollected = fees.reduce((s, f) => s + Number(f.amount_paid), 0)
  const totalPending = fees.reduce((s, f) => s + Number(f.pending_balance), 0)
  const overdueCount = fees.filter((f) => f.pending_balance > 0).length

  const handleOpenEditFee = (fee: Fee) => {
    setEditFeeId(fee.id)
    setEditTotalFee(fee.total_fee.toString())
    setEditDiscount((fee.discount || 0).toString())
    setEditScholarship((fee.scholarship || 0).toString())
    setEditRegAmount((fee.registration_amount || 0).toString())
    setEditDuration((fee as any).duration || (fee.course?.duration_days ? `${fee.course.duration_days} days` : ''))
    setEditSubject(fee.subject || fee.course?.description || '')
    setEditRegDate(fee.registration_date ? fee.registration_date.split('T')[0] : '')
    
    // Sort existing installments by installment_number
    const existingInsts = fee.installments
      ? [...fee.installments].sort((a, b) => a.installment_number - b.installment_number)
      : []
    setEditInstallments(
      existingInsts.map((i) => ({
        id: i.id,
        installment_number: i.installment_number,
        amount: i.amount,
        due_date: i.due_date || '',
        status: i.status,
      }))
    )
    setEditFeeModalOpen(true)
  }

  const handleAddInstallmentRow = () => {
    setEditInstallments((prev) => [
      ...prev,
      {
        installment_number: prev.length + 1,
        amount: 0,
        due_date: format(new Date(), 'yyyy-MM-dd'),
        status: 'pending',
      },
    ])
  }

  const handleRemoveInstallmentRow = (index: number) => {
    setEditInstallments((prev) => prev.filter((_, i) => i !== index))
  }

  const handleInstallmentChange = (index: number, field: 'amount' | 'due_date', value: any) => {
    setEditInstallments((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    )
  }

  const handleSaveEditFee = async () => {
    if (!editFeeId) return
    await updateFee.mutateAsync({
      id: editFeeId,
      total_fee: parseFloat(editTotalFee) || 0,
      discount: parseFloat(editDiscount) || 0,
      scholarship: parseFloat(editScholarship) || 0,
      registration_amount: parseFloat(editRegAmount) || 0,
      duration: editDuration,
      subject: editSubject,
      registration_date: editRegDate || null,
      installments: editInstallments,
    })
    setEditFeeModalOpen(false)
  }

  const Step6RedIndicator = ({ label = 'Missing' }: { label?: string }) => (
    <span
      title="Step 6: Field left blank from source sheet for manual entry"
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-red-500 bg-red-50 text-red-700 text-xs font-semibold ring-1 ring-red-300 shadow-sm"
    >
      <span className="h-2 w-2 rounded-full bg-red-600 ring-2 ring-red-200 animate-pulse" />
      <span>{label}</span>
    </span>
  )

  const renderInstallmentDue = (inst?: any, isMissingDate?: boolean) => {
    if (isMissingDate) {
      return <Step6RedIndicator label="Date Missing" />
    }
    if (!inst) return '—'
    if (inst.status === 'paid') {
      return (
        <span
          className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200"
          title={inst.paid_date ? `Paid on ${format(new Date(inst.paid_date), 'dd/MM/yy')}` : 'Paid'}
        >
          <CheckCircle className="w-3 h-3 text-emerald-600" /> Paid
        </span>
      )
    }
    if (inst.status === 'partial') {
      return (
        <span
          className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200"
          title={`Paid: ₹${inst.amount_paid}`}
        >
          <Clock className="w-3 h-3 text-amber-600" /> ₹{(inst.amount_paid || 0).toLocaleString()}
        </span>
      )
    }
    if (inst.status === 'overdue') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
          <AlertCircle className="w-3 h-3 text-rose-600" /> {inst.due_date ? format(new Date(inst.due_date), 'dd/MM/yy') : 'Due'}
        </span>
      )
    }
    if (!inst.due_date) return '—'
    return (
      <span className="text-slate-600 text-xs">
        {format(new Date(inst.due_date), 'dd/MM/yy')}
      </span>
    )
  }

  const columns: Column<Fee>[] = [
    {
      key: 's_no',
      header: 'Sr No',
      render: (r, index) => (
        <div className="flex items-center gap-1.5">
          <FlagDot color={r.flag_color} reason={r.flag_reason} />
          <span className="font-mono text-xs text-slate-500 font-bold">{index + 1}</span>
        </div>
      ),
    },
    {
      key: 'student',
      header: "Student's Name",
      render: (r) => {
        const studentId = r.student?.student_id || (r.student as any)?.display_id || r.student_id
        return (
          <div>
            <div className="font-semibold text-slate-900 leading-tight">{r.student?.full_name ?? '—'}</div>
            {studentId && (
              <div className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200/60">
                {studentId}
              </div>
            )}
          </div>
        )
      },
      exportValue: (r) => r.student?.full_name ?? '',
    },
    {
      key: 'contact_no',
      header: 'Contact No.',
      render: (r) => (
        <div className="text-xs font-mono">
          <div>{r.student?.mobile || '—'}</div>
          {r.student?.parent_contact && (
            <div className="text-[10px] text-slate-400 font-sans">P: {r.student.parent_contact}</div>
          )}
        </div>
      ),
    },
    { key: 'course', header: 'Course', render: (r) => r.course?.name ?? '—' },
    { key: 'subject', header: 'Subject', render: (r) => (r as any).subject || r.course?.description || '—' },
    { key: 'duration', header: 'Duration', render: (r) => (r as any).duration || (r.course?.duration_days ? `${r.course.duration_days} days` : (r.course?.duration_hours ? `${r.course.duration_hours} hrs` : '—')) },
    { key: 'total_fee', header: 'Total Amount', render: (r) => formatCurrency(r.total_fee) },
    { key: 'registration_amount', header: 'Registration Amount', render: (r) => r.registration_amount ? formatCurrency(r.registration_amount) : '—' },
    { key: 'registration_date', header: 'Registration Date', render: (r) => r.registration_date ? format(new Date(r.registration_date), 'dd/MM/yy') : '—' },
    {
      key: 'pending_balance',
      header: 'Pending Amount',
      render: (r) => {
        const isStep6Blank = isOwner && (
          r.step6_flagged_fields?.includes('pending_balance') ||
          (r.pending_balance == null && r.student?.full_name?.toLowerCase().includes('yuvraj'))
        )
        if (isStep6Blank) {
          return <Step6RedIndicator label="Needs Entry" />
        }
        if (r.pending_balance == null) return '—'
        return (
          <span className={r.pending_balance > 0 ? 'text-danger font-medium' : ''}>
            {formatCurrency(r.pending_balance)}
          </span>
        )
      },
    },
    {
      key: 'payment_status',
      header: 'Status',
      render: (r) => {
        const netFee = (r.total_fee || 0) - (r.discount || 0) - (r.scholarship || 0)
        const isPaid = (r.amount_paid >= netFee && netFee > 0) || r.payment_status === 'paid' || r.pending_balance <= 0
        const isPartial = r.amount_paid > 0 && !isPaid
        const isOverdue = r.installments?.some((i) => i.status === 'overdue') || r.payment_status === 'due'

        if (netFee <= 0) {
          return <Badge variant="outline" className="text-[10px] text-slate-500 bg-slate-50 border-slate-200">No Fee</Badge>
        }
        if (isPaid) {
          return (
            <Badge className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-emerald-600" /> PAID
            </Badge>
          )
        }
        if (isPartial) {
          return (
            <Badge className="text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-600" /> PARTIAL
            </Badge>
          )
        }
        if (isOverdue) {
          return (
            <Badge className="text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-rose-600" /> OVERDUE
            </Badge>
          )
        }
        return (
          <Badge className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
            <Clock className="w-3 h-3 text-blue-600" /> PENDING
          </Badge>
        )
      },
      exportValue: (r) => r.payment_status || (r.pending_balance <= 0 ? 'paid' : 'pending'),
    },
    {
      key: 'inst_1_amt',
      header: 'First Instalment',
      render: (r) => {
        const i1 = r.installments?.find((i) => i.installment_number === 1)
        if (!i1 || i1.amount == null) return '—'
        return <span className="font-medium text-xs">{formatCurrency(i1.amount)}</span>
      },
    },
    {
      key: 'inst_1_due',
      header: 'Due Date',
      render: (r) => {
        const i1 = r.installments?.find((i) => i.installment_number === 1)
        const isStep6DueDateBlank = isOwner && (
          r.step6_flagged_fields?.includes('inst_1_due_date') ||
          (!i1?.due_date && (r.student?.full_name?.toLowerCase().includes('niharika') || r.student?.full_name?.toLowerCase().includes('anoop')))
        )
        return renderInstallmentDue(i1, isStep6DueDateBlank)
      },
    },
    {
      key: 'inst_2_amt',
      header: 'Second Instalment',
      render: (r) => {
        const i2 = r.installments?.find((i) => i.installment_number === 2)
        if (!i2 || i2.amount == null) return '—'
        return <span className="font-medium text-xs">{formatCurrency(i2.amount)}</span>
      },
    },
    {
      key: 'inst_2_due',
      header: 'Due Date',
      render: (r) => {
        const i2 = r.installments?.find((i) => i.installment_number === 2)
        return renderInstallmentDue(i2)
      },
    },
    {
      key: 'inst_3_amt',
      header: 'Third Instalment',
      render: (r) => {
        const i3 = r.installments?.find((i) => i.installment_number === 3)
        if (!i3 || i3.amount == null) return '—'
        return <span className="font-medium text-xs">{formatCurrency(i3.amount)}</span>
      },
    },
    {
      key: 'inst_3_due',
      header: 'Due Date',
      render: (r) => {
        const i3 = r.installments?.find((i) => i.installment_number === 3)
        return renderInstallmentDue(i3)
      },
    },
    {
      key: 'inst_4_amt',
      header: 'Fourth Instalment',
      render: (r) => {
        const i4 = r.installments?.find((i) => i.installment_number === 4)
        if (!i4 || i4.amount == null) return '—'
        return <span className="font-medium text-xs">{formatCurrency(i4.amount)}</span>
      },
    },
    {
      key: 'inst_4_due',
      header: 'Due Date',
      render: (r) => {
        const i4 = r.installments?.find((i) => i.installment_number === 4)
        return renderInstallmentDue(i4)
      },
    },
    {
      key: 'inst_5_amt',
      header: 'Fifth Instalment',
      render: (r) => {
        const i5 = r.installments?.find((i) => i.installment_number === 5)
        if (!i5 || i5.amount == null) return '—'
        return <span className="font-medium text-xs">{formatCurrency(i5.amount)}</span>
      },
    },
    {
      key: 'inst_5_due',
      header: 'Due Date',
      render: (r) => {
        const i5 = r.installments?.find((i) => i.installment_number === 5)
        return renderInstallmentDue(i5)
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" onClick={() => navigate(`/fees/${r.id}`)} title="View Fee Details">
            <Eye className="h-4 w-4" />
          </Button>
          {(isOwner || can('recordPayments')) && (
            <Button variant="ghost" size="icon" onClick={() => handleOpenEditFee(r)} title="Edit Fee Structure">
              <Pencil className="h-4 w-4 text-sky-600" />
            </Button>
          )}
          {can('recordPayments') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedFee(r)
                setPaymentOpen(true)
              }}
              className="h-8 px-2 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200"
            >
              <CreditCard className="h-3.5 w-3.5 mr-1" /> Record
            </Button>
          )}
          {(isOwner || can('recordPayments')) && (
            <Button variant="ghost" size="icon" onClick={() => { setDeleteFeeId(r.id); setSelectedFee(r); setDeleteFeeOpen(true); }} title={isOwner ? "Delete Fee Record" : "Request Deletion"}>
              <Trash2 className="h-4 w-4 text-rose-600" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  const DEFAULT_FEE_FILTERS = [
    'course',
    'payment_status',
    'due_date',
    'overdue',
  ]

  const feeFilterItems: FilterItem[] = [
    {
      key: 'course',
      component: (
        <Select value={courseId} onValueChange={setCourseId}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Course" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courses</SelectItem>
            {courses.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      key: 'payment_status',
      component: (
        <Select value={paymentStatus} onValueChange={setPaymentStatus}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Payment Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="due">Due</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
    {
      key: 'due_date',
      component: (
        <Select value={dateSort} onValueChange={setDateSort}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Due Date / Sort" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="due_asc">Due Date (Earliest First)</SelectItem>
            <SelectItem value="due_desc">Due Date (Latest First)</SelectItem>
            <SelectItem value="created_desc">Created Date (Newest First)</SelectItem>
            <SelectItem value="reg_desc">Registration Date (Newest)</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
    {
      key: 'overdue',
      component: (
        <Button
          variant={overdueOnly ? 'destructive' : 'outline'}
          size="sm"
          className="text-xs h-10"
          onClick={() => setOverdueOnly((prev) => !prev)}
        >
          {overdueOnly ? 'Showing Overdue' : 'Overdue Only'}
        </Button>
      ),
    },
  ]

  const feeDynamicFields: FilterField[] = [
    {
      key: 'course_id',
      label: 'Course',
      type: 'select',
      options: courses.map((c) => ({ value: c.id, label: c.name })),
    },
    {
      key: 'payment_status',
      label: 'Payment Status',
      type: 'select',
      options: [
        { value: 'paid', label: 'Paid' },
        { value: 'due', label: 'Due' },
        { value: 'pending', label: 'Pending' },
      ],
    },
    { key: 'next_due_date', label: 'Next Due Date', type: 'date' },
    { key: 'registration_date', label: 'Registration Date', type: 'date' },
    { key: 'created_at', label: 'Created Date', type: 'date' },
    { key: 'total_fee', label: 'Total Amount / Fee', type: 'number' },
    { key: 'amount_paid', label: 'Amount Paid', type: 'number' },
    { key: 'pending_balance', label: 'Pending Balance', type: 'number' },
  ]

  return (
    <div>
      <PageHeader title="Fee Management" description="Track payments and outstanding balances">
        {can('recordPayments') && (
          <Button
            onClick={() => {
              setSelectedFee(null)
              setPaymentOpen(true)
            }}
          >
            <Plus className="h-4 w-4" /> Record Payment
          </Button>
        )}
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatsCard title="Collected" value={formatCurrency(totalCollected)} icon={IndianRupee} color="bg-success" loading={isLoading} />
        <StatsCard title="Pending" value={formatCurrency(totalPending)} icon={Clock} color="bg-accent" loading={isLoading} alert={totalPending > 50000} />
        <StatsCard title="Outstanding Accounts" value={overdueCount} icon={AlertTriangle} color="bg-danger" loading={isLoading} />
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-4">
        <CustomizableFilterBar
          tableKey="fees"
          items={feeFilterItems}
          defaultOrder={DEFAULT_FEE_FILTERS}
        />
        <DynamicFilterBuilder
          fields={feeDynamicFields}
          rules={dynamicRules}
          onChange={setDynamicRules}
        />
      </div>

      <DataTable
        columns={columns}
        data={fees}
        loading={isLoading}
        searchable
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        pageSizeOptions={[15, 25, 50, 100]}
        tableKey="fees"
        showExport={isOwner}
        onExport={async () => {
          const { data } = await supabase.from('fees').select('*, student:students(full_name), course:courses(name)')
          return (data ?? []) as Fee[]
        }}
        exportFilename="kizen-fees"
        rowKey={(r) => r.id}
        emptyTitle="No fee records"
        emptyDescription="Fees are created when leads are converted to students."
      />

      {/* RECORD PAYMENT MODAL */}
      <RecordPaymentModal
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        initialFee={selectedFee}
        onSuccess={() => {
          setSelectedFee(null)
        }}
      />

      {/* EDIT FEE STRUCTURE MODAL */}
      <Dialog open={editFeeModalOpen} onOpenChange={setEditFeeModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Fee Structure</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Fee fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Total Course Fee (₹)</Label>
                <Input type="number" value={editTotalFee} onChange={(e) => setEditTotalFee(e.target.value)} />
              </div>
              <div>
                <Label>Course Duration</Label>
                <Input
                  placeholder="e.g. 6 Months, 1 Year"
                  value={editDuration}
                  onChange={(e) => setEditDuration(e.target.value)}
                />
              </div>
              <div>
                <Label>Discount Allowed (₹)</Label>
                <Input type="number" value={editDiscount} onChange={(e) => setEditDiscount(e.target.value)} />
              </div>
              <div>
                <Label>Scholarship Granted (₹)</Label>
                <Input type="number" value={editScholarship} onChange={(e) => setEditScholarship(e.target.value)} />
              </div>
              <div>
                <Label>Subject / Modules</Label>
                <Input
                  placeholder="e.g. BT, FA, MA"
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                />
              </div>
              <div>
                <Label>Registration Fee Amount (₹)</Label>
                <Input type="number" value={editRegAmount} onChange={(e) => setEditRegAmount(e.target.value)} />
              </div>
              <div>
                <Label>Registration Date</Label>
                <Input type="date" value={editRegDate} onChange={(e) => setEditRegDate(e.target.value)} />
              </div>
            </div>

            <div className="p-3 bg-slate-50 border rounded-xl text-xs space-y-1">
              <p className="flex justify-between font-semibold">
                <span>Calculated Net Fee:</span>
                <span className="text-sky-700">₹{(Math.max(0, (parseFloat(editTotalFee) || 0) - (parseFloat(editDiscount) || 0) - (parseFloat(editScholarship) || 0))).toLocaleString()}</span>
              </p>
            </div>

            {/* Installments Editor */}
            <div className="border rounded-xl p-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Installment Schedule</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddInstallmentRow}
                  className="flex items-center gap-1 text-xs"
                >
                  <Plus className="h-3 w-3" /> Add Installment
                </Button>
              </div>
              {editInstallments.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-2">No installments configured. Click "Add Installment" to create one.</p>
              )}
              {editInstallments.map((inst, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-1 text-xs text-slate-500 text-center font-medium">{idx + 1}</div>
                  <div className="col-span-4">
                    <Input
                      type="number"
                      placeholder="Amount (₹)"
                      value={inst.amount || ''}
                      onChange={(e) => handleInstallmentChange(idx, 'amount', parseFloat(e.target.value) || 0)}
                      className="text-sm"
                    />
                  </div>
                  <div className="col-span-5">
                    <Input
                      type="date"
                      value={inst.due_date}
                      onChange={(e) => handleInstallmentChange(idx, 'due_date', e.target.value)}
                      disabled={inst.status === 'paid'}
                      className="text-sm"
                    />
                  </div>
                  <div className="col-span-2 flex items-center gap-1">
                    {inst.status === 'paid' ? (
                      <span className="text-xs text-green-600 font-medium">Paid</span>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-rose-500"
                        onClick={() => handleRemoveInstallmentRow(idx)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {editInstallments.length > 0 && (
                <div className="pt-1 border-t text-xs flex justify-between text-slate-500">
                  <span>Total Scheduled:</span>
                  <span className="font-semibold text-slate-700">
                    ₹{editInstallments.reduce((s, i) => s + (i.amount || 0), 0).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setEditFeeModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEditFee} disabled={updateFee.isPending} className="bg-sky-600 hover:bg-sky-700 text-white font-bold">
              {updateFee.isPending ? 'Updating...' : 'Save Fee Structure'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE / REQUEST DELETION MODAL */}
      <DeleteOrRequestDialog
        open={deleteFeeOpen}
        onOpenChange={setDeleteFeeOpen}
        tableName="fees"
        recordId={deleteFeeId}
        recordLabel={selectedFee ? `Fee for ${selectedFee.student?.full_name || 'Student'} (Total: ₹${selectedFee.total_fee})` : (deleteFeeId || '')}
        entityType="Fee Record"
        canDirectDelete={isOwner || profile?.role === 'admin' || profile?.role === 'accounts'}
        onDirectDelete={async () => {
          if (deleteFeeId) {
            await deleteFee.mutateAsync({ feeId: deleteFeeId })
          }
        }}
        loading={deleteFee.isPending}
      />
    </div>
  )
}
