import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Eye, Pencil, Trash2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useInstitutions } from '@/hooks/useInstitutions'
import { useSoftDelete } from '@/hooks/useSoftDelete'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SoftDeleteDialog } from '@/components/shared/SoftDeleteDialog'
import FlagDot from '@/components/ui/FlagDot'
import AddInstitutionModal from '@/pages/institutions/AddInstitutionModal'
import type { Institution, MouStatus } from '@/types'

const mouColors: Record<MouStatus, string> = {
  not_started: 'bg-gray-100 text-gray-800',
  in_discussion: 'bg-yellow-100 text-yellow-800',
  signed: 'bg-green-100 text-green-800',
  expired: 'bg-red-100 text-red-800',
}

export default function InstitutionList() {
  const navigate = useNavigate()
  const { can } = useAuth()
  const { data: rawInstitutions = [], isLoading } = useInstitutions()
  const softDelete = useSoftDelete()
  const [addOpen, setAddOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [flaggedOnly, setFlaggedOnly] = useState(false)

  const institutions = flaggedOnly ? rawInstitutions.filter((i) => i.flag_color != null) : rawInstitutions

  const columns: Column<Institution>[] = [
    {
      key: 'flag',
      header: '',
      render: (r) => (
        <div className="flex items-center justify-center w-4">
          <FlagDot color={r.flag_color} reason={r.flag_reason} />
        </div>
      ),
    },
    { key: 'name', header: 'Name', sortable: true },
    { key: 'type', header: 'Type', render: (r) => <Badge variant="outline" className="capitalize">{r.type}</Badge> },
    { key: 'city', header: 'City', render: (r) => r.city ?? '—' },
    { key: 'contact_person', header: 'Contact Person', render: (r) => r.contact_person ?? '—' },
    { key: 'contact_phone', header: 'Phone', render: (r) => r.contact_phone ?? '—' },
    {
      key: 'mou_status',
      header: 'MOU Status',
      render: (r) => (
        <Badge variant="outline" className={mouColors[r.mou_status]}>
          {r.mou_status.replace('_', ' ')}
        </Badge>
      ),
    },
    { key: 'bdm', header: 'BDM', render: (r) => r.bdm?.name ?? '—' },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" onClick={() => navigate(`/institutions/${r.id}`)}><Eye className="h-4 w-4" /></Button>
          {can('editInstitutions') && <Button variant="ghost" size="icon" onClick={() => navigate(`/institutions/${r.id}`)}><Pencil className="h-4 w-4" /></Button>}
          {can('editInstitutions') && <Button variant="ghost" size="icon" onClick={() => setDeleteId(r.id)}><Trash2 className="h-4 w-4 text-danger" /></Button>}
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="Institutions" description="Manage schools and colleges">
        <div className="flex items-center gap-2">
          <Button
            variant={flaggedOnly ? 'destructive' : 'outline'}
            size="sm"
            className="text-xs"
            onClick={() => setFlaggedOnly((prev) => !prev)}
          >
            {flaggedOnly ? 'Showing Flagged Queue' : 'Show Flagged Only'}
          </Button>
          {can('editInstitutions') && (
            <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add Institution</Button>
          )}
        </div>
      </PageHeader>

      <DataTable
        columns={columns}
        data={institutions}
        loading={isLoading}
        searchable
        rowKey={(r) => r.id}
        onRowClick={(r) => navigate(`/institutions/${r.id}`)}
        emptyTitle="No institutions yet"
        emptyDescription="Add your first school or college to start building partnerships."
        emptyAction={can('editInstitutions') ? <Button onClick={() => setAddOpen(true)}>Add Institution</Button> : undefined}
      />

      <AddInstitutionModal open={addOpen} onOpenChange={setAddOpen} />

      <SoftDeleteDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Institution?"
        entityType="institution"
        entityName={institutions.find((i) => i.id === deleteId)?.name ?? ''}
        onConfirm={() => {
          if (deleteId) softDelete.mutate({ table: 'institutions', id: deleteId }, { onSuccess: () => setDeleteId(null) })
        }}
        loading={softDelete.isPending}
      />
    </div>
  )
}