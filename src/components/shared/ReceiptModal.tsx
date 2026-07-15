import { format } from 'date-fns'
import type { FeePayment, Student, Fee } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'

interface ReceiptModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payment: FeePayment
  student: Student
  fee: Fee
}

export function ReceiptModal({ open, onOpenChange, payment, student, fee }: ReceiptModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <div id="receipt-print" className="space-y-4 p-2">
          <div className="text-center border-b border-border pb-4">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-lg font-bold text-white shadow-sm">
              K
            </div>
            <h2 className="text-xl font-bold">Kizen Education</h2>
            <p className="text-sm text-slate-500">Chandigarh, India</p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">Receipt No.</span>
            <span className="font-medium">{payment.receipt_number}</span>
            <span className="text-muted-foreground">Date</span>
            <span>{format(new Date(payment.payment_date), 'dd MMM yyyy')}</span>
            <span className="text-muted-foreground">Student</span>
            <span>{student.full_name}</span>
            <span className="text-muted-foreground">Student ID</span>
            <span>{student.student_id}</span>
            <span className="text-muted-foreground">Course</span>
            <span>{fee.course?.name ?? '—'}</span>
            <span className="text-muted-foreground">Amount Paid</span>
            <span className="font-bold text-lg">{formatCurrency(payment.amount)}</span>
            <span className="text-muted-foreground">Method</span>
            <span className="capitalize">{payment.payment_method?.replace('_', ' ')}</span>
            {payment.transaction_id && (
              <>
                <span className="text-muted-foreground">Transaction ID</span>
                <span>{payment.transaction_id}</span>
              </>
            )}
            <span className="text-muted-foreground">Balance</span>
            <span>{formatCurrency(fee.pending_balance)}</span>
          </div>

          <p className="text-center text-xs text-muted-foreground pt-4 border-t border-border">
            Thank you for choosing Kizen Education
          </p>
        </div>

        <div className="no-print flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={() => window.print()}>Print</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
