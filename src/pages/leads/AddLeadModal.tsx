import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/hooks/useAuth'
import { useCreateLead, useCounselors, useCourses, useLeads } from '@/hooks/useLeads'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LEAD_SOURCES, type Lead } from '@/types'

const schema = z.object({
  full_name: z.string().min(2, 'Name required'),
  mobile: z.string().min(10, 'Valid mobile required'),
  email: z.string().email().optional().or(z.literal('')),
  parent_name: z.string().optional(),
  parent_contact: z.string().optional(),
  city: z.string().optional(),
  school_college: z.string().optional(),
  class_year: z.string().optional(),
  graduation_year: z.string().optional(),
  graduation_degree: z.string().optional(),
  interested_course_id: z.string().optional(),
  source: z.string().optional(),
  referred_by_lead_id: z.string().optional(),
  assigned_counselor_id: z.string().optional(),
  priority: z.enum(['high', 'medium', 'low']),
  temperature: z.enum(['hot', 'warm', 'cold']).optional(),
  budget: z.string().optional(),
  expected_joining_date: z.string().optional(),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface AddLeadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function AddLeadModal({ open, onOpenChange }: AddLeadModalProps) {
  const { can, profile } = useAuth()
  const createLead = useCreateLead()
  const { data: counselors = [] } = useCounselors()
  const { data: courses = [] } = useCourses()
  const { data: leadsData } = useLeads({ pageSize: 1000 })
  const existingLeads: Lead[] = leadsData?.leads ?? []

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'medium' },
  })

  const onSubmit = async (data: FormData) => {
    await createLead.mutateAsync({
      ...data,
      email: data.email || null,
      referred_by_lead_id: data.referred_by_lead_id || null,
      assigned_counselor_id: data.assigned_counselor_id || profile?.id || null,
      budget: data.budget ? parseFloat(data.budget) : null,
      expected_joining_date: data.expected_joining_date || null,
    } as never)
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Full Name *</Label>
            <Input {...register('full_name')} />
            {errors.full_name && <p className="text-xs text-danger">{errors.full_name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Mobile *</Label>
            <Input {...register('mobile')} />
            {errors.mobile && <p className="text-xs text-danger">{errors.mobile.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" {...register('email')} />
          </div>
          <div className="space-y-2">
            <Label>City</Label>
            <Input {...register('city')} />
          </div>
          <div className="space-y-2">
            <Label>Parent Name</Label>
            <Input {...register('parent_name')} />
          </div>
          <div className="space-y-2">
            <Label>Parent Contact</Label>
            <Input {...register('parent_contact')} />
          </div>
          <div className="space-y-2">
            <Label>School/College</Label>
            <Input {...register('school_college')} />
          </div>
          <div className="space-y-2">
            <Label>Class/Year</Label>
            <Input {...register('class_year')} />
          </div>
          <div className="space-y-2">
            <Label>Interested Course</Label>
            <Select value={watch('interested_course_id') ?? ''} onValueChange={(v) => setValue('interested_course_id', v)}>
              <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
              <SelectContent>
                {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Source</Label>
            <Select value={watch('source') ?? ''} onValueChange={(v) => setValue('source', v)}>
              <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
              <SelectContent>
                {LEAD_SOURCES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Referred By (Existing Lead)</Label>
            <Select value={watch('referred_by_lead_id') ?? ''} onValueChange={(v) => setValue('referred_by_lead_id', v)}>
              <SelectTrigger><SelectValue placeholder="Select referring lead" /></SelectTrigger>
              <SelectContent>
                {existingLeads.map((l) => <SelectItem key={l.id} value={l.id}>{l.full_name} ({l.mobile})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {can('assignCounselor') && (
            <div className="space-y-2">
              <Label>Assigned Counselor</Label>
              <Select value={watch('assigned_counselor_id') ?? ''} onValueChange={(v) => setValue('assigned_counselor_id', v)}>
                <SelectTrigger><SelectValue placeholder="Select counselor" /></SelectTrigger>
                <SelectContent>
                  {counselors.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Temperature</Label>
            <Select value={watch('temperature') ?? ''} onValueChange={(v) => setValue('temperature', v as 'hot' | 'warm' | 'cold')}>
              <SelectTrigger><SelectValue placeholder="Select temp" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hot">Hot</SelectItem>
                <SelectItem value="warm">Warm</SelectItem>
                <SelectItem value="cold">Cold</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Budget (₹)</Label>
            <Input type="number" {...register('budget')} placeholder="0" />
          </div>
          <div className="space-y-2">
            <Label>Expected Joining Date</Label>
            <Input type="date" {...register('expected_joining_date')} />
          </div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={watch('priority')} onValueChange={(v) => setValue('priority', v as 'high' | 'medium' | 'low')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Notes</Label>
            <Textarea {...register('notes')} rows={3} />
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Lead'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}