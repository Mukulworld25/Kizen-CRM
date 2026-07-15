import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Phone, Mail, MapPin, Building2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import {
  useInstitution, useInstitutionMeetings, useCreateInstitutionMeeting,
  useInstitutionFollowUps, useCreateInstitutionFollowUp, useCompleteInstitutionFollowUp, useBdmList, useUpdateInstitution,
} from '@/hooks/useInstitutions'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
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
  const [editOpen, setEditOpen] = useState(false)
  const [meetingDate, setMeetingDate] = useState('')
  const [meetingNotes, setMeetingNotes] = useState('')
  const [meetingOutcome, setMeetingOutcome] = useState('')
  const [fuDate, setFuDate] = useState('')
  const [fuNotes, setFuNotes] = useState('')
  const [editMou, setEditMou] = useState<MouStatus | ''>('')
  const [editBdm, setEditBdm] = useState('')

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

  const handleSaveEdit = async () => {
    await updateInstitution.mutateAsync({
      id: inst.id,
      mou_status: editMou as MouStatus || inst.mou_status,
      assigned_bdm_id: editBdm || inst.assigned_bdm_id,
    })
    setEditOpen(false)
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
        <Card>
          <CardHeader><CardTitle className="text-base">Contact Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />{inst.address ?? '—'}, {inst.city ?? ''}</div>
            <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{inst.contact_phone ?? '—'}</div>
            <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />{inst.contact_email ?? '—'}</div>
            <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" />Contact: {inst.contact_person ?? '—'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">MOU & Assignment</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p><span className="text-muted-foreground">Status:</span> <Badge variant="outline" className={mouColors[inst.mou_status]}>{inst.mou_status.replace('_', ' ')}</Badge></p>
            <p><span className="text-muted-foreground">BDM:</span> {inst.bdm?.name ?? 'Unassigned'}</p>
            {can('editInstitutions') && (
              <Button size="sm" variant="outline" onClick={() => { setEditMou(inst.mou_status); setEditBdm(inst.assigned_bdm_id ?? ''); setEditOpen(true) }}>
                Edit Details
              </Button>
            )}
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

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Institution</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>MOU Status</Label>
              <Select value={editMou} onValueChange={(v) => setEditMou(v as MouStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_discussion">In Discussion</SelectItem>
                  <SelectItem value="signed">Signed</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assigned BDM</Label>
              <Select value={editBdm} onValueChange={(v) => setEditBdm(v)}>
                <SelectTrigger><SelectValue placeholder="Select BDM" /></SelectTrigger>
                <SelectContent>
                  {bdms.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}