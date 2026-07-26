import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import {
  useInstitution, useInstitutionMeetings, useCreateInstitutionMeeting,
  useInstitutionFollowUps, useCreateInstitutionFollowUp, useCompleteInstitutionFollowUp, useBdmList, useUpdateInstitution,
} from '@/hooks/useInstitutions'
import { supabase } from '@/lib/supabase'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { InlineEdit } from '@/components/shared/InlineEdit'
import type { Institution } from '@/types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { format } from 'date-fns'
import type { MouStatus } from '@/types'

const mouColors: Record<MouStatus, string> = {
  not_started: 'bg-gray-100 text-gray-800',
  in_discussion: 'bg-yellow-100 text-yellow-800',
  signed: 'bg-green-100 text-green-800',
  expired: 'bg-red-100 text-red-800',
}

export default function InstitutionDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { can } = useAuth()
  const { data: inst, isLoading } = useInstitution(id)
  const { data: meetings = [] } = useInstitutionMeetings(id)
  const { data: followUps = [] } = useInstitutionFollowUps(id)
  const updateInstitution = useUpdateInstitution()
  const createMeeting = useCreateInstitutionMeeting()
  const createFu = useCreateInstitutionFollowUp()
  const completeFu = useCompleteInstitutionFollowUp()
  const { data: bdms = [] } = useBdmList()

  const [meetingOpen, setMeetingOpen] = useState(false)
  const [fuOpen, setFuOpen] = useState(false)
  const [meetingDate, setMeetingDate] = useState('')
  const [meetingNotes, setMeetingNotes] = useState('')
  const [meetingOutcome, setMeetingOutcome] = useState('')
  const [fuDate, setFuDate] = useState('')
  const [fuNotes, setFuNotes] = useState('')

  // Add new employee modal state
  const [addEmpOpen, setAddEmpOpen] = useState(false)
  const [empName, setEmpName] = useState('')
  const [empEmail, setEmpEmail] = useState('')
  const [empPhone, setEmpPhone] = useState('')
  const queryClient = useQueryClient()

  const createBdmUser = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .insert({ name: empName, email: empEmail, phone: empPhone || null, role: 'bdm', is_active: true })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bdm-users'] })
      queryClient.invalidateQueries({ queryKey: ['institutions'] })
      // Auto-assign this new BDM to the institution
      updateInstitution.mutate({ id: inst!.id, assigned_bdm_id: data.id })
      toast.success('New employee added and assigned')
      setAddEmpOpen(false)
      setEmpName('')
      setEmpEmail('')
      setEmpPhone('')
    },
    onError: (err) => toast.error(err.message),
  })

  if (isLoading || !inst) return <p>Loading...</p>

  const handleAddMeeting = async () => {
    if (!meetingDate) return
    await createMeeting.mutateAsync({
      institution_id: inst.id,
      meeting_date: new Date(meetingDate).toISOString(),
      notes: meetingNotes,
      outcome: meetingOutcome,
    })
    setMeetingOpen(false)
    setMeetingNotes('')
    setMeetingOutcome('')
  }

  const handleAddFu = async () => {
    if (!fuDate) return
    await createFu.mutateAsync({
      institution_id: inst.id,
      scheduled_at: new Date(fuDate).toISOString(),
      notes: fuNotes,
      status: 'pending',
      assigned_to: inst.assigned_bdm_id,
    })
    setFuOpen(false)
    setFuNotes('')
  }

  const handleSaveField = async (field: keyof Institution, value: any) => {
    if (!inst) return
    await updateInstitution.mutateAsync({
      id: inst.id,
      [field]: value
    })
  }

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => navigate('/institutions')}>
        <ArrowLeft className="h-4 w-4" /> Back to Institutions
      </Button>

      <PageHeader title={inst.name}>
        <Badge variant="outline" className={mouColors[inst.mou_status]}>{inst.mou_status.replace('_', ' ')}</Badge>
        <Badge variant="outline" className="capitalize">{inst.type}</Badge>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Institution Details</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
            <InlineEdit label="Name" value={inst.name} onSave={can('editInstitutions') ? (v) => handleSaveField('name', v) : undefined} />
            <InlineEdit label="Type" type="select" options={[{value:'school',label:'School'},{value:'college',label:'College'},{value:'coaching',label:'Coaching'},{value:'corporate',label:'Corporate'}]} value={inst.type} onSave={can('editInstitutions') ? (v) => handleSaveField('type', v) : undefined} />
            <InlineEdit label="Address" value={inst.address} onSave={can('editInstitutions') ? (v) => handleSaveField('address', v) : undefined} />
            <InlineEdit label="City" value={inst.city} onSave={can('editInstitutions') ? (v) => handleSaveField('city', v) : undefined} />
            <InlineEdit label="Contact Phone" value={inst.contact_phone} onSave={can('editInstitutions') ? (v) => handleSaveField('contact_phone', v) : undefined} />
            <InlineEdit label="Contact Email" value={inst.contact_email} onSave={can('editInstitutions') ? (v) => handleSaveField('contact_email', v) : undefined} />
            <InlineEdit label="Contact Person" value={inst.contact_person} onSave={can('editInstitutions') ? (v) => handleSaveField('contact_person', v) : undefined} />
            <InlineEdit label="MOU Status" type="select" options={[{value:'not_started',label:'Not Started'},{value:'in_discussion',label:'In Discussion'},{value:'signed',label:'Signed'},{value:'expired',label:'Expired'}]} value={inst.mou_status} onSave={can('editInstitutions') ? (v) => handleSaveField('mou_status', v) : undefined} />
            <InlineEdit label="Assigned BDM" type="select" options={[...bdms.map(b => ({value: b.id, label: b.name})), {value: '__add_new__', label: '+ Add New Employee'}]} value={inst.assigned_bdm_id} onSave={can('editInstitutions') ? (v) => {
              if (v === '__add_new__') {
                setAddEmpOpen(true)
                return
              }
              handleSaveField('assigned_bdm_id', v)
            } : undefined} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button variant="outline" onClick={() => setMeetingOpen(true)}>Record Meeting</Button>
            <Button variant="outline" onClick={() => setFuOpen(true)}>Schedule Follow-up</Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Meetings ({meetings.length})</CardTitle></CardHeader>
          <CardContent>
            {meetings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No meetings recorded.</p>
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Notes</TableHead><TableHead>Outcome</TableHead></TableRow></TableHeader>
                <TableBody>
                  {meetings.slice(0, 10).map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{format(new Date(m.meeting_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-muted-foreground">{m.notes ?? '—'}</TableCell>
                      <TableCell>{m.outcome ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Follow-ups ({followUps.length})</CardTitle></CardHeader>
          <CardContent>
            {followUps.length === 0 ? (
              <p className="text-sm text-muted-foreground">No follow-ups scheduled.</p>
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Notes</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
                <TableBody>
                  {followUps.slice(0, 10).map((f) => (
                    <TableRow key={f.id}>
                      <TableCell>{format(new Date(f.scheduled_at), 'MMM d, h:mm a')}</TableCell>
                      <TableCell className="text-muted-foreground">{f.notes ?? '—'}</TableCell>
                      <TableCell><Badge variant={f.status === 'completed' ? 'success' : 'warning'}>{f.status}</Badge></TableCell>
                      <TableCell>
                        {f.status !== 'completed' && (
                          <Button size="sm" variant="ghost" onClick={() => completeFu.mutate(f.id)}>Done</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Meeting Dialog */}
      <Dialog open={meetingOpen} onOpenChange={setMeetingOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Meeting</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Date</Label><Input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} /></div>
            <div><Label>Notes</Label><Textarea value={meetingNotes} onChange={(e) => setMeetingNotes(e.target.value)} /></div>
            <div><Label>Outcome</Label><Textarea value={meetingOutcome} onChange={(e) => setMeetingOutcome(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMeetingOpen(false)}>Cancel</Button>
            <Button onClick={handleAddMeeting}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Follow-up Dialog */}
      <Dialog open={fuOpen} onOpenChange={setFuOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Schedule Follow-up</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Date & Time</Label><Input type="datetime-local" value={fuDate} onChange={(e) => setFuDate(e.target.value)} /></div>
            <div><Label>Notes</Label><Textarea value={fuNotes} onChange={(e) => setFuNotes(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFuOpen(false)}>Cancel</Button>
            <Button onClick={handleAddFu}>Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add New Employee Dialog */}
      <Dialog open={addEmpOpen} onOpenChange={setAddEmpOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Employee (BDM)</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Full Name</Label>
              <Input value={empName} onChange={(e) => setEmpName(e.target.value)} placeholder="e.g. Rahul Verma" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={empEmail} onChange={(e) => setEmpEmail(e.target.value)} placeholder="rahul@example.com" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={empPhone} onChange={(e) => setEmpPhone(e.target.value)} placeholder="+91 98765 43210" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddEmpOpen(false)}>Cancel</Button>
            <Button onClick={() => createBdmUser.mutate()} disabled={!empName || !empEmail}>
              Add & Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}