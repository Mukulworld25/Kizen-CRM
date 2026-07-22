import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useFees, useRecordPayment } from '@/hooks/useStudents'
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
import type { Fee, PaymentMethod } from '@/types'
import { supabase } from '@/lib/supabase'

export default function FeeManagement() {
  const navigate = useNavigate()
  const { can, isOwner } = useAuth()
  const [overdueOnly, setOverdueOnly] = useState(false)
  const { data: fees = [], isLoading } = useFees({ overdue: overdueOnly })
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [selectedFee, setSelectedFee] = useState<Fee | null>(null)
  const recordPayment = useRecordPayment()

  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('upi')
  const [txnId, setTxnId] = useState('')
  const [payDate, setPayDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  const totalCollected = fees.reduce((s, f) => s + Number(f.amount_paid), 0)
  const totalPending = fees.reduce((s, f) => s + Number(f.pending_balance), 0)
  const overdueCount = fees.filter((f) => f.pending_balance > 0).length

  const columns: Column<Fee>[] = [
    { key: 'student', header: 'Student', render: (r) => r.student?.full_name ?? '—', exportValue: (r) => r.student?.full_name ?? '' },
    { key: 'course', header: 'Course', render: (r) => r.course?.name ?? '—' },
    { key: 'total_fee', header: 'Total', render: (r) => formatCurrency(r.total_fee) },
    { key: 'amount_paid', header: 'Paid', render: (r) => formatCurrency(r.amount_paid) },
    { key: 'pending_balance', header: 'Balance', render: (r) => (
      <span className={r.pending_balance > 0 ? 'text-danger font-medium' : ''}>{formatCurrency(r.pending_balance)}</span>
    )},
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
      header: '',
      render: (r) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/fees/${r.id}`) }}>View</Button>
          {can('recordPayments') && (
            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedFee(r); setPaymentOpen(true) }}>
              Record
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

      <div className="mb-4 flex items-center gap-2 bg-white rounded-xl border border-border p-3 shadow-sm">
        <Button variant={overdueOnly ? 'default' : 'outline'} size="sm" onClick={() => setOverdueOnly((o) => !o)}>
          {overdueOnly ? 'Showing Overdue' : 'Filter Overdue'}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={fees}
        loading={isLoading}
        searchable
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
    </div>
  )
}