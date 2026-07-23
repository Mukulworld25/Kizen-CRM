import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Eye, Pencil, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import { useLeads, useCounselors, useCourses } from '@/hooks/useLeads'
import { useSoftDelete } from '@/hooks/useSoftDelete'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column, type BulkAction } from '@/components/shared/DataTable'
import { LeadStatusBadge, PriorityBadge, TemperatureBadge } from '@/components/shared/LeadStatusBadge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SoftDeleteDialog } from '@/components/shared/SoftDeleteDialog'
import AddLeadModal from '@/pages/leads/AddLeadModal'
import type { Lead, LeadFilters, LeadStatus, LeadSource, Priority, LeadTemperature } from '@/types'
import { LEAD_SOURCES, LEAD_STATUSES, LEAD_STATUS_LABELS } from '@/types'
import { supabase } from '@/lib/supabase'

export default function LeadList() {
  const navigate = useNavigate()
  const { can, isOwner } = useAuth()
  const [filters, setFilters] = useState<LeadFilters>({ page: 1 })
  const [addOpen, setAddOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data, isLoading } = useLeads(filters)
  const softDelete = useSoftDelete()
  const { data: counselors = [] } = useCounselors()
  const { data: courses = [] } = useCourses()

  const handleBulkDelete = useCallback(async (selected: Lead[]) => {
    const confirmed = window.confirm(`Delete ${selected.length} leads?`)
    if (!confirmed) return
    for (const lead of selected) {
      await softDelete.mutateAsync({ table: 'leads', id: lead.id })
    }
    toast.success(`${selected.length} leads moved to trash`)
  }, [softDelete])

  const columns: Column<Lead>[] = [
    { key: 'full_name', header: 'Name', sortable: true, exportValue: (r) => r.full_name },
    { 
      key: 'mobile', 
      header: 'Mobile', 
      render: (r) => (r.mobile && r.mobile !== '9999999999') ? r.mobile : <span className="text-slate-400 italic text-xs font-normal">— No Phone —</span>, 
      exportValue: (r) => (r.mobile && r.mobile !== '9999999999') ? r.mobile : '' 
    },
    { key: 'course', header: 'Course', render: (r) => r.course?.name ?? '—', exportValue: (r) => r.course?.name ?? '' },
    { key: 'source', header: 'Source', render: (r) => r.source?.replace('_', ' ') ?? '—', exportValue: (r) => r.source ?? '' },
    { key: 'status', header: 'Status', render: (r) => <LeadStatusBadge status={r.status} /> },
    { key: 'temperature', header: 'Temp', render: (r) => <TemperatureBadge temperature={r.temperature} /> },
    { key: 'budget', header: 'Budget', render: (r) => r.budget ? `₹${r.budget.toLocaleString()}` : '—' },
    { key: 'lead_score', header: 'Score', sortable: true, render: (r) => r.lead_score != null ? (
      <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${r.lead_score >= 60 ? 'bg-red-100 text-red-800' : r.lead_score >= 30 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>
        {r.lead_score}
      </span>
    ) : '—' },
    { key: 'priority', header: 'Priority', render: (r) => <PriorityBadge priority={r.priority} /> },
    { key: 'counselor', header: 'Counselor', render: (r) => r.counselor?.name ?? '—', exportValue: (r) => r.counselor?.name ?? '' },
    { key: 'expected_joining_date', header: 'Exp. Joining', render: (r) => r.expected_joining_date ? new Date(r.expected_joining_date).toLocaleDateString() : '—' },
    { key: 'created_at', header: 'Created', render: (r) => format(new Date(r.created_at), 'MMM d, yyyy'), sortable: true },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" onClick={() => navigate(`/leads/${r.id}`)}><Eye className="h-4 w-4" /></Button>
          {can('editLeads') && <Button variant="ghost" size="icon" onClick={() => navigate(`/leads/${r.id}`)}><Pencil className="h-4 w-4" /></Button>}
          {can('deleteLeads') && <Button variant="ghost" size="icon" onClick={() => setDeleteId(r.id)}><Trash2 className="h-4 w-4 text-danger" /></Button>}
        </div>
      ),
    },
  ]

  const bulkActions: BulkAction<Lead>[] = [
    {
      label: 'Delete',
      variant: 'destructive',
      onClick: handleBulkDelete,
    },
  ]

  const handleExport = async () => {
    const { data: all } = await supabase.from('leads').select('*, course:courses(name), counselor:users!leads_assigned_counselor_id_fkey(name)')
    return (all ?? []) as Lead[]
  }

  return (
    <div>
      <PageHeader title="Leads" description="Manage your lead pipeline">
        {can('addLeads') && (
          <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add Lead</Button>
        )}
      </PageHeader>

      <div className="mb-4 flex flex-wrap gap-2 rounded-xl border border-border p-3 shadow-sm" style={{ background: 'var(--card)' }}>
        <Select value={filters.status ?? 'all'} onValueChange={(v) => setFilters((f) => ({ ...f, status: v === 'all' ? undefined : v as LeadStatus }))}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {LEAD_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{LEAD_STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.source ?? 'all'} onValueChange={(v) => setFilters((f) => ({ ...f, source: v === 'all' ? undefined : v as LeadSource }))}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Source" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {LEAD_SOURCES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.temperature ?? 'all'} onValueChange={(v) => setFilters((f) => ({ ...f, temperature: v === 'all' ? undefined : v as LeadTemperature }))}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Temperature" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Temperatures</SelectItem>
            <SelectItem value="hot">Hot</SelectItem>
            <SelectItem value="warm">Warm</SelectItem>
            <SelectItem value="cold">Cold</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" className="text-xs" onClick={() => {
          supabase.rpc('compute_lead_scores').then(() => window.location.reload())
        }}>
          Refresh Scores
        </Button>
        {can('assignCounselor') && (
          <Select value={filters.counselorId ?? 'all'} onValueChange={(v) => setFilters((f) => ({ ...f, counselorId: v === 'all' ? undefined : v }))}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Counselor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Counselors</SelectItem>
              {counselors.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={filters.courseId ?? 'all'} onValueChange={(v) => setFilters((f) => ({ ...f, courseId: v === 'all' ? undefined : v }))}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Course" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courses</SelectItem>
            {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.priority ?? 'all'} onValueChange={(v) => setFilters((f) => ({ ...f, priority: v === 'all' ? undefined : v as Priority }))}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={data?.leads ?? []}
        loading={isLoading}
        searchable
        selectable
        bulkActions={bulkActions}
        tableKey="leads"
        showExport={isOwner}
        onExport={handleExport}
        exportFilename="kizen-leads"
        rowKey={(r) => r.id}
        onRowClick={(r) => navigate(`/leads/${r.id}`)}
        emptyTitle="No leads yet"
        emptyDescription="Add your first lead to start building your pipeline."
        emptyAction={can('addLeads') ? <Button onClick={() => setAddOpen(true)}>Add Lead</Button> : undefined}
      />

      <AddLeadModal open={addOpen} onOpenChange={setAddOpen} />

      <SoftDeleteDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Lead?"
        entityType="lead"
        entityName={data?.leads?.find((l) => l.id === deleteId)?.full_name ?? ''}
        onConfirm={() => {
          if (deleteId) softDelete.mutate({ table: 'leads', id: deleteId }, { onSuccess: () => setDeleteId(null) })
        }}
        loading={softDelete.isPending}
      />
    </div>
  )
}