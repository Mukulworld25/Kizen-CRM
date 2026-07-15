import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateInstitution, useBdmList } from '@/hooks/useInstitutions'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const schema = z.object({
  name: z.string().min(2, 'Name required'),
  type: z.enum(['school', 'college']),
  address: z.string().optional(),
  city: z.string().optional(),
  contact_person: z.string().optional(),
  contact_phone: z.string().optional(),
  contact_email: z.string().optional(),
  mou_status: z.enum(['not_started', 'in_discussion', 'signed', 'expired']),
  mou_expiry_date: z.string().optional(),
  assigned_bdm_id: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function AddInstitutionModal({ open, onOpenChange }: Props) {
  const createInstitution = useCreateInstitution()
  const { data: bdms = [] } = useBdmList()

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'college', mou_status: 'not_started' },
  })

  const onSubmit = async (data: FormData) => {
    await createInstitution.mutateAsync(data as never)
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add Institution</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Institution Name *</Label>
            <Input {...register('name')} />
            {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={watch('type')} onValueChange={(v) => setValue('type', v as 'school' | 'college')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="school">School</SelectItem>
                <SelectItem value="college">College</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>City</Label>
            <Input {...register('city')} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Address</Label>
            <Textarea {...register('address')} rows={2} />
          </div>
          <div className="space-y-2">
            <Label>Contact Person</Label>
            <Input {...register('contact_person')} />
          </div>
          <div className="space-y-2">
            <Label>Contact Phone</Label>
            <Input {...register('contact_phone')} />
          </div>
          <div className="space-y-2">
            <Label>Contact Email</Label>
            <Input type="email" {...register('contact_email')} />
          </div>
          <div className="space-y-2">
            <Label>MOU Status</Label>
            <Select value={watch('mou_status')} onValueChange={(v) => setValue('mou_status', v as FormData['mou_status'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="in_discussion">In Discussion</SelectItem>
                <SelectItem value="signed">Signed</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>MOU Expiry Date</Label>
            <Input type="date" {...register('mou_expiry_date')} />
          </div>
          <div className="space-y-2">
            <Label>Assigned BDM</Label>
            <Select value={watch('assigned_bdm_id') ?? ''} onValueChange={(v) => setValue('assigned_bdm_id', v)}>
              <SelectTrigger><SelectValue placeholder="Select BDM" /></SelectTrigger>
              <SelectContent>
                {bdms.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}