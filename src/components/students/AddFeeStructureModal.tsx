import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCourses } from '@/hooks/useLeads'
import { supabase } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import type { Student, Course } from '@/types'

interface AddFeeStructureModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  student: Student
}

export function AddFeeStructureModal({ open, onOpenChange, student }: AddFeeStructureModalProps) {
  const queryClient = useQueryClient()
  const { data: courses = [] } = useCourses()
  const [courseId, setCourseId] = useState(student.course_id || '')
  const [totalFee, setTotalFee] = useState('')
  const [discount, setDiscount] = useState('0')
  const [scholarship, setScholarship] = useState('0')
  const [installmentsCount, setInstallmentsCount] = useState('1')
  const [firstDueDate, setFirstDueDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)

  const parsedTotal = parseFloat(totalFee) || 0
  const parsedDiscount = parseFloat(discount) || 0
  const parsedScholarship = parseFloat(scholarship) || 0
  const netFee = Math.max(0, parsedTotal - parsedDiscount - parsedScholarship)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!totalFee || parsedTotal <= 0) {
      toast.error('Please enter a valid total fee')
      return
    }

    setLoading(true)
    try {
      // 1. Insert fee record
      const { data: feeData, error: feeError } = await supabase
        .from('fees')
        .insert({
          student_id: student.id,
          course_id: courseId || student.course_id || null,
          total_fee: parsedTotal,
          discount: parsedDiscount,
          scholarship: parsedScholarship,
          amount_paid: 0,
        })
        .select()
        .single()

      if (feeError) throw feeError

      // 2. Generate installments if requested
      const count = parseInt(installmentsCount, 10) || 1
      if (count > 0 && feeData?.id) {
        const instAmount = Math.round((netFee / count) * 100) / 100
        const installmentRows = []
        const baseDate = new Date(firstDueDate || new Date())

        for (let i = 1; i <= count; i++) {
          const dueDate = new Date(baseDate)
          dueDate.setMonth(dueDate.getMonth() + (i - 1))
          installmentRows.push({
            fee_id: feeData.id,
            student_id: student.id,
            installment_number: i,
            amount: i === count ? netFee - (instAmount * (count - 1)) : instAmount,
            due_date: dueDate.toISOString().split('T')[0],
            status: 'pending',
          })
        }

        const { error: instError } = await supabase.from('installments').insert(installmentRows)
        if (instError) console.error('Failed to create initial installments:', instError)
      }

      // If student course was updated or not set, update student record
      if (courseId && courseId !== student.course_id) {
        await supabase.from('students').update({ course_id: courseId }).eq('id', student.id)
      }

      toast.success('Fee structure added successfully!')
      queryClient.invalidateQueries({ queryKey: ['fees'] })
      queryClient.invalidateQueries({ queryKey: ['students'] })
      queryClient.invalidateQueries({ queryKey: ['student', student.id] })
      onOpenChange(false)
    } catch (err: any) {
      console.error('Failed to create fee record:', err)
      toast.error(err.message || 'Failed to create fee record')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Fee Structure</DialogTitle>
          <DialogDescription>
            Generate a new fee record and payment schedule for {student.full_name}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="courseSelect">Course</Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger id="courseSelect">
                <SelectValue placeholder="Select course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c: Course) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="totalFee">Total Fee (₹) *</Label>
            <Input
              id="totalFee"
              type="number"
              min="0"
              step="100"
              placeholder="e.g. 50000"
              value={totalFee}
              onChange={(e) => setTotalFee(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="discount">Discount (₹)</Label>
              <Input
                id="discount"
                type="number"
                min="0"
                step="100"
                placeholder="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="scholarship">Scholarship (₹)</Label>
              <Input
                id="scholarship"
                type="number"
                min="0"
                step="100"
                placeholder="0"
                value={scholarship}
                onChange={(e) => setScholarship(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="installments">Installments</Label>
              <Select value={installmentsCount} onValueChange={setInstallmentsCount}>
                <SelectTrigger id="installments">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 (Full Payment)</SelectItem>
                  <SelectItem value="2">2 Installments</SelectItem>
                  <SelectItem value="3">3 Installments</SelectItem>
                  <SelectItem value="4">4 Installments</SelectItem>
                  <SelectItem value="5">5 Installments</SelectItem>
                  <SelectItem value="6">6 Installments</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="firstDueDate">First Due Date</Label>
              <Input
                id="firstDueDate"
                type="date"
                value={firstDueDate}
                onChange={(e) => setFirstDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">Net Payable Fee:</span>
            <span className="text-sm font-bold text-slate-900">₹{netFee.toLocaleString('en-IN')}</span>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !totalFee || parsedTotal <= 0}>
              {loading ? 'Creating...' : 'Create Fee Structure'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
