import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateStudent, useBatches, useStudents } from '@/hooks/useStudents'
import { useCourses, useLeads } from '@/hooks/useLeads'
import { supabase } from '@/lib/supabase'
import type { Lead } from '@/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ConvertToStudentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead: Lead
}

export function ConvertToStudentModal({ open, onOpenChange, lead }: ConvertToStudentModalProps) {
  const navigate = useNavigate()
  const createStudent = useCreateStudent()
  const { data: courses = [] } = useCourses()
  const { data: batches = [] } = useBatches()
  const { data: leadsData } = useLeads({ pageSize: 1000 })
  const { data: students = [] } = useStudents()
  const [courseId, setCourseId] = useState(lead.interested_course_id ?? '')
  const [batchId, setBatchId] = useState('')
  const [totalFee, setTotalFee] = useState('')
  const [referredByLeadId, setReferredByLeadId] = useState(lead.referred_by_lead_id ?? '')
  const [referredByStudentId, setReferredByStudentId] = useState((lead as any).referred_by_student_id ?? '')

  const filteredBatches = batches.filter((b) => !courseId || b.course_id === courseId)

  const handleConvert = async () => {
    const { data: student, error } = await supabase
      .from('students')
      .insert({
        lead_id: lead.id,
        full_name: lead.full_name,
        mobile: lead.mobile,
        email: lead.email,
        parent_name: lead.parent_name,
        parent_contact: lead.parent_contact,
        city: lead.city,
        school_college: lead.school_college,
        course_id: courseId || null,
        batch_id: batchId || null,
        referred_by_lead_id: referredByLeadId || null,
        referred_by_student_id: referredByStudentId || null,
      })
      .select()
      .single()

    if (error) throw error

    if (totalFee && student) {
      await supabase.from('fees').insert({
        student_id: student.id,
        course_id: courseId || null,
        total_fee: parseFloat(totalFee),
      })
    }

    onOpenChange(false)
    navigate(`/students/${student.id}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convert to Student</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-500">
          Convert <strong>{lead.full_name}</strong> from lead to enrolled student.
        </p>
        <div className="space-y-4">
          <div>
            <Label>Course</Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
              <SelectContent>
                {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Batch</Label>
            <Select value={batchId} onValueChange={setBatchId}>
              <SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
              <SelectContent>
                {filteredBatches.map((b) => <SelectItem key={b.id} value={b.id}>{b.batch_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Total Fee (₹)</Label>
            <Input type="number" value={totalFee} onChange={(e) => setTotalFee(e.target.value)} placeholder="45000" />
          </div>
          <div>
            <Label>Referred By (Lead)</Label>
            <Select value={referredByLeadId} onValueChange={setReferredByLeadId}>
              <SelectTrigger><SelectValue placeholder="Select Lead" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {(leadsData?.leads ?? []).filter(l => l.id !== lead.id).map((l) => <SelectItem key={l.id} value={l.id}>{l.full_name} ({l.mobile})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Referred By (Student)</Label>
            <Select value={referredByStudentId} onValueChange={setReferredByStudentId}>
              <SelectTrigger><SelectValue placeholder="Select Student" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {students.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name} ({s.mobile})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConvert} disabled={createStudent.isPending}>
            {createStudent.isPending ? 'Converting...' : 'Convert & Enroll'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
