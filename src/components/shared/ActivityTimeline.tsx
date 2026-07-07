import { format } from 'date-fns'
import { Phone, MessageCircle, Mail, Users, FileText, ArrowRightLeft } from 'lucide-react'
import type { LeadActivity, ActivityType } from '@/types'
import { Button } from '@/components/ui/button'
import { Textarea, Label } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useState } from 'react'

const iconMap: Record<ActivityType, React.ElementType> = {
  call: Phone,
  whatsapp: MessageCircle,
  email: Mail,
  meeting: Users,
  note: FileText,
  status_change: ArrowRightLeft,
}

interface ActivityTimelineProps {
  activities: LeadActivity[]
  onAdd?: (activity: { activity_type: ActivityType; description: string }) => void
  loading?: boolean
}

export function ActivityTimeline({ activities, onAdd, loading }: ActivityTimelineProps) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<ActivityType>('note')
  const [description, setDescription] = useState('')

  const handleAdd = () => {
    if (!description.trim() || !onAdd) return
    onAdd({ activity_type: type, description })
    setDescription('')
    setOpen(false)
  }

  return (
    <div className="space-y-4">
      {onAdd && (
        <Button size="sm" onClick={() => setOpen(true)}>Add Activity</Button>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />)}
        </div>
      ) : activities.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activities yet.</p>
      ) : (
        <div className="relative space-y-4 pl-6 before:absolute before:left-[11px] before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-border">
          {activities.map((activity) => {
            const Icon = iconMap[activity.activity_type] ?? FileText
            return (
              <div key={activity.id} className="relative flex gap-3">
                <div className="absolute -left-6 flex h-6 w-6 items-center justify-center rounded-full bg-white border border-border shadow-sm">
                  <Icon className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="flex-1 rounded-xl border border-border p-3 hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium capitalize">{activity.activity_type.replace('_', ' ')}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(activity.created_at), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-700">{activity.description}</p>
                  {activity.creator && (
                    <p className="mt-1 text-xs text-muted-foreground">by {(activity.creator as { name: string }).name}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Activity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as ActivityType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="note">Note</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}