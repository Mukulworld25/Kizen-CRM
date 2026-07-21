import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Phone, UserPlus, Trash2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useLead, useUpdateLead, useLeadActivities, useAddActivity } from '@/hooks/useLeads'
import { useCreateFollowUp } from '@/hooks/useStudents'
import { useSoftDelete } from '@/hooks/useSoftDelete'
import { PageHeader } from '@/components/shared/PageHeader'
import { SoftDeleteDialog } from '@/components/shared/SoftDeleteDialog'
import { LeadStatusBadge, PriorityBadge, TemperatureBadge } from '@/components/shared/LeadStatusBadge'
import { LeadStatusPipeline } from '@/components/shared/LeadStatusPipeline'
import { ActivityTimeline } from '@/components/shared/ActivityTimeline'
import { WhatsAppButton } from '@/components/shared/WhatsAppButton'
import { ConvertToStudentModal } from '@/pages/leads/ConvertToStudentModal'
import { LeadDetailView } from '@/components/leads/LeadDetailView'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { LeadStatus, FollowUpType } from '@/types'
import { Skeleton } from '@/components/ui/table'
import { FieldRow } from '@/components/shared/FieldValue'

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { can } = useAuth()
  const { data: lead, isLoading } = useLead(id)
  const { data: activities = [], isLoading: activitiesLoading } = useLeadActivities(id)
  const updateLead = useUpdateLead()
  const addActivity = useAddActivity()
  const createFollowUp = useCreateFollowUp()

  const [followUpOpen, setFollowUpOpen] = useState(false)
  const [convertOpen, setConvertOpen] = useState(false)
  const softDelete = useSoftDelete()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [fuType, setFuType] = useState<FollowUpType>('call')
  const [fuDate, setFuDate] = useState('')
  const [fuNotes, setFuNotes] = useState('')

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!lead) return <p>Lead not found</p>

  const handleStatusChange = (status: LeadStatus) => {
    updateLead.mutate({ id: lead.id, status })
    if (status === 'converted') setConvertOpen(true)
  }

  const handleScheduleFollowUp = async () => {
    if (!fuDate) return
    await createFollowUp.mutateAsync({
      lead_id: lead.id,
      scheduled_at: new Date(fuDate).toISOString(),
      type: fuType,
      notes: fuNotes,
      assigned_to: lead.assigned_counselor_id,
    })
    setFollowUpOpen(false)
    setFuNotes('')
  }

  return (
    <div>
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/leads')}>
          <ArrowLeft className="h-4 w-4" /> Back to Leads
        </Button>
      </div>

      <PageHeader title={lead.full_name}>
        <LeadStatusBadge status={lead.status} />
        <PriorityBadge priority={lead.priority} />
        <TemperatureBadge temperature={lead.temperature} />
      </PageHeader>

      <Tabs defaultValue="overview" className="mt-4">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview & Activity</TabsTrigger>
          <TabsTrigger value="360_view">360° Relational View</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3 space-y-6">
              <Card>
                <CardHeader><CardTitle className="text-base">Lead Information</CardTitle></CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
                  <FieldRow label="Mobile" value={lead.mobile} />
                  <FieldRow label="Email" value={lead.email} />
                  <FieldRow label="City" value={lead.city} />
                  <FieldRow label="Course" value={lead.course?.name} />
                  <FieldRow label="Source" value={lead.source?.replace('_', ' ')} />
                  <FieldRow label="Temperature" value={lead.temperature} />
                  <FieldRow label="Budget" value={lead.budget ? `₹${lead.budget.toLocaleString()}` : null} mono />
                  <FieldRow label="Expected Joining" value={lead.expected_joining_date ? new Date(lead.expected_joining_date).toLocaleDateString() : null} />
                  <FieldRow label="Counselor" value={lead.counselor?.name} />
                  <FieldRow label="Parent" value={lead.parent_name} />
                  <FieldRow label="School/College" value={lead.school_college} />
                  {lead.notes && <div className="sm:col-span-2"><FieldRow label="Notes" value={lead.notes} /></div>}
                  {!lead.notes && <div className="sm:col-span-2"><FieldRow label="Notes" value={null} /></div>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Status Pipeline</CardTitle></CardHeader>
                <CardContent>
                  <LeadStatusPipeline
                    currentStatus={lead.status}
                    onStatusChange={can('editLeads') ? handleStatusChange : undefined}
                    readonly={!can('editLeads')}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Activity Timeline</CardTitle></CardHeader>
                <CardContent>
                  <ActivityTimeline
                    activities={activities}
                    loading={activitiesLoading}
                    onAdd={can('editLeads') ? (a) => addActivity.mutate({ lead_id: lead.id, ...a }) : undefined}
                  />
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {can('deleteLeads') && (
                    <Button variant="outline" className="text-danger border-danger/30 hover:bg-red-50" onClick={() => setDeleteOpen(true)}>
                      <Trash2 className="h-4 w-4" /> Delete Lead
                    </Button>
                  )}
                  {can('editLeads') && (
                    <>
                      <Button variant="outline" onClick={() => setFollowUpOpen(true)}>Schedule Follow-up</Button>
                      <Button variant="outline" asChild>
                        <a href={`tel:${lead.mobile}`}><Phone className="h-4 w-4" /> Call</a>
                      </Button>
                      <WhatsAppButton name={lead.full_name} mobile={lead.mobile} course={lead.course?.name} />
                      {lead.status === 'converted' && (
                        <Button onClick={() => setConvertOpen(true)}><UserPlus className="h-4 w-4" /> Convert to Student</Button>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Assigned Counselor</CardTitle></CardHeader>
                <CardContent>
                  <p className="font-medium">{lead.counselor?.name ?? 'Unassigned'}</p>
                  <p className="text-sm text-muted-foreground">{lead.counselor?.email}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="360_view">
          <LeadDetailView leadId={lead.id} />
        </TabsContent>
      </Tabs>

      <Dialog open={followUpOpen} onOpenChange={setFollowUpOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Schedule Follow-up</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type</Label>
              <Select value={fuType} onValueChange={(v) => setFuType(v as FollowUpType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['call','whatsapp','email','meeting','demo'].map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date & Time</Label>
              <Input type="datetime-local" value={fuDate} onChange={(e) => setFuDate(e.target.value)} />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={fuNotes} onChange={(e) => setFuNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFollowUpOpen(false)}>Cancel</Button>
            <Button onClick={handleScheduleFollowUp}>Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConvertToStudentModal open={convertOpen} onOpenChange={setConvertOpen} lead={lead} />

      <SoftDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Lead?"
        entityType="lead"
        entityName={lead.full_name}
        onConfirm={() => softDelete.mutate({ table: 'leads', id: lead.id }, { onSuccess: () => { setDeleteOpen(false); navigate('/leads') } })}
        loading={softDelete.isPending}
      />
    </div>
  )
}
