import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ArrowLeft, Printer } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useFee, useFeePayments, useInstallments } from '@/hooks/useStudents'
import { PageHeader } from '@/components/shared/PageHeader'
import { ReceiptModal } from '@/components/shared/ReceiptModal'
import { InvoiceModal } from '@/components/shared/InvoiceModal'
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

  if (isLoading) return <Skeleton className="h-64 w-full" />
  if (!fee) return <p>Fee record not found</p>

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate('/fees')}>
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      <PageHeader
        title={fee.student?.full_name ?? 'Fee Detail'}
        description={fee.student?.student_id ?? ''}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <BreakdownCard label="Total Fee" value={formatCurrency(fee.total_fee)} />
        <BreakdownCard label="Discount" value={formatCurrency(fee.discount)} />
        <BreakdownCard label="Scholarship" value={formatCurrency(fee.scholarship)} />
        <BreakdownCard label="Net Fee" value={formatCurrency(fee.net_fee)} highlight />
      </div>
      <div className="flex items-center gap-2 mb-4">
        {fee.gst_applicable && can('recordPayments') && fee.student && (
          <Button size="sm" variant="outline" onClick={() => setInvoiceOpen(true)}>
            Generate GST Invoice
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="border-b border-border/50 pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              Installment Schedule
            </CardTitle>
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
                    <TableHead className="text-primary/80 font-medium">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {installments.map((inst) => (
                    <TableRow key={inst.id}>
                      <TableCell>{inst.installment_number}</TableCell>
                      <TableCell>{format(new Date(inst.due_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{formatCurrency(inst.amount)}</TableCell>
                      <TableCell>
                        <Badge variant={inst.status === 'paid' ? 'success' : inst.status === 'overdue' ? 'destructive' : 'warning'}>
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
                    <p className="text-muted-foreground">{p.payment_date ? format(new Date(p.payment_date), 'MMM d, yyyy') : '—'} · {p.payment_method}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{formatCurrency(p.amount)}</span>
                    {can('recordPayments') && fee.student && (
                      <Button variant="ghost" size="icon" onClick={() => setReceiptPayment(p)}>
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
    </div>
  )
}

function BreakdownCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card className="relative overflow-hidden">
      <div className={cn('absolute top-0 right-0 w-16 h-16 rounded-full -translate-y-1/2 translate-x-1/2 opacity-10', highlight ? 'bg-accent' : 'bg-primary')} />
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-lg font-bold text-slate-900 ${highlight ? 'text-accent' : ''}`}>{value}</p>
      </CardContent>
    </Card>
  )
}