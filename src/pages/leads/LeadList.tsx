import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Eye, Pencil, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '@/hooks/useAuth'
import { useLeads, useDeleteLead, useCounselors, useCourses } from '@/hooks/useLeads'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { LeadStatusBadge, PriorityBadge } from '@/components/shared/LeadStatusBadge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/shared/PageHeader'
import AddLeadModal from '@/pages/leads/AddLeadModal'
import type { Lead, LeadFilters, LeadStatus, LeadSource, Priority } from '@/types'
import { LEAD_SOURCES } from '@/types'
import { supabase } from '@/lib/supabase'

export default function LeadList() {
  const navigate = useNavigate()
  const { can, isOwner } = useAuth()
  const [filters, setFilters] = useState<LeadFilters>({ page: 1 })
  const [addOpen, setAddOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data, isLoading } = useLeads(filters)
  const deleteLead = useDeleteLead()
  const { data: counselors = [] } = useCounselors()
  const { data: courses = [] } = useCourses()

  const columns: Column<Lead>[] = [
    { key: 'full_name', header: 'Name', sortable: true, exportValue: (r) => r.full_name },
    { key: 'mobile', header: 'Mobile', exportValue: (r) => r.mobile },
    { key: 'course', header: 'Course', render: (r) => r.course?.name ?? '—', exportValue: (r) => r.course?.name ?? '' },
    { key: 'source', header: 'Source', render: (r) => r.source?.replace('_', ' ') ?? '—', exportValue: (r) => r.source ?? '' },
    { key: 'status', header: 'Status', render: (r) => <LeadStatusBadge status={r.status} /> },
    { key: 'priority', header: 'Priority', render: (r) => <PriorityBadge priority={r.priority} /> },
    { key: 'counselor', header: 'Counselor', render: (r) => r.counselor?.name ?? '—', exportValue: (r) => r.counselor?.name ?? '' },
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

      <div className="mb-4 flex flex-wrap gap-2 bg-white rounded-xl border border-border p-3 shadow-sm">
        <Select value={filters.status ?? 'all'} onValueChange={(v) => setFilters((f) => ({ ...f, status: v === 'all' ? undefined : v as LeadStatus }))}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {['new','contacted','interested','admitted','lost'].map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>
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

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete lead?"
        description="This action cannot be undone."
        destructive
        loading={deleteLead.isPending}
        onConfirm={() => {
          if (deleteId) deleteLead.mutate(deleteId, { onSuccess: () => setDeleteId(null) })
        }}
      />
    </div>
  )
}
