import { useState } from 'react'
import { format } from 'date-fns'
import { Phone, CheckCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useFollowUps, useCompleteFollowUp } from '@/hooks/useStudents'
import { useCounselors } from '@/hooks/useLeads'
import { PageHeader } from '@/components/shared/PageHeader'
import { WhatsAppButton } from '@/components/shared/WhatsAppButton'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/table'
import { cn } from '@/lib/utils'

export default function FollowUps() {
  const { can } = useAuth()
  const [tab, setTab] = useState('today')
  const [counselorId, setCounselorId] = useState<string>()
  const { data: followUps = [], isLoading } = useFollowUps(tab, counselorId)
  const completeFollowUp = useCompleteFollowUp()
  const { data: counselors = [] } = useCounselors()

  return (
    <div>
      <PageHeader title="Follow-ups" description="Manage scheduled follow-ups">
        {can('assignCounselor') && (
          <Select value={counselorId ?? 'all'} onValueChange={(v) => setCounselorId(v === 'all' ? undefined : v)}>
            <SelectTrigger className="w-44"><SelectValue placeholder="All Counselors" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Counselors</SelectItem>
              {counselors.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </PageHeader>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {isLoading ? (
            <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
          ) : followUps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              <p className="text-sm font-medium text-slate-700">All caught up!</p>
              <p className="text-xs text-muted-foreground mt-1">No follow-ups in this category.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {followUps.map((fu) => (
                <Card key={fu.id} className={cn(fu.status === 'overdue' ? 'ring-2 ring-danger ring-offset-1' : 'hover:shadow-md transition-all duration-150')}>
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-800">{fu.lead?.full_name}</span>
                        <Badge variant="outline" className="capitalize">{fu.type}</Badge>
                        {fu.status === 'overdue' && <Badge variant="destructive">Overdue</Badge>}
                        {fu.status === 'completed' && <Badge variant="success">Completed</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{fu.lead?.mobile}</p>
                      <p className="text-sm text-muted-foreground/70">
                        {format(new Date(fu.scheduled_at), 'MMM d, yyyy h:mm a')}
                        {fu.notes && ` · ${fu.notes}`}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button variant="outline" size="sm" asChild>
                        <a href={`tel:${fu.lead?.mobile}`}><Phone className="h-4 w-4" /></a>
                      </Button>
                      {fu.lead && (
                        <WhatsAppButton
                          name={fu.lead.full_name}
                          mobile={fu.lead.mobile}
                          course={(fu.lead as { course?: { name: string } }).course?.name}
                          size="sm"
                        />
                      )}
                      {fu.status !== 'completed' && (
                        <Button size="sm" onClick={() => completeFollowUp.mutate(fu.id)}>
                          <CheckCircle className="h-4 w-4" /> Complete
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
