import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Search, UserCheck, X, CheckCircle, Clock, CreditCard, Sparkles } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input, Label } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useFees, useRecordPayment, useInstallments } from '@/hooks/useStudents'
import { formatCurrency } from '@/lib/utils'
import type { Fee, PaymentMethod, FeePayment } from '@/types'
import toast from 'react-hot-toast'

interface RecordPaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialFee?: Fee | null
  onSuccess?: (payment?: FeePayment) => void
}

export function RecordPaymentModal({
  open,
  onOpenChange,
  initialFee,
  onSuccess,
}: RecordPaymentModalProps) {
  const { data: allFees = [] } = useFees({})
  const recordPayment = useRecordPayment()

  const [selectedFee, setSelectedFee] = useState<Fee | null>(initialFee || null)
  const [isChangingStudent, setIsChangingStudent] = useState(false)
  const [studentSearchQuery, setStudentSearchQuery] = useState('')

  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('upi')
  const [txnId, setTxnId] = useState('')
  const [payDate, setPayDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  // Fetch live installments for selected fee
  const { data: liveInstallments = [] } = useInstallments(selectedFee?.id)

  useEffect(() => {
    if (open) {
      if (initialFee) {
        setSelectedFee(initialFee)
        setIsChangingStudent(false)
      } else {
        setSelectedFee(null)
        setIsChangingStudent(true)
      }
      setAmount('')
      setTxnId('')
      setPayDate(format(new Date(), 'yyyy-MM-dd'))
      setStudentSearchQuery('')
    }
  }, [open, initialFee])

  // Keep selectedFee up to date if allFees updates in background
  useEffect(() => {
    if (selectedFee?.id && allFees.length > 0) {
      const updated = allFees.find((f) => f.id === selectedFee.id)
      if (updated) {
        setSelectedFee(updated)
      }
    }
  }, [allFees, selectedFee?.id])

  const matchingFees = allFees.filter((f) => {
    if (!studentSearchQuery.trim()) return true
    const q = studentSearchQuery.toLowerCase().trim()
    const nameMatch = (f.student?.full_name || '').toLowerCase().includes(q)
    const idMatch = (f.student?.display_id || (f.student as any)?.student_id || '')
      .toLowerCase()
      .includes(q)
    const mobileMatch = (f.student?.mobile || '').toLowerCase().includes(q)
    const courseMatch = (f.course?.name || '').toLowerCase().includes(q)
    return nameMatch || idMatch || mobileMatch || courseMatch
  })

  const installmentsToDisplay = (liveInstallments.length > 0 ? liveInstallments : selectedFee?.installments) || []

  // Next unpaid installment amount for quick fill
  const nextUnpaidInstallment = installmentsToDisplay.find((i) => i.status !== 'paid' && Number(i.pending_balance ?? i.amount) > 0)

  const handleSelectFee = (fee: Fee) => {
    setSelectedFee(fee)
    setIsChangingStudent(false)
    setStudentSearchQuery('')
    if (fee.pending_balance > 0) {
      // Auto-suggest next due or pending
      const nextInst = fee.installments?.find((i) => i.status !== 'paid' && Number(i.pending_balance ?? i.amount) > 0)
      if (nextInst) {
        setAmount(String(nextInst.pending_balance ?? nextInst.amount))
      } else {
        setAmount(String(fee.pending_balance))
      }
    }
  }

  const handleSubmit = async () => {
    if (!selectedFee) {
      toast.error('Please select a student account first')
      return
    }

    const numericAmount = parseFloat(amount)
    if (!numericAmount || numericAmount <= 0) {
      toast.error('Please enter a valid payment amount')
      return
    }

    try {
      const res = await recordPayment.mutateAsync({
        fee_id: selectedFee.id,
        student_id: selectedFee.student_id,
        amount: numericAmount,
        payment_method: method,
        transaction_reference: txnId.trim() || null,
        payment_date: payDate,
      })

      onOpenChange(false)
      onSuccess?.(res as any)
    } catch (err: any) {
      // toast error handled by mutation onError
    }
  }

  const studentDisplayId =
    selectedFee?.student?.display_id || (selectedFee?.student as any)?.student_id || ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <CreditCard className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">Record Fee Payment</DialogTitle>
              <p className="text-xs text-slate-500">
                Payment updates the student ledger, clears installments, and syncs across all user accounts in real time.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* STUDENT SELECTOR OR SELECTED CONTEXT */}
          {!selectedFee || isChangingStudent ? (
            <div className="space-y-2 border border-amber-200 bg-amber-50/50 rounded-xl p-3.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4 text-amber-600" />
                  Select Student Account <span className="text-rose-500">*</span>
                </Label>
                {selectedFee && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsChangingStudent(false)
                      setStudentSearchQuery('')
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800 underline flex items-center gap-1"
                  >
                    <X className="h-3 w-3" /> Cancel
                  </button>
                )}
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  id="record-payment-student-search"
                  placeholder="Search student by name, student ID, mobile or course..."
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  className="pl-9 bg-white text-sm border-slate-300 focus:border-emerald-500"
                  autoFocus
                />
              </div>

              {/* Student matches list */}
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white shadow-inner mt-2">
                {matchingFees.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    {studentSearchQuery
                      ? `No students found matching "${studentSearchQuery}"`
                      : 'No student fee records found'}
                  </div>
                ) : (
                  matchingFees.map((f) => {
                    const sId = f.student?.display_id || (f.student as any)?.student_id
                    const isFullyPaid = f.pending_balance <= 0 && (f.amount_paid > 0 || f.total_fee > 0)
                    return (
                      <button
                        type="button"
                        key={f.id}
                        onClick={() => handleSelectFee(f)}
                        className="w-full text-left p-2.5 hover:bg-emerald-50/70 focus:bg-emerald-50/90 transition-colors flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-900 text-xs truncate">
                              {f.student?.full_name || 'Unnamed Student'}
                            </span>
                            {sId && (
                              <span className="font-mono text-[10px] font-bold text-sky-800 bg-sky-100/80 px-1.5 py-0.5 rounded border border-sky-200">
                                {sId}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5 truncate">
                            {f.student?.mobile && <span>{f.student.mobile}</span>}
                            {f.course?.name && (
                              <>
                                <span>•</span>
                                <span className="truncate">{f.course.name}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div
                            className={`font-bold text-xs ${
                              isFullyPaid ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {formatCurrency(f.pending_balance)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {isFullyPaid ? 'cleared' : 'pending'}
                          </div>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-base font-bold text-slate-900 tracking-tight">
                      {selectedFee.student?.full_name || 'Student'}
                    </h4>
                    {studentDisplayId && (
                      <span className="font-mono text-xs font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded border border-sky-200">
                        {studentDisplayId}
                      </span>
                    )}
                    {selectedFee.pending_balance <= 0 ? (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                        PAID
                      </Badge>
                    ) : selectedFee.amount_paid > 0 ? (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">
                        PARTIAL
                      </Badge>
                    ) : (
                      <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px]">
                        DUE
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                    {selectedFee.student?.mobile && <span>Ph: {selectedFee.student.mobile}</span>}
                    {selectedFee.course?.name && (
                      <>
                        <span>•</span>
                        <span>{selectedFee.course.name}</span>
                      </>
                    )}
                  </div>
                </div>

                {!initialFee && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsChangingStudent(true)
                      setStudentSearchQuery('')
                    }}
                    className="text-xs text-slate-600 border-slate-300 hover:bg-slate-100 h-7 px-2"
                  >
                    Change
                  </Button>
                )}
              </div>

              {/* Financial Snapshot */}
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200 text-center">
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase block">Total Net Fee</span>
                  <span className="text-sm font-bold text-slate-900">
                    {formatCurrency(selectedFee.net_fee ?? selectedFee.total_fee)}
                  </span>
                </div>
                <div className="p-2 bg-emerald-50/60 rounded-lg border border-emerald-200">
                  <span className="text-[10px] font-semibold text-emerald-700 uppercase block">Total Paid</span>
                  <span className="text-sm font-bold text-emerald-800">
                    {formatCurrency(selectedFee.amount_paid)}
                  </span>
                </div>
                <div className="p-2 bg-rose-50/60 rounded-lg border border-rose-200">
                  <span className="text-[10px] font-semibold text-rose-700 uppercase block">Pending Balance</span>
                  <span className="text-sm font-bold text-rose-800">
                    {formatCurrency(selectedFee.pending_balance)}
                  </span>
                </div>
              </div>

              {/* Installments overview */}
              {installmentsToDisplay.length > 0 && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-600 block mb-1.5">
                    Installment Breakdown:
                  </span>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {installmentsToDisplay.map((inst) => {
                      const isInstPaid = inst.status === 'paid'
                      const isInstPartial = inst.status === 'partial'
                      const instPending = inst.pending_balance ?? (isInstPaid ? 0 : inst.amount)
                      return (
                        <div
                          key={inst.id || inst.installment_number}
                          className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs"
                        >
                          <div>
                            <span className="font-semibold text-slate-800">
                              Inst #{inst.installment_number}: {formatCurrency(inst.amount)}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              Due: {inst.due_date ? format(new Date(inst.due_date), 'dd MMM yyyy') : '—'}
                            </span>
                          </div>
                          <div>
                            {isInstPaid ? (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] gap-1">
                                <CheckCircle className="h-3 w-3" /> Paid
                              </Badge>
                            ) : isInstPartial ? (
                              <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] gap-1">
                                <Clock className="h-3 w-3" /> Bal: ₹{instPending}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-slate-600 text-[10px]">
                                Pending
                              </Badge>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick-Fill Amount Buttons */}
          {selectedFee && selectedFee.pending_balance > 0 && (
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Quick Fill:
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAmount(String(selectedFee.pending_balance))}
                className="text-xs h-7 bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 font-semibold"
              >
                Pay Full Pending ({formatCurrency(selectedFee.pending_balance)})
              </Button>
              {nextUnpaidInstallment && Number(nextUnpaidInstallment.pending_balance ?? nextUnpaidInstallment.amount) !== selectedFee.pending_balance && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount(String(nextUnpaidInstallment.pending_balance ?? nextUnpaidInstallment.amount))}
                  className="text-xs h-7 bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 font-semibold"
                >
                  Pay Next Due #{nextUnpaidInstallment.installment_number} ({formatCurrency(Number(nextUnpaidInstallment.pending_balance ?? nextUnpaidInstallment.amount))})
                </Button>
              )}
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-3 pt-1">
            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Payment Amount (₹) <span className="text-rose-500">*</span>
              </Label>
              <div className="relative mt-1">
                <Input
                  id="record-payment-amount"
                  type="number"
                  min="1"
                  step="any"
                  placeholder={
                    selectedFee ? `Max balance: ₹${selectedFee.pending_balance}` : 'Enter amount'
                  }
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="font-bold text-slate-900 text-base"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Payment Method</Label>
                <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upi">UPI / QR Code</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer (NEFT/IMPS)</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Debit / Credit Card</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Payment Date</Label>
                <Input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Transaction Reference / Receipt ID
              </Label>
              <Input
                placeholder="e.g. UPI Ref, UTR number, Bank Txn # (optional)"
                value={txnId}
                onChange={(e) => setTxnId(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-3 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={recordPayment.isPending || !selectedFee || !amount || parseFloat(amount) <= 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
          >
            {recordPayment.isPending ? 'Recording Payment...' : 'Save & Record Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
