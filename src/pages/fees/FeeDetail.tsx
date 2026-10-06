import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ArrowLeft, Printer, CreditCard, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useFee, useFeePayments, useInstallments } from '@/hooks/useStudents'
import { PageHeader } from '@/components/shared/PageHeader'
import { ReceiptModal } from '@/components/shared/ReceiptModal'
import { InvoiceModal } from '@/components/shared/InvoiceModal'
import { RecordPaymentModal } from '@/components/shared/RecordPaymentModal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/table'
import { formatCurrency, cn } from '@/lib/utils'
import type { FeePayment } from '@/types'

export default function FeeDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { can } = useAuth()
  const { data: fee, isLoading } = useFee(id)
  const { data: payments = [] } = useFeePayments(id)
  const { data: installments = [] } = useInstallments(id)
  const [receiptPayment, setReceiptPayment] = useState<FeePayment | null>(null)
  const [invoiceOpen, setInvoiceOpen] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)

  if (isLoading) return <Skeleton className="h-64 w-full" />
  if (!fee) return <p>Fee record not found</p>

  const isPaid = fee.payment_status === 'paid' || fee.pending_balance <= 0
  const isPartial = fee.payment_status === 'partial' || (fee.amount_paid > 0 && fee.pending_balance > 0)
  const isOverdue = fee.payment_status === 'overdue' || installments.some((i) => i.status === 'overdue')

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate('/fees')}>
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {fee.student?.full_name ?? 'Fee Detail'}
            </h1>
            {fee.student?.student_id && (
              <Badge variant="outline" className="font-mono text-xs">
                {fee.student.student_id}
              </Badge>
            )}
            {isPaid ? (
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs gap-1 font-bold">
                <CheckCircle className="w-3.5 h-3.5" /> PAID
              </Badge>
            ) : isPartial ? (
              <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs gap-1 font-bold">
                <Clock className="w-3.5 h-3.5" /> PARTIAL
              </Badge>
            ) : isOverdue ? (
              <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-xs gap-1 font-bold">
                <AlertCircle className="w-3.5 h-3.5" /> OVERDUE
              </Badge>
            ) : (
              <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs gap-1 font-bold">
                <Clock className="w-3.5 h-3.5" /> PENDING
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {fee.course?.name ? `Course: ${fee.course.name}` : ''}
            {fee.next_due_date && !isPaid ? ` · Next Due: ${format(new Date(fee.next_due_date), 'dd MMM yyyy')}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {can('recordPayments') && (
            <Button
              size="sm"
              onClick={() => setPaymentModalOpen(true)}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
            >
              <CreditCard className="h-4 w-4" /> Record Payment
            </Button>
          )}
          {fee.gst_applicable && can('recordPayments') && fee.student && (
            <Button size="sm" variant="outline" onClick={() => setInvoiceOpen(true)}>
              Generate GST Invoice
            </Button>
          )}
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-5">
        <BreakdownCard label="Total Fee" value={formatCurrency(fee.total_fee)} />
        <BreakdownCard label="Net Fee" value={formatCurrency(fee.net_fee ?? (fee.total_fee - (fee.discount || 0) - (fee.scholarship || 0)))} />
        <BreakdownCard label="Amount Paid" value={formatCurrency(fee.amount_paid)} className="border-emerald-200 bg-emerald-50/50 text-emerald-950 font-bold" />
        <BreakdownCard label="Pending Balance" value={formatCurrency(fee.pending_balance)} className="border-rose-200 bg-rose-50/50 text-rose-950 font-bold" />
        <BreakdownCard label="Discount / Schol." value={formatCurrency((fee.discount || 0) + (fee.scholarship || 0))} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="border-b border-border/50 pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              Installment Schedule
            </CardTitle>
            {installments.length > 0 && (
              <span className="text-xs text-slate-400">{installments.length} installment{installments.length > 1 ? 's' : ''}</span>
            )}
          </CardHeader>
          <CardContent className="pt-4">
            {installments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No installments configured.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-primary/80 font-medium">#</TableHead>
                    <TableHead className="text-primary/80 font-medium">Due Date</TableHead>
                    <TableHead className="text-primary/80 font-medium">Amount</TableHead>
                    <TableHead className="text-primary/80 font-medium">Paid</TableHead>
                    <TableHead className="text-primary/80 font-medium">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {installments.map((inst) => (
                    <TableRow key={inst.id}>
                      <TableCell className="font-semibold">{inst.installment_number}</TableCell>
                      <TableCell>{inst.due_date ? format(new Date(inst.due_date), 'dd MMM yyyy') : '—'}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(inst.amount)}</TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {inst.amount_paid != null ? formatCurrency(inst.amount_paid) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={inst.status === 'paid' ? 'success' : inst.status === 'overdue' ? 'destructive' : inst.status === 'partial' ? 'warning' : 'outline'}>
                          {inst.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-border/50 pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-success" />
              Payment History
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments yet.</p>
            ) : (
              payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between border-b border-border/50 py-3 text-sm last:border-0">
                  <div>
                    <p className="font-medium text-slate-800">{p.receipt_number}</p>
                    <p className="text-muted-foreground">{p.payment_date ? format(new Date(p.payment_date), 'dd MMM yyyy') : '—'} · <span className="capitalize">{p.payment_method?.replace('_', ' ')}</span></p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{formatCurrency(p.amount)}</span>
                    {can('recordPayments') && fee.student && (
                      <Button variant="ghost" size="icon" onClick={() => setReceiptPayment(p)} title="Print Receipt">
                        <Printer className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {receiptPayment && fee.student && (
        <ReceiptModal
          open={!!receiptPayment}
          onOpenChange={() => setReceiptPayment(null)}
          payment={receiptPayment}
          student={fee.student}
          fee={fee}
        />
      )}

      {fee.student && (
        <InvoiceModal
          open={invoiceOpen}
          onOpenChange={setInvoiceOpen}
          fee={fee}
          student={fee.student}
        />
      )}

      {/* RECORD PAYMENT MODAL */}
      <RecordPaymentModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        initialFee={fee}
      />
    </div>
  )
}

function BreakdownCard({ label, value, highlight, className }: { label: string; value: string; highlight?: boolean; className?: string }) {
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <div className={cn('absolute top-0 right-0 w-16 h-16 rounded-full -translate-y-1/2 translate-x-1/2 opacity-10', highlight ? 'bg-accent' : 'bg-primary')} />
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-lg font-bold text-slate-900 ${highlight ? 'text-accent' : ''}`}>{value}</p>
      </CardContent>
    </Card>
  )
}