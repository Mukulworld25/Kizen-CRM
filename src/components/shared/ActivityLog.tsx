import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { AuditLog } from '@/types'

const PAGE_SIZE = 20

export default function ActivityLog() {
  const [logs, setLogs] = useState<(AuditLog & { user?: { name: string } })[]>([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      supabase
        .from('audit_logs')
        .select('*, user:users!audit_logs_user_id_fkey(name, email)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
    ]).then(([{ data, count, error }]) => {
      if (!error) {
        setLogs((data ?? []) as (AuditLog & { user?: { name: string } })[])
        setCount(count ?? 0)
      }
      setLoading(false)
    })
  }, [page])

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))

  return (
    <div className="space-y-4">
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Entity ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : logs.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No activity recorded yet.</TableCell></TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs">{format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}</TableCell>
                    <TableCell className="text-sm">{log.user?.name ?? '—'}</TableCell>
                    <TableCell className="text-sm font-medium">{log.action.replace(/_/g, ' ')}</TableCell>
                    <TableCell className="text-sm">{log.entity_type ?? '—'}</TableCell>
                    <TableCell className="text-xs font-mono">{log.entity_id ? log.entity_id.slice(0, 8) + '…' : '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{count} records · Page {page} of {totalPages}</span>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}