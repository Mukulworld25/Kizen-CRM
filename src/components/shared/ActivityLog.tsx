import { useState, useEffect, useCallback, useMemo } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  ChevronLeft,
  ChevronRight,
  Activity,
  User as UserIcon,
  Shield,
  Key,
  CreditCard,
  Receipt,
  Calendar,
  CheckSquare,
  GraduationCap,
  FileText,
  Search,
  RefreshCw,
  Eye,
  Clock,
  Sparkles,
  PhoneCall,
  MessageSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { User as UserType } from '@/types'

const PAGE_SIZE = 25

export interface AuditRecord {
  id: string
  created_at: string
  action: string
  entity_type: string
  entity_id?: string | null
  old_data?: Record<string, any> | null
  new_data?: Record<string, any> | null
  user_id?: string | null
  user?: {
    id?: string
    name?: string
    email?: string
    role?: string
  } | null
}

export interface LeadActivityRecord {
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
  const [sourceMode, setSourceMode] = useState<'audit' | 'lead_activities'>('audit')
  const [logs, setLogs] = useState<AuditRecord[]>([])
  const [leadLogs, setLeadLogs] = useState<LeadActivityRecord[]>([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Filters
  const [userFilter, setUserFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Raw Inspector Dialog
  const [inspectRecord, setInspectRecord] = useState<AuditRecord | null>(null)

  // Fetch Users for filtering
  const [staffUsers, setStaffUsers] = useState<UserType[]>([])

  useEffect(() => {
    supabase
      .from('users')
      .select('id, name, email, role')
      .order('name')
      .then(({ data }) => {
        if (data) setStaffUsers(data as UserType[])
      })
  }, [])

  // Fetch Logs function
  const fetchLogs = useCallback(async () => {
    setLoading(true)

    if (sourceMode === 'audit') {
      let query = supabase
        .from('audit_logs')
        .select('*, user:users!audit_logs_user_id_fkey(id, name, email, role)', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (userFilter !== 'all') {
        query = query.eq('user_id', userFilter)
      }

      if (categoryFilter !== 'all') {
        if (categoryFilter === 'auth') {
          query = query.or('action.eq.user_login,entity_type.eq.auth')
        } else if (categoryFilter === 'fee') {
          query = query.or('action.ilike.%payment%,entity_type.eq.fee')
        } else if (categoryFilter === 'expense') {
          query = query.or('action.ilike.%expense%,entity_type.eq.expense')
        } else if (categoryFilter === 'schedule') {
          query = query.or('action.ilike.%meeting%,action.ilike.%schedule%,entity_type.eq.meeting')
        } else if (categoryFilter === 'task') {
          query = query.or('action.ilike.%task%,entity_type.eq.task')
        } else if (categoryFilter === 'student') {
          query = query.or('action.ilike.%student%,entity_type.eq.student')
        } else if (categoryFilter === 'lead') {
          query = query.or('action.ilike.%lead%,entity_type.eq.lead')
        }
      }

      const from = (page - 1) * PAGE_SIZE
      const to = page * PAGE_SIZE - 1
      query = query.range(from, to)

      const { data, count: totalCount, error } = await query

      if (!error && data) {
        setLogs(data as AuditRecord[])
        setCount(totalCount ?? 0)
      } else {
        // Fallback query without alias if needed
        const { data: fallbackData, count: fbCount } = await supabase
          .from('audit_logs')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(from, to)

        setLogs((fallbackData ?? []) as AuditRecord[])
        setCount(fbCount ?? 0)
      }
    } else {
      // Lead Activities mode
      let query = supabase
        .from('lead_activities')
        .select('*, lead:leads(full_name), user:users!created_by(name, email)', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (userFilter !== 'all') {
        query = query.eq('created_by', userFilter)
      }

      const from = (page - 1) * PAGE_SIZE
      const to = page * PAGE_SIZE - 1
      query = query.range(from, to)

      const { data, count: totalCount } = await query
      setLeadLogs((data ?? []) as LeadActivityRecord[])
      setCount(totalCount ?? 0)
    }

    setLoading(false)
    setRefreshing(false)
  }, [sourceMode, page, userFilter, categoryFilter])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchLogs()
  }

  // Filter in-memory for search query
  const displayedLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs
    const q = searchQuery.toLowerCase().trim()
    return logs.filter((l) => {
      const uName = (l.user?.name || '').toLowerCase()
      const uEmail = (l.user?.email || '').toLowerCase()
      const action = (l.action || '').toLowerCase()
      const entity = (l.entity_type || '').toLowerCase()
      const details = JSON.stringify(l.new_data || {}).toLowerCase()
      return uName.includes(q) || uEmail.includes(q) || action.includes(q) || entity.includes(q) || details.includes(q)
    })
  }, [logs, searchQuery])

  const displayedLeadLogs = useMemo(() => {
    if (!searchQuery.trim()) return leadLogs
    const q = searchQuery.toLowerCase().trim()
    return leadLogs.filter((l) => {
      const uName = (l.user?.name || '').toLowerCase()
      const leadName = (l.lead?.full_name || '').toLowerCase()
      const desc = (l.description || l.title || '').toLowerCase()
      return uName.includes(q) || leadName.includes(q) || desc.includes(q)
    })
  }, [leadLogs, searchQuery])

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))

  // Helper to format action badges
  const getActionBadge = (action: string, entityType: string) => {
    const act = (action || '').toLowerCase()
    const ent = (entityType || '').toLowerCase()

    if (act.includes('login') || ent === 'auth') {
      return (
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold gap-1 text-[11px]">
          <Key className="w-3 h-3 text-emerald-600" /> User Login
        </Badge>
      )
    }
    if (act.includes('payment') || ent === 'fee') {
      return (
        <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-semibold gap-1 text-[11px]">
          <CreditCard className="w-3 h-3 text-amber-700" /> Fee Payment
        </Badge>
      )
    }
    if (act.includes('expense') || ent === 'expense') {
      return (
        <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-semibold gap-1 text-[11px]">
          <Receipt className="w-3 h-3 text-rose-600" /> Expense
        </Badge>
      )
    }
    if (act.includes('meeting') || ent === 'meeting') {
      return (
        <Badge className="bg-orange-100 text-orange-800 border-orange-300 font-semibold gap-1 text-[11px]">
          <Calendar className="w-3 h-3 text-orange-600" /> Meeting
        </Badge>
      )
    }
    if (act.includes('task') || ent === 'task') {
      return (
        <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300 font-semibold gap-1 text-[11px]">
          <CheckSquare className="w-3 h-3 text-indigo-600" /> Team Task
        </Badge>
      )
    }
    if (act.includes('student') || ent === 'student') {
      return (
        <Badge className="bg-sky-100 text-sky-800 border-sky-300 font-semibold gap-1 text-[11px]">
          <GraduationCap className="w-3 h-3 text-sky-600" /> Student
        </Badge>
      )
    }
    if (act.includes('lead') || ent === 'lead') {
      return (
        <Badge className="bg-purple-100 text-purple-800 border-purple-300 font-semibold gap-1 text-[11px]">
          <FileText className="w-3 h-3 text-purple-600" /> Lead
        </Badge>
      )
    }

    return (
      <Badge variant="outline" className="text-[11px] font-semibold capitalize gap-1">
        <Activity className="w-3 h-3 text-slate-500" /> {act.replace(/_/g, ' ')}
      </Badge>
    )
  }

  // Helper to extract human-readable entity name
  const getEntityName = (log: AuditRecord) => {
    if (log.new_data?.entity_name) return log.new_data.entity_name
    if (log.new_data?.student_name) return log.new_data.student_name
    if (log.new_data?.title) return log.new_data.title
    if (log.new_data?.email) return log.new_data.email
    if (log.action === 'user_login') return log.user?.name || log.new_data?.email || 'Console Session'
    return log.entity_type ? `${log.entity_type.charAt(0).toUpperCase() + log.entity_type.slice(1)}` : 'System'
  }

  // Helper to extract human-readable log details
  const getLogDetails = (log: AuditRecord) => {
    if (log.new_data?.details) return log.new_data.details
    if (log.action === 'user_login') {
      return `Successful login to Kizen CRM (${log.new_data?.role || log.user?.role || 'Staff'})`
    }
    if (log.action === 'payment_record') {
      const amt = log.new_data?.amount ? `₹${log.new_data.amount}` : ''
      const method = log.new_data?.payment_method ? `via ${log.new_data.payment_method}` : ''
      return `Recorded payment ${amt} ${method}`.trim()
    }
    if (log.action === 'expense_create') {
      const amt = log.new_data?.amount ? `₹${log.new_data.amount}` : ''
      return `Recorded expense ${amt}`.trim()
    }
    if (log.action === 'create_lead') return 'New prospective lead created'
    if (log.action === 'update_lead') return 'Updated lead details'
    if (log.action === 'user_update') return 'Updated user profile configuration'

    return log.action.replace(/_/g, ' ')
  }

  return (
    <div className="space-y-4">
      {/* Top Banner & Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Shield className="h-4 w-4 text-amber-500" /> System Audit Trail & Footprint Logs
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Full compliance audit logs tracking logins, fee payments, expenses, meetings, and data operations
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setSourceMode('audit')
                setPage(1)
              }}
              className={cn(
                'px-3 py-1.5 rounded-md transition-all',
                sourceMode === 'audit' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              🔒 System Audit Trail
            </button>
            <button
              type="button"
              onClick={() => {
                setSourceMode('lead_activities')
                setPage(1)
              }}
              className={cn(
                'px-3 py-1.5 rounded-md transition-all',
                sourceMode === 'lead_activities' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              📞 Lead Telecalling Notes
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="h-8 gap-1.5 text-xs">
            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} /> Refresh
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="border border-slate-200 shadow-xs bg-white">
        <CardContent className="p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            {/* Search Input */}
            <div className="relative min-w-[220px] flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search by user, action, entity, details..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-slate-50 border-slate-200"
              />
            </div>

            {/* User Filter Dropdown */}
            <Select value={userFilter} onValueChange={(v) => { setUserFilter(v); setPage(1) }}>
              <SelectTrigger className="w-52 h-8 text-xs bg-slate-50">
                <SelectValue placeholder="All Staff Members" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">👥 All Staff Members</SelectItem>
                {staffUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    👤 {u.name} ({u.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Category Filter (Audit Mode) */}
            {sourceMode === 'audit' && (
              <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1) }}>
                <SelectTrigger className="w-44 h-8 text-xs bg-slate-50">
                  <SelectValue placeholder="All Action Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">⚡ All Categories</SelectItem>
                  <SelectItem value="auth">🔑 User Logins & Auth</SelectItem>
                  <SelectItem value="fee">💳 Fee Payments</SelectItem>
                  <SelectItem value="expense">💰 Expenses</SelectItem>
                  <SelectItem value="schedule">🤝 Meetings & Calendar</SelectItem>
                  <SelectItem value="task">📝 Team Tasks</SelectItem>
                  <SelectItem value="student">🎓 Students</SelectItem>
                  <SelectItem value="lead">📋 Leads</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="text-xs text-muted-foreground whitespace-nowrap">
            Total records: <strong className="text-slate-900">{count}</strong>
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card className="shadow-xs border border-slate-200 bg-white overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50 border-b">
              <TableRow>
                <TableHead className="font-bold text-slate-900 w-44">Timestamp</TableHead>
                <TableHead className="font-bold text-slate-900 w-48">Performed By</TableHead>
                <TableHead className="font-bold text-slate-900 w-40">Activity Type</TableHead>
                <TableHead className="font-bold text-slate-900 w-52">Target Lead / Entity</TableHead>
                <TableHead className="font-bold text-slate-900">Description / Log Details</TableHead>
                {sourceMode === 'audit' && <TableHead className="w-16 text-right font-bold text-slate-900">Data</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16 text-slate-500 font-medium">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-amber-500" />
                      Loading system activity logs...
                    </div>
                  </TableCell>
                </TableRow>
              ) : sourceMode === 'audit' ? (
                displayedLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-16 text-slate-500 italic">
                      No system activity logs found matching the filter criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedLogs.map((log) => {
                    const dateObj = new Date(log.created_at)
                    const formattedDate = format(dateObj, 'MMM d, yyyy h:mm a')
                    const timeAgo = formatDistanceToNow(dateObj, { addSuffix: true })
                    const userName = log.user?.name || log.new_data?.email || 'System Staff'
                    const userRole = log.user?.role || log.new_data?.role || 'staff'

                    return (
                      <TableRow key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Timestamp */}
                        <TableCell className="text-xs text-slate-700 py-3">
                          <div className="font-semibold text-slate-900">{formattedDate}</div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="w-2.5 h-2.5" /> {timeAgo}
                          </div>
                        </TableCell>

                        {/* Performed By */}
                        <TableCell className="text-xs py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-700 font-bold flex items-center justify-center text-[10px] shrink-0 border border-amber-500/20">
                              {userName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 block truncate">{userName}</span>
                              <span className="font-mono text-[10px] uppercase font-semibold text-slate-500 bg-slate-100 px-1 py-0.2 rounded">
                                {userRole}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        {/* Activity Type Badge */}
                        <TableCell className="py-3">
                          {getActionBadge(log.action, log.entity_type)}
                        </TableCell>

                        {/* Target Lead / Entity */}
                        <TableCell className="text-xs font-semibold text-slate-800 py-3">
                          <span className="truncate block max-w-[200px]" title={getEntityName(log)}>
                            {getEntityName(log)}
                          </span>
                        </TableCell>

                        {/* Description / Log Details */}
                        <TableCell className="text-xs text-slate-700 py-3">
                          <div className="font-medium max-w-lg leading-relaxed">
                            {getLogDetails(log)}
                          </div>
                        </TableCell>

                        {/* Inspect Raw Data Button */}
                        <TableCell className="text-right py-3">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-slate-800"
                            onClick={() => setInspectRecord(log)}
                            title="Inspect raw audit payload"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )
              ) : (
                /* Lead Activities Mode */
                displayedLeadLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-16 text-slate-500 italic">
                      No lead telecalling remarks found.
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedLeadLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <TableCell className="text-xs font-medium text-slate-600 py-3">
                        {log.created_at ? format(new Date(log.created_at), 'MMM d, yyyy h:mm a') : '—'}
                      </TableCell>
                      <TableCell className="text-xs font-bold text-slate-900 py-3">
                        {log.user?.name ?? 'Counselor'}
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge variant="secondary" className="font-semibold text-[11px] gap-1">
                          <MessageSquare className="w-3 h-3 text-slate-500" /> Note / Remark
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-slate-800 py-3">
                        {log.lead?.full_name ?? '—'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-700 font-medium py-3 max-w-md truncate">
                        {log.description || log.title || 'Lead remark recorded'}
                      </TableCell>
                    </TableRow>
                  ))
                )
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between text-xs font-medium text-slate-600 pt-1">
        <span>
          Showing <strong>{sourceMode === 'audit' ? displayedLogs.length : displayedLeadLogs.length}</strong> of{' '}
          <strong>{count}</strong> total records · Page {page} of {totalPages}
        </span>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* RAW PAYLOAD INSPECTOR MODAL */}
      <Dialog open={!!inspectRecord} onOpenChange={() => setInspectRecord(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-bold">
              <Shield className="h-4 w-4 text-amber-500" /> Audit Trail Record #{inspectRecord?.id?.slice(0, 8)}
            </DialogTitle>
          </DialogHeader>

          {inspectRecord && (
            <div className="space-y-3 py-2 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Action</span>
                  <span className="font-bold text-slate-900">{inspectRecord.action}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Entity Type</span>
                  <span className="font-bold text-slate-900">{inspectRecord.entity_type}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Performed By</span>
                  <span className="font-bold text-slate-900">{inspectRecord.user?.name || inspectRecord.user_id || 'System'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Timestamp</span>
                  <span className="font-bold text-slate-900">{format(new Date(inspectRecord.created_at), 'yyyy-MM-dd HH:mm:ss')}</span>
                </div>
              </div>

              {inspectRecord.new_data && (
                <div>
                  <span className="font-semibold text-slate-700 block mb-1">Payload / New Data</span>
                  <pre className="bg-slate-900 text-slate-100 p-3 rounded-xl overflow-x-auto text-[11px] font-mono leading-relaxed">
                    {JSON.stringify(inspectRecord.new_data, null, 2)}
                  </pre>
                </div>
              )}

              {inspectRecord.old_data && (
                <div>
                  <span className="font-semibold text-slate-700 block mb-1">Previous / Old Data</span>
                  <pre className="bg-slate-900 text-slate-100 p-3 rounded-xl overflow-x-auto text-[11px] font-mono leading-relaxed">
                    {JSON.stringify(inspectRecord.old_data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}