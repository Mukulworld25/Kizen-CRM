import { useRef } from 'react'
import { format } from 'date-fns'
import type { FeePayment, Student, Fee } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Printer, Download, CheckCircle2 } from 'lucide-react'

interface ReceiptModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payment: FeePayment
  student: Student
  fee: Fee
}

export function ReceiptModal({ open, onOpenChange, payment, student, fee }: ReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    const w = window.open('', '_blank')
    if (!w || !receiptRef.current) return

    w.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Fee Receipt - ${payment.receipt_number || 'RECEIPT'}</title>
          <style>
            @page { size: A4; margin: 20mm; }
            body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 24px; background: #fff; }
            .receipt-box { border: 2px solid #0284c7; border-radius: 12px; padding: 32px; max-width: 680px; margin: 0 auto; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 24px; }
            .brand { display: flex; align-items: center; gap: 12px; }
            .logo { width: 48px; height: 48px; background: linear-gradient(135deg, #0284c7, #0369a1); border-radius: 12px; color: white; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; }
            .title { font-size: 22px; font-weight: 700; color: #0f172a; margin: 0; }
            .subtitle { font-size: 13px; color: #64748b; margin-top: 2px; }
            .receipt-tag { background: #e0f2fe; color: #0369a1; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
            .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; background: #f8fafc; padding: 20px; border-radius: 8px; font-size: 14px; }
            .detail-item { display: flex; flex-direction: column; }
            .label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; margin-bottom: 2px; }
            .val { font-weight: 600; color: #1e293b; }
            .amount-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 32px; }
            .amount-title { font-size: 12px; color: #166534; font-weight: 600; text-transform: uppercase; margin-bottom: 4px; }
            .amount-val { font-size: 32px; font-weight: 800; color: #15803d; }
            .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 24px; font-size: 12px; color: #64748b; }
            .signature { text-align: right; }
            .sig-line { width: 160px; border-bottom: 1px solid #94a3b8; margin-bottom: 4px; display: inline-block; }
          </style>
        </head>
        <body>
          ${receiptRef.current.innerHTML}
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `)
    w.document.close()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Official Fee Receipt
          </DialogTitle>
        </DialogHeader>

        <div ref={receiptRef} className="receipt-box p-4 bg-white rounded-xl border border-slate-200">
          <div className="header flex justify-between items-start border-b pb-4 mb-4">
            <div className="brand flex items-center gap-3">
              <div className="logo flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-600 to-indigo-700 text-white font-bold text-xl shadow">
                K
              </div>
              <div>
                <h2 className="title text-xl font-bold text-slate-900">Kizen Education</h2>
                <p className="subtitle text-xs text-slate-500">Excellence in Skill & AI Education</p>
              </div>
            </div>
            <div className="text-right">
              <span className="receipt-tag bg-sky-50 text-sky-700 border border-sky-200 text-xs px-3 py-1 rounded-full font-semibold">
                Payment Receipt
              </span>
              <p className="text-xs text-slate-400 mt-1">Receipt #{payment.receipt_number ?? 'REC-' + payment.id.slice(0, 6)}</p>
            </div>
          </div>

          <div className="details-grid grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-lg text-xs sm:text-sm mb-4">
            <div>
              <span className="label block text-[10px] uppercase text-slate-400 font-semibold">Student Name</span>
              <span className="val font-semibold text-slate-800">{student.full_name}</span>
            </div>
            <div>
              <span className="label block text-[10px] uppercase text-slate-400 font-semibold">Student ID</span>
              <span className="val font-mono font-semibold text-slate-800">{student.student_id ?? '—'}</span>
            </div>
            <div>
              <span className="label block text-[10px] uppercase text-slate-400 font-semibold">Course</span>
              <span className="val font-medium text-slate-800">{fee.course?.name ?? '—'}</span>
            </div>
            <div>
              <span className="label block text-[10px] uppercase text-slate-400 font-semibold">Payment Date</span>
              <span className="val font-medium text-slate-800">{format(new Date(payment.payment_date), 'dd MMMM yyyy')}</span>
            </div>
            <div>
              <span className="label block text-[10px] uppercase text-slate-400 font-semibold">Payment Method</span>
              <span className="val font-medium capitalize text-slate-800">{payment.payment_method?.replace('_', ' ')}</span>
            </div>
            <div>
              <span className="label block text-[10px] uppercase text-slate-400 font-semibold">Transaction ID</span>
              <span className="val font-mono text-slate-700">{payment.transaction_id || 'Cash / Internal'}</span>
            </div>
          </div>

          <div className="amount-box bg-emerald-50/80 border border-emerald-200 p-4 rounded-lg text-center mb-4">
            <span className="amount-title block text-xs font-semibold text-emerald-800 uppercase tracking-wider">Amount Paid</span>
            <span className="amount-val text-3xl font-extrabold text-emerald-700">{formatCurrency(payment.amount)}</span>
          </div>

          <div className="flex justify-between items-center text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100">
            <div>
              <span>Net Course Fee: <strong>{formatCurrency(fee.net_fee)}</strong></span>
            </div>
            <div>
              <span>Remaining Balance: <strong className={fee.pending_balance > 0 ? 'text-amber-600' : 'text-emerald-600'}>{formatCurrency(fee.pending_balance)}</strong></span>
            </div>
          </div>

          <div className="footer flex justify-between items-end pt-6 mt-4 border-t text-xs text-slate-400">
            <div>
              <p className="italic">This is a computer-generated receipt.</p>
              <p>© Kizen Education. All rights reserved.</p>
            </div>
            <div className="text-right">
              <div className="border-b border-slate-300 w-36 mb-1 ml-auto"></div>
              <p className="font-semibold text-slate-600">Authorized Signatory</p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between items-center sm:justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={handlePrint} className="bg-sky-600 hover:bg-sky-700 text-white gap-2">
            <Printer className="h-4 w-4" />
            <Download className="h-4 w-4" />
            Print / Save PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
