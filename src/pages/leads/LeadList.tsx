import { useState, useCallback, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Eye, Pencil, Trash2, UserCheck } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useLeads, useCounselors, useCourses } from '@/hooks/useLeads'
import { useSoftDelete } from '@/hooks/useSoftDelete'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column, type BulkAction } from '@/components/shared/DataTable'
import { DynamicFilterBuilder, type FilterField, type DynamicFilterRule } from '@/components/shared/DynamicFilterBuilder'
import { LeadStatusBadge, PriorityBadge, TemperatureBadge } from '@/components/shared/LeadStatusBadge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DeleteOrRequestDialog } from '@/components/shared/DeleteOrRequestDialog'
import AddLeadModal from '@/pages/leads/AddLeadModal'
import FlagDot from '@/components/ui/FlagDot'
import type { Lead, LeadFilters, LeadStatus, LeadSource, Priority, LeadTemperature } from '@/types'
import { LEAD_SOURCES, LEAD_STATUSES, LEAD_STATUS_LABELS, SHEET_SOURCES } from '@/types'
import { supabase } from '@/lib/supabase'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input, Label } from '@/components/ui/input'
import { useUpdateLead } from '@/hooks/useLeads'
import { CustomizableFilterBar, type FilterItem } from '@/components/shared/CustomizableFilterBar'

export default function LeadList() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { can, isOwner } = useAuth()
  const [filters, setFilters] = useState<LeadFilters>({ page: 1, pageSize: 15 })
  const [addOpen, setAddOpen] = useState(false)
  const [editLead, setEditLead] = useState<Lead | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [flaggedOnly, setFlaggedOnly] = useState(false)
  const updateLead = useUpdateLead()
  const queryClient = useQueryClient()

  // Dynamic Filter Builder rules
  const [dynamicRules, setDynamicRules] = useState<DynamicFilterRule[]>([])

  // Bulk Assign State
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false)
  const [selectedForAssign, setSelectedForAssign] = useState<Lead[]>([])
  const [targetCounselorId, setTargetCounselorId] = useState<string>('')
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    const filterParam = searchParams.get('filter')
    if (filterParam === 'stale') {
      setFlaggedOnly(true)
    } else if (filterParam === 'dormant') {
      setFilters((f) => ({ ...f, temperature: 'cold' as LeadTemperature }))
    }
  }, [searchParams])

  const { data, isLoading } = useLeads({ ...filters, dynamicRules })
  const softDelete = useSoftDelete()
  const { data: counselors = [] } = useCounselors()
  const { data: courses = [] } = useCourses()

  const rawLeads = data?.leads ?? []
  const leads = flaggedOnly ? rawLeads.filter((l) => l.flag_color != null) : rawLeads

  const handleBulkDelete = useCallback(async (selected: Lead[]) => {
    const confirmed = window.confirm(`Delete ${selected.length} leads?`)
    if (!confirmed) return
    for (const lead of selected) {
      await softDelete.mutateAsync({ table: 'leads', id: lead.id })
    }
    toast.success(`${selected.length} leads moved to trash`)
  }, [softDelete])

  const columns: Column<Lead>[] = [
    {
      key: 's_no',
      header: 'Sr No',
      render: (_r, index) => (
        <div className="flex items-center gap-1.5">
          <FlagDot color={_r.flag_color} reason={_r.flag_reason} />
          <span className="font-mono text-xs text-slate-500 font-bold">
            {((filters.page ?? 1) - 1) * (filters.pageSize ?? 15) + index + 1}
          </span>
        </div>
      ),
    },
    {
      key: 'full_name',
      header: 'Names',
      sortable: true,
      render: (r) => <span className="font-medium text-slate-900">{r.full_name}</span>,
      exportValue: (r) => r.full_name,
    },
    { 
      key: 'mobile', 
      header: 'Contact No.', 
      render: (r) => (r.mobile && r.mobile !== '9999999999') ? <span className="font-mono text-xs">{r.mobile}</span> : <span className="text-slate-400 italic text-xs font-normal">—</span>, 
      exportValue: (r) => (r.mobile && r.mobile !== '9999999999') ? r.mobile : '' 
    },
    {
      key: 'lead_date',
      header: 'Lead Date',
      sortable: true,
      render: (r) => r.lead_date ? format(new Date(r.lead_date), 'dd/MM/yy') : '—',
      exportValue: (r) => r.lead_date ? format(new Date(r.lead_date), 'dd/MM/yy') : '',
    },
    {
      key: 'source',
      header: 'Source',
      render: (r) => r.source?.replace('_', ' ') ?? '—',
      exportValue: (r) => r.source ?? '',
    },
    {
      key: 'class_year',
      header: 'Current Class/ Qualification',
      render: (r) => (r as any).class_year || '—',
      exportValue: (r) => (r as any).class_year ?? '',
    },
    {
      key: 'city',
      header: 'City',
      render: (r) => r.city || '—',
      exportValue: (r) => r.city ?? '',
    },
    {
      key: 'tap_date',
      header: 'Tap Date',
      render: (r) => r.tap_date ? format(new Date(r.tap_date), 'dd/MM/yy') : '—',
      exportValue: (r) => r.tap_date ? format(new Date(r.tap_date), 'dd/MM/yy') : '',
    },
    {
      key: 'call_status',
      header: 'Call Status',
      render: (r) => r.call_status ?? '—',
      exportValue: (r) => r.call_status ?? '',
    },
    {
      key: 'interest_level',
      header: 'Interest level',
      render: (r) => r.interest_level ?? '—',
      exportValue: (r) => r.interest_level ?? '',
    },
    {
      key: 'disposition',
      header: 'Disposition',
      render: (r) => r.disposition ?? '—',
      exportValue: (r) => r.disposition ?? '',
    },
    {
      key: 'notes',
      header: 'Remarks',
      render: (r) => r.notes ? <span className="truncate max-w-[140px] inline-block text-xs" title={r.notes}>{r.notes}</span> : '—',
      exportValue: (r) => r.notes ?? '',
    },
    {
      key: 'followup_date_1',
      header: 'Date',
      render: (r) => r.followup_date_1 ? format(new Date(r.followup_date_1), 'dd/MM/yy') : '—',
      exportValue: (r) => r.followup_date_1 ? format(new Date(r.followup_date_1), 'dd/MM/yy') : '',
    },
    {
      key: 'followup_remarks_1',
      header: 'Follow-up 1',
      render: (r) => r.followup_remarks_1 ? <span className="truncate max-w-[140px] inline-block text-xs" title={r.followup_remarks_1}>{r.followup_remarks_1}</span> : '—',
      exportValue: (r) => r.followup_remarks_1 ?? '',
    },
    {
      key: 'followup_date_2',
      header: 'Date',
      render: (r) => r.followup_date_2 ? format(new Date(r.followup_date_2), 'dd/MM/yy') : '—',
      exportValue: (r) => r.followup_date_2 ? format(new Date(r.followup_date_2), 'dd/MM/yy') : '',
    },
    {
      key: 'followup_remarks_2',
      header: 'Follow-up 2',
      render: (r) => r.followup_remarks_2 ? <span className="truncate max-w-[140px] inline-block text-xs" title={r.followup_remarks_2}>{r.followup_remarks_2}</span> : '—',
      exportValue: (r) => r.followup_remarks_2 ?? '',
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" onClick={() => navigate(`/leads/${r.id}`)} title="View Details"><Eye className="h-4 w-4" /></Button>
          {can('editLeads') && <Button variant="ghost" size="icon" onClick={() => setEditLead(r)} title="Quick Edit"><Pencil className="h-4 w-4 text-sky-600" /></Button>}
          {(isOwner || can('deleteLeads') || can('viewLeads') || can('editLeads')) && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeleteId(r.id)}
              title={isOwner ? "Delete Lead" : "Request Deletion"}
            >
              <Trash2 className="h-4 w-4 text-danger" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  const handleBulkAssign = async () => {
    if (!targetCounselorId) {
      toast.error('Please select a counselor')
      return
    }
    setAssigning(true)
    try {
      const isUnassign = targetCounselorId === 'unassigned'
      const counselorObj = counselors.find((c) => c.id === targetCounselorId)
      const counselorName = isUnassign ? null : (counselorObj?.name || null)
      const leadIds = selectedForAssign.map((l) => l.id)
      const { error } = await supabase
        .from('leads')
        .update({
          assigned_counselor_id: isUnassign ? null : targetCounselorId,
          counselor_name: counselorName,
          updated_at: new Date().toISOString(),
        })
        .in('id', leadIds)
      if (error) throw error
      await queryClient.invalidateQueries({ queryKey: ['leads'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success(
        isUnassign
          ? `Unassigned ${leadIds.length} lead(s)`
          : `Assigned ${leadIds.length} lead(s) to ${counselorName}`
      )
      setBulkAssignOpen(false)
      setSelectedForAssign([])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to assign leads')
    } finally {
      setAssigning(false)
    }
  }

  const bulkActions: BulkAction<Lead>[] = [
    {
      label: 'Assign to...',
      icon: <UserCheck className="h-3.5 w-3.5 mr-1" />,
      onClick: (selected) => {
        setSelectedForAssign(selected)
        setTargetCounselorId('')
        setBulkAssignOpen(true)
      },
    },
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

  const DEFAULT_LEAD_FILTERS = [
    'display_id',
    'status',
    'source',
    'city',
    'interest_level',
    'disposition',
    'counselor',
    'course',
  ]

  const leadFilterItems: FilterItem[] = [
    {
      key: 'display_id',
      component: (
        <div className="relative w-40">
          <Input
            placeholder="Search ID (KZ-)..."
            value={filters.displayId ?? ''}
            onChange={(e) => {
              const val = e.target.value
              setFilters((f) => ({ ...f, displayId: val || undefined, page: 1 }))
            }}
            className="h-10 text-xs font-mono"
          />
        </div>
      ),
    },
    {
      key: 'status',
      component: (
        <Select value={filters.status ?? 'all'} onValueChange={(v) => setFilters((f) => ({ ...f, status: v === 'all' ? undefined : v as LeadStatus, page: 1 }))}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {LEAD_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{LEAD_STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      key: 'source',
      component: (
        <Select value={filters.source ?? 'all'} onValueChange={(v) => setFilters((f) => ({ ...f, source: v === 'all' ? undefined : v as LeadSource, page: 1 }))}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Source" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="google_ads">Google Ads</SelectItem>
            <SelectItem value="referral">Referral</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="website">Website</SelectItem>
            <SelectItem value="college_visit">College Visit</SelectItem>
            <SelectItem value="walk_in">Walk-in</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
    {
      key: 'city',
      component: (
        <div className="relative w-36">
          <Input
            placeholder="Filter City..."
            value={filters.city ?? ''}
            onChange={(e) => {
              const val = e.target.value
              setFilters((f) => ({ ...f, city: val || undefined, page: 1 }))
            }}
            className="h-10 text-xs"
          />
        </div>
      ),
    },
    {
      key: 'interest_level',
      component: (
        <Select value={filters.interestLevel ?? 'all'} onValueChange={(v) => setFilters((f) => ({ ...f, interestLevel: v === 'all' ? undefined : v, page: 1 }))}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Interest Level" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Interest</SelectItem>
            <SelectItem value="Hot">Hot</SelectItem>
            <SelectItem value="Warm">Warm</SelectItem>
            <SelectItem value="Cold">Cold</SelectItem>
            <SelectItem value="Dead">Dead</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
    {
      key: 'disposition',
      component: (
        <Select value={filters.disposition ?? 'all'} onValueChange={(v) => setFilters((f) => ({ ...f, disposition: v === 'all' ? undefined : v, page: 1 }))}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Disposition" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Dispositions</SelectItem>
            <SelectItem value="interested">Interested</SelectItem>
            <SelectItem value="neutral">Neutral</SelectItem>
            <SelectItem value="Not Interested">Not Interested</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
    {
      key: 'counselor',
      component: (
        <Select value={filters.counselorId ?? 'all'} onValueChange={(v) => setFilters((f) => ({ ...f, counselorId: v === 'all' ? undefined : v, page: 1 }))}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Counselor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Counselors</SelectItem>
            <SelectItem value="unassigned">Unassigned Only</SelectItem>
            {counselors.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      ),
    },
    {
      key: 'course',
      component: (
        <Select value={filters.courseId ?? 'all'} onValueChange={(v) => setFilters((f) => ({ ...f, courseId: v === 'all' ? undefined : v, page: 1 }))}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Course" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courses</SelectItem>
            {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      ),
    },
  ]

  const leadDynamicFields: FilterField[] = [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: LEAD_STATUSES.map((s) => ({ value: s, label: LEAD_STATUS_LABELS[s] })),
    },
    {
      key: 'source',
      label: 'Source',
      type: 'select',
      options: [
        { value: 'google_ads', label: 'Google Ads' },
        { value: 'referral', label: 'Referral' },
        { value: 'whatsapp', label: 'WhatsApp' },
        { value: 'instagram', label: 'Instagram' },
        { value: 'website', label: 'Website' },
        { value: 'college_visit', label: 'College Visit' },
        { value: 'walk_in', label: 'Walk-in' },
        { value: 'other', label: 'Other' },
      ],
    },
    { key: 'city', label: 'City', type: 'text' },
    {
      key: 'interest_level',
      label: 'Interest Level',
      type: 'select',
      options: [
        { value: 'Hot', label: 'Hot' },
        { value: 'Warm', label: 'Warm' },
        { value: 'Cold', label: 'Cold' },
        { value: 'Dead', label: 'Dead' },
      ],
    },
    {
      key: 'disposition',
      label: 'Disposition',
      type: 'select',
      options: [
        { value: 'interested', label: 'Interested' },
        { value: 'neutral', label: 'Neutral' },
        { value: 'Not Interested', label: 'Not Interested' },
      ],
    },
    {
      key: 'assigned_counselor_id',
      label: 'Counselor',
      type: 'select',
      options: counselors.map((c) => ({ value: c.id, label: c.name })),
    },
    {
      key: 'interested_course_id',
      label: 'Course',
      type: 'select',
      options: courses.map((c) => ({ value: c.id, label: c.name })),
    },
    { key: 'created_at', label: 'Registration Date / Lead Date', type: 'date' },
    { key: 'tap_date', label: 'Tap Date', type: 'date' },
    { key: 'call_status', label: 'Call Status', type: 'text' },
    { key: 'class_year', label: 'Current Class / Qualification', type: 'text' },
    { key: 'school_college', label: 'School / College', type: 'text' },
    { key: 'priority', label: 'Priority', type: 'select', options: [{ value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }] },
    { key: 'temperature', label: 'Temperature', type: 'select', options: [{ value: 'hot', label: 'Hot' }, { value: 'warm', label: 'Warm' }, { value: 'cold', label: 'Cold' }] },
    { key: 'budget', label: 'Budget', type: 'number' },
    { key: 'lead_score', label: 'Lead Score', type: 'number' },
  ]

  return (
    <div>
      <PageHeader title="Leads" description="Manage your lead pipeline">
        {can('addLeads') && (
          <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add Lead</Button>
        )}
      </PageHeader>

      <div className="flex items-center gap-2 flex-wrap mb-3">
        <CustomizableFilterBar
          tableKey="leads"
          items={leadFilterItems}
          defaultOrder={DEFAULT_LEAD_FILTERS}
        />
        <DynamicFilterBuilder
          fields={leadDynamicFields}
          rules={dynamicRules}
          onChange={(rules) => {
            setDynamicRules(rules)
            setFilters((f) => ({ ...f, page: 1 }))
          }}
        />
      </div>

      <DataTable
        columns={columns}
        data={leads}
        loading={isLoading}
        searchable
        selectable
        bulkActions={bulkActions}
        tableKey="leads"
        showExport={isOwner}
        onExport={handleExport}
        exportFilename="kizen-leads"
        totalCount={data?.total}
        page={filters.page ?? 1}
        pageSize={filters.pageSize ?? 15}
        onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))}
        onSearch={(s) => setFilters((f) => ({ ...f, search: s || undefined, page: 1 }))}
        rowKey={(r) => r.id}
        onRowClick={(r) => navigate(`/leads/${r.id}`)}
        emptyTitle="No leads yet"
        emptyDescription="Add your first lead to start building your pipeline."
        emptyAction={can('addLeads') ? <Button onClick={() => setAddOpen(true)}>Add Lead</Button> : undefined}
      />

      <AddLeadModal open={addOpen} onOpenChange={setAddOpen} />

      {/* QUICK EDIT LEAD MODAL */}
      <Dialog open={!!editLead} onOpenChange={(o) => !o && setEditLead(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Lead Details</DialogTitle>
          </DialogHeader>
          {editLead && (
            <div className="space-y-3 py-2 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Full Name</Label>
                  <Input
                    value={editLead.full_name || ''}
                    onChange={(e) => setEditLead({ ...editLead, full_name: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Mobile</Label>
                  <Input
                    value={editLead.mobile || ''}
                    onChange={(e) => setEditLead({ ...editLead, mobile: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    value={editLead.email || ''}
                    onChange={(e) => setEditLead({ ...editLead, email: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>City</Label>
                  <Input
                    value={editLead.city || ''}
                    onChange={(e) => setEditLead({ ...editLead, city: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={editLead.status} onValueChange={(v) => setEditLead({ ...editLead, status: v as LeadStatus })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LEAD_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{LEAD_STATUS_LABELS[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Temperature</Label>
                  <Select value={editLead.temperature || 'warm'} onValueChange={(v) => setEditLead({ ...editLead, temperature: v as LeadTemperature })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hot">Hot</SelectItem>
                      <SelectItem value="warm">Warm</SelectItem>
                      <SelectItem value="cold">Cold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Sheet-parity fields */}
              <div className="border-t pt-3 space-y-3">
                <div className="font-semibold text-xs text-slate-500 uppercase tracking-wider">Sheet Tracking Fields</div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Tap Date</Label>
                    <Input
                      type="date"
                      value={editLead.tap_date ? editLead.tap_date.split('T')[0] : ''}
                      onChange={(e) => setEditLead({ ...editLead, tap_date: e.target.value || null })}
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <Label>Call Status</Label>
                    <Select
                      value={editLead.call_status || 'none'}
                      onValueChange={(v) => setEditLead({ ...editLead, call_status: v === 'none' ? null : v })}
                    >
                      <SelectTrigger className="mt-1 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- None --</SelectItem>
                        <SelectItem value="Connected">Connected</SelectItem>
                        <SelectItem value="Not Connected">Not Connected</SelectItem>
                        <SelectItem value="Call Back">Call Back</SelectItem>
                        <SelectItem value="Switched Off">Switched Off</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Disposition</Label>
                    <Input
                      placeholder="e.g. Pitching, DNP, Interested"
                      value={editLead.disposition || ''}
                      onChange={(e) => setEditLead({ ...editLead, disposition: e.target.value })}
                      className="mt-1 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Follow-up 1 Date</Label>
                    <Input
                      type="date"
                      value={editLead.followup_date_1 ? editLead.followup_date_1.split('T')[0] : ''}
                      onChange={(e) => setEditLead({ ...editLead, followup_date_1: e.target.value || null })}
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <Label>Follow-up 1 Remarks</Label>
                    <Input
                      placeholder="Remarks after follow-up 1"
                      value={editLead.followup_remarks_1 || ''}
                      onChange={(e) => setEditLead({ ...editLead, followup_remarks_1: e.target.value })}
                      className="mt-1 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Follow-up 2 Date</Label>
                    <Input
                      type="date"
                      value={editLead.followup_date_2 ? editLead.followup_date_2.split('T')[0] : ''}
                      onChange={(e) => setEditLead({ ...editLead, followup_date_2: e.target.value || null })}
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <Label>Follow-up 2 Remarks</Label>
                    <Input
                      placeholder="Remarks after follow-up 2"
                      value={editLead.followup_remarks_2 || ''}
                      onChange={(e) => setEditLead({ ...editLead, followup_remarks_2: e.target.value })}
                      className="mt-1 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <Label>Remarks / Notes</Label>
                  <Input
                    placeholder="General remarks..."
                    value={editLead.notes || ''}
                    onChange={(e) => setEditLead({ ...editLead, notes: e.target.value })}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditLead(null)}>Cancel</Button>
            <Button
              onClick={async () => {
                if (!editLead) return
                await updateLead.mutateAsync({
                  id: editLead.id,
                  full_name: editLead.full_name,
                  mobile: editLead.mobile,
                  email: editLead.email,
                  city: editLead.city,
                  status: editLead.status,
                  temperature: editLead.temperature,
                  tap_date: editLead.tap_date,
                  call_status: editLead.call_status,
                  disposition: editLead.disposition,
                  followup_date_1: editLead.followup_date_1,
                  followup_remarks_1: editLead.followup_remarks_1,
                  followup_date_2: editLead.followup_date_2,
                  followup_remarks_2: editLead.followup_remarks_2,
                  notes: editLead.notes,
                })
                toast.success('Lead updated successfully')
                setEditLead(null)
              }}
              disabled={updateLead.isPending}
            >
              {updateLead.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteOrRequestDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        tableName="leads"
        recordId={deleteId}
        recordLabel={data?.leads?.find((l) => l.id === deleteId)?.full_name ?? ''}
        entityType="Lead"
        onDirectDelete={() => {
          if (deleteId) softDelete.mutate({ table: 'leads', id: deleteId }, { onSuccess: () => setDeleteId(null) })
        }}
        loading={softDelete.isPending}
      />

      {/* BULK ASSIGN MODAL */}
      <Dialog open={bulkAssignOpen} onOpenChange={setBulkAssignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Selected Leads</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              Assign <strong className="text-slate-900 dark:text-slate-100">{selectedForAssign.length}</strong> selected lead(s) to a counselor:
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Select Counselor</Label>
              <Select value={targetCounselorId} onValueChange={setTargetCounselorId}>
                <SelectTrigger className="w-full text-xs">
                  <SelectValue placeholder="Choose a counselor..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned" className="text-xs text-amber-600">Unassign (Remove Counselor)</SelectItem>
                  {counselors.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.name} ({c.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setBulkAssignOpen(false)}>Cancel</Button>
            <Button
              size="sm"
              onClick={handleBulkAssign}
              disabled={assigning || !targetCounselorId}
              className="bg-primary text-primary-foreground font-semibold"
            >
              {assigning ? 'Assigning...' : 'Confirm Assignment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}