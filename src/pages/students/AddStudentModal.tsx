import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreateStudent } from '@/hooks/useStudents'
import { useCourses } from '@/hooks/useLeads'
import { useBatches } from '@/hooks/useStudents'

interface AddStudentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddStudentModal({ open, onOpenChange }: AddStudentModalProps) {
  const createStudent = useCreateStudent()
  const { data: courses = [] } = useCourses()
  const { data: batches = [] } = useBatches()

  const [formData, setFormData] = useState({
    full_name: '',
    mobile: '',
    email: '',
    course_id: '',
    batch_id: '',
    admission_date: new Date().toISOString().split('T')[0],
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.full_name || !formData.mobile) return

    await createStudent.mutateAsync({
      full_name: formData.full_name,
      mobile: formData.mobile,
      email: formData.email || null,
      course_id: formData.course_id || null,
      batch_id: formData.batch_id || null,
      admission_date: formData.admission_date || undefined,
      is_active: true,
      certification_status: 'not_started',
    })
    onOpenChange(false)
    setFormData({
      full_name: '',
      mobile: '',
      email: '',
      course_id: '',
      batch_id: '',
      admission_date: new Date().toISOString().split('T')[0],
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Enroll New Student</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="mobile">Mobile Number *</Label>
              <Input
                id="mobile"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <Label>Course</Label>
              <Select
                value={formData.course_id}
                onValueChange={(v) => setFormData({ ...formData, course_id: v })}
              >
                <SelectTrigger><SelectValue placeholder="Select Course" /></SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Batch</Label>
              <Select
                value={formData.batch_id}
                onValueChange={(v) => setFormData({ ...formData, batch_id: v })}
              >
                <SelectTrigger><SelectValue placeholder="Select Batch" /></SelectTrigger>
                <SelectContent>
                  {batches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.batch_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="admission_date">Admission Date</Label>
              <Input
                id="admission_date"
                type="date"
                value={formData.admission_date}
                onChange={(e) => setFormData({ ...formData, admission_date: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createStudent.isPending || !formData.full_name || !formData.mobile}>
              {createStudent.isPending ? 'Enrolling...' : 'Enroll Student'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
