import { useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import type { Fee, Student, FeePayment } from '@/types'

interface InvoiceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fee: Fee
  student: Student
  payment?: FeePayment
}

export function InvoiceModal({ open, onOpenChange, fee, student, payment }: InvoiceModalProps) {
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    const w = window.open('', '_blank')
    if (!w || !printRef.current) return
    w.document.write(`
      <html><head><title>GST Invoice - ${student.full_name}</title>
      <style>
        body { font-family: 'Courier New', monospace; padding: 40px; color: #1e293b; }
        .invoice-title { font-size: 24px; font-weight: bold; margin-bottom: 4px; }
        .subtitle { color: #64748b; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
        th { background: #f8fafc; font-size: 12px; text-transform: uppercase; color: #64748b; }
        .total-row td { font-weight: bold; border-top: 2px solid #1e293b; }
        .gst-badge { background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 4px; font-size: 12px; display: inline-block; }
        .footer { margin-top: 40px; font-size: 12px; color: #94a3b8; text-align: center; }
        .header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 32px; }
        .company { font-size: 14px; color: #475569; }
      </style></head><body>
      ${printRef.current.innerHTML}
      <script>window.onload=function(){window.print();}</script>
      </body></html>
    `)
    w.document.close()
  }

  const gstAmount = fee.gst_applicable ? (fee.net_fee * fee.gst_percent / 100) : 0
  const totalWithGst = fee.net_fee + gstAmount

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>GST Invoice</DialogTitle>
        </DialogHeader>

        <div ref={printRef} className="space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">KIZEN EDUCATION</h2>
              <p className="text-sm text-muted-foreground">GSTIN: 29ABCDE1234F1Z5</p>
              <p className="text-sm text-muted-foreground">Invoice #{payment?.receipt_number ?? `INV-${Date.now().toString(36).toUpperCase()}`}</p>
            </div>
            <div className="text-right">
              {fee.gst_applicable && <span className="gst-badge">GST Applicable @ {fee.gst_percent}%</span>}
              <p className="text-sm mt-1">Date: {payment?.payment_date ? format(new Date(payment.payment_date), 'dd/MM/yyyy') : format(new Date(), 'dd/MM/yyyy')}</p>
            </div>
          </div>

          <div className="border-t border-b border-border py-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Bill To:</p>
              <p className="font-medium">{student.full_name}</p>
              <p>{student.email ?? '—'}</p>
              <p>{student.mobile}</p>
              {student.address && <p>{student.address}</p>}
              {student.student_id && <p className="text-xs text-muted-foreground mt-1">Student ID: {student.student_id}</p>}
            </div>
            <div className="text-right">
              <p className="text-muted-foreground">Course Info:</p>
              <p className="font-medium">{fee.course?.name ?? '—'}</p>
              <p className="text-xs text-muted-foreground">Admission: {student.admission_date ? format(new Date(student.admission_date), 'dd/MM/yyyy') : '—'}</p>
            </div>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr>
                <th>#</th>
                <th>Description</th>
                <th className="text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td>Course Fee{fee.course?.name ? ` - ${fee.course.name}` : ''}</td>
                <td className="text-right">{formatCurrency(fee.total_fee)}</td>
              </tr>
              {fee.discount > 0 && (
                <tr>
                  <td></td>
                  <td>Discount</td>
                  <td className="text-right text-danger">-{formatCurrency(fee.discount)}</td>
                </tr>
              )}
              {fee.scholarship > 0 && (
                <tr>
                  <td></td>
                  <td>Scholarship</td>
                  <td className="text-right text-danger">-{formatCurrency(fee.scholarship)}</td>
                </tr>
              )}
              <tr>
                <td></td>
                <td>Net Fee</td>
                <td className="text-right font-medium">{formatCurrency(fee.net_fee)}</td>
              </tr>
              {fee.gst_applicable && (
                <tr>
                  <td></td>
                  <td>GST @ {fee.gst_percent}%</td>
                  <td className="text-right">{formatCurrency(gstAmount)}</td>
                </tr>
              )}
              <tr className="total-row">
                <td></td>
                <td>Total</td>
                <td className="text-right font-bold text-lg">{formatCurrency(totalWithGst)}</td>
              </tr>
            </tbody>
          </table>

          {payment && (
            <div className="text-sm space-y-1">
              <p><span className="text-muted-foreground">Payment Method:</span> {payment.payment_method.replace('_', ' ')}</p>
              {payment.transaction_id && <p><span className="text-muted-foreground">Transaction ID:</span> {payment.transaction_id}</p>}
              <p><span className="text-muted-foreground">Amount Paid:</span> {formatCurrency(payment.amount)}</p>
            </div>
          )}

          <div className="footer">
            <p>This is a computer-generated invoice. Kizen Education — All Rights Reserved.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={handlePrint}>Print / Save PDF</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}