import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useUsers, useBatches } from '@/hooks/useStudents'
import { useCourses } from '@/hooks/useLeads'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { roleLabels } from '@/lib/permissions'
import { FieldValue } from '@/components/shared/FieldValue'
import ExportData from '@/components/shared/ExportData'
import TrashView from '@/components/shared/TrashView'
import type { UserRole } from '@/types'

const inviteSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: z.enum(['admin', 'counselor', 'faculty', 'accounts', 'reception']),
})

type InviteForm = z.infer<typeof inviteSchema>

export default function Settings() {
  const { data: users = [], refetch: refetchUsers } = useUsers()
  const { data: courses = [], refetch: refetchCourses } = useCourses()
  const { data: batches = [], refetch: refetchBatches } = useBatches()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [deactivateId, setDeactivateId] = useState<string | null>(null)
  const [newCourse, setNewCourse] = useState('')
  const [newBatch, setNewBatch] = useState({ name: '', courseId: '', facultyId: '' })

  const { register, handleSubmit, reset, setValue, watch, formState: { isSubmitting } } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: 'counselor' },
  })

  const userCount = users.length
  const atCap = userCount >= 10

  const handleInvite = async (data: InviteForm) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Invite failed')
      }
      toast.success('Invitation sent')
      reset()
      setInviteOpen(false)
      refetchUsers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invite failed')
    }
  }

  const handleDeactivate = async (id: string, active: boolean) => {
    const { error } = await supabase.from('users').update({ is_active: active }).eq('id', id)
    if (error) toast.error(error.message)
    else {
      toast.success(active ? 'User activated' : 'User deactivated')
      refetchUsers()
    }
    setDeactivateId(null)
  }

  const handleRoleChange = async (id: string, role: UserRole) => {
    const { error } = await supabase.from('users').update({ role }).eq('id', id)
    if (error) toast.error(error.message)
    else {
      toast.success('Role updated')
      refetchUsers()
    }
  }

  const handleAddCourse = async () => {
    if (!newCourse.trim()) return
    const { error } = await supabase.from('courses').insert({ name: newCourse })
    if (error) toast.error(error.message)
    else {
      toast.success('Course added')
      setNewCourse('')
      refetchCourses()
    }
  }

  const handleAddBatch = async () => {
    if (!newBatch.name.trim()) return
    const { error } = await supabase.from('batches').insert({
      batch_name: newBatch.name,
      course_id: newBatch.courseId || null,
      faculty_id: newBatch.facultyId || null,
    })
    if (error) toast.error(error.message)
    else {
      toast.success('Batch added')
      setNewBatch({ name: '', courseId: '', facultyId: '' })
      refetchBatches()
    }
  }

  return (
    <div>
      <PageHeader title="Settings" description="Manage users, courses, and system configuration" />

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users ({userCount}/10)</TabsTrigger>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="batches">Batches</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
          <TabsTrigger value="trash">Trash</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          {atCap && (
            <div className="mb-4 rounded-xl bg-accent/10 p-3 text-sm text-amber-800 border border-accent/20">
              Maximum 10 users reached. Deactivate a user to invite someone new.
            </div>
          )}
          <div className="mb-4">
            <Button onClick={() => setInviteOpen(true)} disabled={atCap}>
              <Plus className="h-4 w-4" /> Invite User
            </Button>
          </div>
          <Card className="shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-medium" style={{ color: 'var(--muted-foreground)' }}>Name</TableHead>
                    <TableHead className="font-medium" style={{ color: 'var(--muted-foreground)' }}>Email</TableHead>
                    <TableHead className="font-medium" style={{ color: 'var(--muted-foreground)' }}>Role</TableHead>
                    <TableHead className="font-medium" style={{ color: 'var(--muted-foreground)' }}>Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell className="font-medium">
                        <FieldValue value={u.name} />
                        {u.is_owner && <Badge className="ml-2">Owner</Badge>}
                      </TableCell>
                      <TableCell><FieldValue value={u.email} /></TableCell>
                      <TableCell>
                        {u.is_owner ? (
                          roleLabels.owner
                        ) : (
                          <Select value={u.role} onValueChange={(v) => handleRoleChange(u.id, v as UserRole)}>
                            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {(['admin','counselor','faculty','accounts','reception'] as UserRole[]).map((r) => (
                                <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell>
                        {!u.is_owner && (
                          <Switch
                            checked={u.is_active}
                            onCheckedChange={(checked) => {
                              if (!checked) setDeactivateId(u.id)
                              else handleDeactivate(u.id, true)
                            }}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="courses" className="mt-4">
          <div className="mb-4 flex gap-2 bg-white rounded-xl border border-border p-3 shadow-sm">
            <Input placeholder="Course name" value={newCourse} onChange={(e) => setNewCourse(e.target.value)} />
            <Button onClick={handleAddCourse}>Add Course</Button>
          </div>
          <Card className="shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-medium" style={{ color: 'var(--muted-foreground)' }}>Name</TableHead>
                    <TableHead className="font-medium" style={{ color: 'var(--muted-foreground)' }}>Duration</TableHead>
                    <TableHead className="font-medium" style={{ color: 'var(--muted-foreground)' }}>Fee</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courses.map((c) => (
                    <TableRow key={c.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell>{c.name}</TableCell>
                      <TableCell>{c.duration_days ? `${c.duration_days} days` : '—'}</TableCell>
                      <TableCell>{c.total_fee ? `₹${c.total_fee}` : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batches" className="mt-4">
          <div className="mb-4 grid gap-2 sm:grid-cols-4 bg-white rounded-xl border border-border p-3 shadow-sm">
            <Input placeholder="Batch name" value={newBatch.name} onChange={(e) => setNewBatch((b) => ({ ...b, name: e.target.value }))} />
            <Select value={newBatch.courseId} onValueChange={(v) => setNewBatch((b) => ({ ...b, courseId: v }))}>
              <SelectTrigger><SelectValue placeholder="Course" /></SelectTrigger>
              <SelectContent>
                {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={newBatch.facultyId} onValueChange={(v) => setNewBatch((b) => ({ ...b, facultyId: v }))}>
              <SelectTrigger><SelectValue placeholder="Faculty" /></SelectTrigger>
              <SelectContent>
                {users.filter((u) => u.role === 'faculty').map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAddBatch}>Add Batch</Button>
          </div>
          <Card className="shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-medium" style={{ color: 'var(--muted-foreground)' }}>Batch</TableHead>
                    <TableHead className="font-medium" style={{ color: 'var(--muted-foreground)' }}>Course</TableHead>
                    <TableHead className="font-medium" style={{ color: 'var(--muted-foreground)' }}>Seats</TableHead>
                    <TableHead className="font-medium" style={{ color: 'var(--muted-foreground)' }}>Faculty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((b) => (
                    <TableRow key={b.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell>{b.batch_name}</TableCell>
                      <TableCell>{(b as { course?: { name: string } }).course?.name ?? '—'}</TableCell>
                      <TableCell>{b.enrolled_count}/{b.total_seats}</TableCell>
                      <TableCell>{(b as { faculty?: { name: string } }).faculty?.name ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="mt-4">
          <Card className="shadow-sm">
            <CardHeader className="border-b border-border/50 pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary" />
                CRM Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div>
                <Label>CRM Name</Label>
                <Input defaultValue="Kizen Education CRM" />
              </div>
              <p className="text-sm text-muted-foreground">Logo upload available after Supabase Storage is configured.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="mt-4">
          <ExportData />
        </TabsContent>

        <TabsContent value="trash" className="mt-4">
          <TrashView />
        </TabsContent>
      </Tabs>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Invite User</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(handleInvite)} className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input {...register('name')} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" {...register('email')} />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={watch('role')} onValueChange={(v) => setValue('role', v as InviteForm['role'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['admin','counselor','faculty','accounts','reception'] as const).map((r) => (
                    <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Sending...' : 'Send Invite'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deactivateId}
        onOpenChange={() => setDeactivateId(null)}
        title="Deactivate user?"
        description="This user will no longer be able to access the CRM."
        destructive
        onConfirm={() => deactivateId && handleDeactivate(deactivateId, false)}
      />
    </div>
  )
}