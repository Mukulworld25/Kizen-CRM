import { useState } from 'react'
import { format } from 'date-fns'
import { CheckCircle, Clock, Phone, MessageCircle, Mail, Users } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useFollowUps, useCompleteFollowUp } from '@/hooks/useStudents'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/table'


const typeIcons: Record<string, React.ElementType> = {
  call: Phone,
  whatsapp: MessageCircle,
  email: Mail,
  meeting: Users,
  demo: Users,
  task: CheckCircle,
}

export function PreetiTaskList() {
  const { profile } = useAuth()
  const [tab, setTab] = useState('today')
  const { data: followUps = [], isLoading } = useFollowUps(tab, profile?.id)
  const completeFollowUp = useCompleteFollowUp()

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
      </div>
    )
  }

  return (
    <Card className="border border-slate-200">
      <CardHeader className="border-b pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold">Daily Task List</CardTitle>
          <Badge variant="outline" className="text-xs">{followUps.length} items</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-slate-100 p-1 rounded-xl mb-4">
            <TabsTrigger value="today" className="rounded-lg text-xs font-medium">Today</TabsTrigger>
            <TabsTrigger value="upcoming" className="rounded-lg text-xs font-medium">Upcoming</TabsTrigger>
            <TabsTrigger value="overdue" className="rounded-lg text-xs font-medium">Overdue</TabsTrigger>
          </TabsList>

          <TabsContent value={tab}>
            {followUps.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="mx-auto h-8 w-8 text-emerald-400 mb-2" />
                <p className="text-sm text-slate-500">All caught up! No pending tasks.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {followUps.map((fu) => {
                  const Icon = typeIcons[fu.type] ?? Clock
                  return (
                    <div
                      key={fu.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 p-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {fu.lead?.full_name ?? 'Unknown'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {fu.type} · {format(new Date(fu.scheduled_at), 'MMM d, h:mm a')}
                            {fu.lead?.course?.name && ` · ${fu.lead.course.name}`}
                          </p>
                          {fu.notes && (
                            <p className="text-xs text-slate-400 mt-0.5 truncate">{fu.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant={fu.status === 'overdue' ? 'destructive' : 'warning'} className="text-[10px] capitalize">
                          {fu.status}
                        </Badge>
                        {fu.status !== 'completed' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-emerald-600"
                            onClick={() => completeFollowUp.mutate(fu.id)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}