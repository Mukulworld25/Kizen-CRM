import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Activity, MessageSquare, PhoneCall, CheckCircle } from 'lucide-react'

const PAGE_SIZE = 20

interface ActivityRecord {
  id: string
  created_at: string
  activity_type: string
  title?: string | null
  description?: string | null
  created_by?: string | null
  lead_id?: string | null
  user?: { name: string; email?: string } | null
  lead?: { full_name: string } | null
}

export default function ActivityLog() {
  const [logs, setLogs] = useState<ActivityRecord[]>([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    supabase
      .from('lead_activities')
      .select('*, lead:leads(full_name), user:users!created_by(name, email)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
      .then(({ data, count, error }) => {
        if (!error && data) {
          setLogs(data as ActivityRecord[])
          setCount(count ?? 0)
        } else {
          // Fallback query without explicit foreign key constraint name if alias fails
          supabase
            .from('lead_activities')
            .select('*, lead:leads(full_name)', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
            .then(({ data: fallbackData, count: fallbackCount }) => {
              setLogs((fallbackData ?? []) as ActivityRecord[])
              setCount(fallbackCount ?? 0)
            })
        }
        setLoading(false)
      })
  }, [page])

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))

  const getActivityBadge = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'call':
        return <Badge variant="outline" className="bg-sky-50 text-sky-800 border-sky-200 font-semibold"><PhoneCall className="w-3 h-3 mr-1 text-sky-600" /> Call</Badge>
      case 'status_change':
        return <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 font-semibold"><Activity className="w-3 h-3 mr-1 text-amber-600" /> Status Change</Badge>
      case 'conversion':
        return <Badge variant="success" className="font-semibold"><CheckCircle className="w-3 h-3 mr-1" /> Converted</Badge>
      default:
        return <Badge variant="secondary" className="font-semibold"><MessageSquare className="w-3 h-3 mr-1 text-slate-500" /> Note / Activity</Badge>
    }
  }

  return (
    <div className="space-y-4">
      <Card className="shadow-sm border border-slate-200">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-bold text-slate-900">Timestamp</TableHead>
                <TableHead className="font-bold text-slate-900">Performed By</TableHead>
                <TableHead className="font-bold text-slate-900">Activity Type</TableHead>
                <TableHead className="font-bold text-slate-900">Target Lead / Entity</TableHead>
                <TableHead className="font-bold text-slate-900">Description / Log Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-12 text-slate-500 font-medium">Loading system activity logs...</TableCell></TableRow>
              ) : logs.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-12 text-slate-500 italic">No activity recorded yet.</TableCell></TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-slate-50/80">
                    <TableCell className="text-xs font-medium text-slate-600">
                      {log.created_at ? format(new Date(log.created_at), 'MMM d, yyyy h:mm a') : '—'}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-slate-900">
                      {log.user?.name ?? 'System Staff'}
                    </TableCell>
                    <TableCell>
                      {getActivityBadge(log.activity_type || 'note')}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-slate-800">
                      {log.lead?.full_name ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-700 font-medium max-w-md truncate">
                      {log.description || log.title || 'Lead activity recorded'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-xs font-medium text-slate-600">
        <span>Showing <strong>{logs.length}</strong> of <strong>{count}</strong> total recorded activities · Page {page} of {totalPages}</span>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}