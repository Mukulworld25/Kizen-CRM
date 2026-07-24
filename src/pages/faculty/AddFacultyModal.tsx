import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'

const inviteSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email address'),
})

type InviteForm = z.infer<typeof inviteSchema>

export default function AddFacultyModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
  })

  const handleInvite = async (data: InviteForm) => {
    try {
      // Insert directly into the users table as a "record only" faculty member
      // This bypasses the 10-user Auth limit because no Supabase Auth account is created.
      const { error } = await supabase.from('users').insert({
        name: data.name,
        email: data.email,
        role: 'faculty',
        is_active: true
      })

      if (error) {
        throw new Error(error.message)
      }

      toast.success('Faculty member added successfully as a record')
      reset()
      onOpenChange(false)
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['all-enrolled-students'] })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add faculty')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o) }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Faculty Record</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(handleInvite)} className="space-y-4 pt-4">
          <div>
            <Label>Full Name</Label>
            <Input {...register('name')} placeholder="e.g. John Doe" />
          </div>
          <div>
            <Label>Email Address</Label>
            <Input type="email" {...register('email')} placeholder="john@example.com" />
            <p className="text-xs text-muted-foreground mt-1.5">
              Added as a record only. They will not have login access and this does not count towards your 10 user limit.
            </p>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Faculty'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
