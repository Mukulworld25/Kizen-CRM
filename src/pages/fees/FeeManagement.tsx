import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Eye, Pencil, Trash2, CreditCard } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useFees, useRecordPayment, useUpdateFee } from '@/hooks/useStudents'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatsCard } from '@/components/shared/StatsCard'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input, Label } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { IndianRupee, AlertTriangle, Clock } from 'lucide-react'
import FlagDot from '@/components/ui/FlagDot'
import type { Fee, PaymentMethod } from '@/types'
import { FEE_COURSE_LEVELS } from '@/types'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function FeeManagement() {
  const navigate = useNavigate()
  const { can, isOwner } = useAuth()
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [courseLevel, setCourseLevel] = useState<string>('all')
  const [paymentStatus, setPaymentStatus] = useState<string>('all')
  const [flaggedOnly, setFlaggedOnly] = useState(false)
  const { data: rawFees = [], isLoading } = useFees({
    overdue: overdueOnly,
    courseLevel,
    paymentStatus: paymentStatus === 'all' ? undefined : paymentStatus,
  })
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [selectedFee, setSelectedFee] = useState<Fee | null>(null)
  const recordPayment = useRecordPayment()
  const updateFee = useUpdateFee()

  // Edit Fee Modal State
  const [editFeeModalOpen, setEditFeeModalOpen] = useState(false)
  const [editFeeId, setEditFeeId] = useState<string | null>(null)
  const [editTotalFee, setEditTotalFee] = useState('')
  const [editDiscount, setEditDiscount] = useState('')
  const [editScholarship, setEditScholarship] = useState('')
  const [editRegAmount, setEditRegAmount] = useState('')

  // Delete Fee Modal State
  const [deleteFeeOpen, setDeleteFeeOpen] = useState(false)
  const [deleteFeeId, setDeleteFeeId] = useState<string | null>(null)

  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('upi')
  const [txnId, setTxnId] = useState('')
  const [payDate, setPayDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  const fees = flaggedOnly ? rawFees.filter((f) => f.flag_color != null) : rawFees

  const totalCollected = fees.reduce((s, f) => s + Number(f.amount_paid), 0)
  const totalPending = fees.reduce((s, f) => s + Number(f.pending_balance), 0)
  const overdueCount = fees.filter((f) => f.pending_balance > 0).length

  const handleOpenEditFee = (fee: Fee) => {
    setEditFeeId(fee.id)
    setEditTotalFee(fee.total_fee.toString())
    setEditDiscount((fee.discount || 0).toString())
    setEditScholarship((fee.scholarship || 0).toString())
    setEditRegAmount((fee.registration_amount || 0).toString())
    setEditFeeModalOpen(true)
  }

  const handleSaveEditFee = async () => {
    if (!editFeeId) return
    await updateFee.mutateAsync({
      id: editFeeId,
      total_fee: parseFloat(editTotalFee) || 0,
      discount: parseFloat(editDiscount) || 0,
      scholarship: parseFloat(editScholarship) || 0,
      registration_amount: parseFloat(editRegAmount) || 0,
    })
    setEditFeeModalOpen(false)
  }

  const columns: Column<Fee>[] = [
    {
      key: 'flag',
      header: '',
      render: (r) => (
        <div className="flex items-center justify-center w-4">
          <FlagDot color={r.flag_color} reason={r.flag_reason} />
        </div>
      ),
    },
    { key: 'student', header: 'Student', render: (r) => r.student?.full_name ?? '—', exportValue: (r) => r.student?.full_name ?? '' },
    { key: 'course', header: 'Course', render: (r) => r.course?.name ?? '—' },
    { key: 'subject', header: 'Subject', render: (r) => (r as any).subject || r.course?.description || '—' },
    { key: 'duration', header: 'Duration', render: (r) => (r as any).duration || (r.course?.duration_days ? `${r.course.duration_days} days` : (r.course?.duration_hours ? `${r.course.duration_hours} hrs` : '—')) },
    { key: 'total_fee', header: 'Total', render: (r) => formatCurrency(r.total_fee) },
    { key: 'discount', header: 'Discount', render: (r) => formatCurrency(r.discount) },
    { key: 'scholarship', header: 'Scholarship', render: (r) => formatCurrency(r.scholarship) },
    { key: 'registration_amount', header: 'Reg Amt', render: (r) => formatCurrency(r.registration_amount) },
    { key: 'net_fee', header: 'Net Fee', render: (r) => formatCurrency(r.net_fee) },
    { key: 'amount_paid', header: 'Paid', render: (r) => formatCurrency(r.amount_paid) },
    { key: 'pending_balance', header: 'Balance', render: (r) => (
      <span className={r.pending_balance > 0 ? 'text-danger font-medium' : ''}>{formatCurrency(r.pending_balance)}</span>
    )},
    {
      key: 'inst_1',
      header: 'Inst 1',
      render: (r) => {
        const i1 = r.installments?.find(i => i.installment_number === 1)
        if (!i1) return '—'
        return <div className="text-xs"><span>{formatCurrency(i1.amount)}</span><br/><span className={i1.status === 'overdue' ? 'text-danger' : 'text-slate-500'}>{format(new Date(i1.due_date), 'dd/MM/yy')}</span></div>
      }
    },
    {
      key: 'inst_2',
      header: 'Inst 2',
      render: (r) => {
        const i2 = r.installments?.find(i => i.installment_number === 2)
        if (!i2) return '—'
        return <div className="text-xs"><span>{formatCurrency(i2.amount)}</span><br/><span className={i2.status === 'overdue' ? 'text-danger' : 'text-slate-500'}>{format(new Date(i2.due_date), 'dd/MM/yy')}</span></div>
      }
    },
    {
      key: 'inst_3',
      header: 'Inst 3',
      render: (r) => {
        const i3 = r.installments?.find(i => i.installment_number === 3)
        if (!i3) return '—'
        return <div className="text-xs"><span>{formatCurrency(i3.amount)}</span><br/><span className={i3.status === 'overdue' ? 'text-danger' : 'text-slate-500'}>{format(new Date(i3.due_date), 'dd/MM/yy')}</span></div>
      }
    },
    {
      key: 'next_due',
      header: 'Next Due',
      render: (r) => {
        const pendingInst = r.installments?.filter(i => i.status !== 'paid').sort((a,b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
        if (!pendingInst?.length) return '—'
        const next = pendingInst[0]
        return <span className={next.status === 'overdue' ? 'text-danger font-semibold text-xs' : 'text-slate-600 text-xs'}>{format(new Date(next.due_date), 'dd MMM')}</span>
      }
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <Badge variant={r.pending_balance <= 0 ? 'success' : r.pending_balance > 50000 ? 'destructive' : 'warning'}>
          {r.pending_balance <= 0 ? 'Paid' : 'Pending'}
        </Badge>
      ),
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
            <Button variant="outline" size="sm" onClick={() => { setSelectedFee(r); setPaymentOpen(true) }} className="h-8 px-2 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200">
              <CreditCard className="h-3.5 w-3.5 mr-1" /> Record
            </Button>
          )}
          {(isOwner || can('recordPayments')) && (
            <Button variant="ghost" size="icon" onClick={() => { setDeleteFeeId(r.id); setDeleteFeeOpen(true); }} title="Delete Fee Record">
              <Trash2 className="h-4 w-4 text-rose-600" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  const handlePayment = async () => {
    if (!selectedFee || !amount) return
    await recordPayment.mutateAsync({
      fee_id: selectedFee.id,
      student_id: selectedFee.student_id,
      amount: parseFloat(amount),
      payment_method: method,
      transaction_id: txnId || null,
      payment_date: payDate,
    })
    setPaymentOpen(false)
    setAmount('')
    setTxnId('')
  }

  return (
    <div>
      <PageHeader title="Fee Management" description="Track payments and outstanding balances">
        {can('recordPayments') && (
          <Button onClick={() => setPaymentOpen(true)}><Plus className="h-4 w-4" /> Record Payment</Button>
        )}
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatsCard title="Collected" value={formatCurrency(totalCollected)} icon={IndianRupee} color="bg-success" loading={isLoading} />
        <StatsCard title="Pending" value={formatCurrency(totalPending)} icon={Clock} color="bg-accent" loading={isLoading} alert={totalPending > 50000} />
        <StatsCard title="Outstanding Accounts" value={overdueCount} icon={AlertTriangle} color="bg-danger" loading={isLoading} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 bg-white rounded-xl border border-border p-3 shadow-sm">
        <Select value={courseLevel} onValueChange={setCourseLevel}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Course Level / Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Course Levels</SelectItem>
            {FEE_COURSE_LEVELS.map((lvl) => (
              <SelectItem key={lvl.value} value={lvl.value}>{lvl.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={paymentStatus} onValueChange={setPaymentStatus}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Payment Health" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="paid">Paid in Full</SelectItem>
            <SelectItem value="pending">Pending Balance</SelectItem>
            <SelectItem value="overdue">High Overdue (&gt;₹50k)</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant={overdueOnly ? 'destructive' : 'outline'}
          size="sm"
          className="text-xs"
          onClick={() => setOverdueOnly((prev) => !prev)}
        >
          {overdueOnly ? 'Showing Overdue' : 'Overdue Only'}
        </Button>

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
        data={fees}
        loading={isLoading}
        searchable
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
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          {selectedFee && (
            <p className="text-sm text-muted-foreground">
              {selectedFee.student?.full_name} · Balance: {formatCurrency(selectedFee.pending_balance)}
            </p>
          )}
          <div className="space-y-4">
            <div>
              <Label>Amount (₹)</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['cash', 'upi', 'bank_transfer'].map((m) => (
                    <SelectItem key={m} value={m} className="capitalize">{m.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Transaction ID</Label>
              <Input value={txnId} onChange={(e) => setTxnId(e.target.value)} />
            </div>
            <div>
              <Label>Payment Date</Label>
              <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentOpen(false)}>Cancel</Button>
            <Button onClick={handlePayment} disabled={recordPayment.isPending}>Save Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT FEE STRUCTURE MODAL */}
      <Dialog open={editFeeModalOpen} onOpenChange={setEditFeeModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Fee Structure</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Total Course Fee (₹)</Label>
              <Input type="number" value={editTotalFee} onChange={(e) => setEditTotalFee(e.target.value)} />
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
              <Label>Registration Fee Amount (₹)</Label>
              <Input type="number" value={editRegAmount} onChange={(e) => setEditRegAmount(e.target.value)} />
            </div>
            <div className="p-3 bg-slate-50 border rounded-xl text-xs space-y-1">
              <p className="flex justify-between font-semibold">
                <span>Calculated Net Fee:</span>
                <span className="text-sky-700">₹{(Math.max(0, (parseFloat(editTotalFee) || 0) - (parseFloat(editDiscount) || 0) - (parseFloat(editScholarship) || 0))).toLocaleString()}</span>
              </p>
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

      {/* DELETE FEE CONFIRMATION MODAL */}
      <Dialog open={deleteFeeOpen} onOpenChange={setDeleteFeeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-rose-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Delete Fee Record
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-slate-700 space-y-2">
            <p>Are you sure you want to remove this fee record?</p>
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
              <p className="font-semibold">Database Protection Notice:</p>
              <p className="mt-1">Fee deletion archives the full row to <code className="font-mono bg-rose-100 px-1 rounded">audit_removed_fees</code> before removal. Awaiting your DB function definition to finalize deletion execution.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteFeeOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                toast.error('Deletion awaiting DB function confirmation from Administrator.')
                setDeleteFeeOpen(false)
              }}
            >
              Confirm Deletion Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}