import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { History, RefreshCw } from 'lucide-react'

export interface AuditRecord {
  id: string
  timestamp: string
  section: string
  filename_source: string
  row_count_attempted: number
  row_count_imported: number
  row_count_rejected_skipped: number
  template_matched: boolean
  status: 'success' | 'rejected'
  error_reason: string | null
  import_type?: 'live' | 'historical_backfill'
}

export function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditRecord[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLogs = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('import_audit_log')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(30)
    setLogs(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          Intake Audit & Import Log
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={fetchLogs}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Timestamp</TableHead>
              <TableHead className="text-xs">Type</TableHead>
              <TableHead className="text-xs">Section</TableHead>
              <TableHead className="text-xs">Source / File</TableHead>
              <TableHead className="text-xs text-center">Attempted</TableHead>
              <TableHead className="text-xs text-center">Imported</TableHead>
              <TableHead className="text-xs text-center">Skipped/Rejected</TableHead>
              <TableHead className="text-xs text-center">Status</TableHead>
              <TableHead className="text-xs">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-xs text-muted-foreground">
                  No import history logged yet.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id} className="text-xs">
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {new Date(log.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={log.import_type === 'historical_backfill' ? 'secondary' : 'outline'} className="text-[10px] capitalize">
                      {log.import_type ? log.import_type.replace('_', ' ') : 'live'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold">{log.section}</TableCell>
                  <TableCell className="max-w-[150px] truncate">{log.filename_source}</TableCell>
                  <TableCell className="text-center font-mono">{log.row_count_attempted}</TableCell>
                  <TableCell className="text-center font-mono text-emerald-600 font-semibold">{log.row_count_imported}</TableCell>
                  <TableCell className="text-center font-mono text-amber-600">{log.row_count_rejected_skipped}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={log.status === 'success' ? 'default' : 'destructive'} className="text-[10px]">
                      {log.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] text-muted-foreground truncate">
                    {log.error_reason || (log.status === 'success' ? 'Batch imported' : '—')}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
