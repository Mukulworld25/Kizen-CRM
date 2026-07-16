import { useState } from 'react'
import { format } from 'date-fns'
import { Trash2, RotateCcw, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useTrash, useRestore, usePermanentDelete } from '@/hooks/useSoftDelete'
import type { DeletedRecord } from '@/hooks/useSoftDelete'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SoftDeleteDialog } from '@/components/shared/SoftDeleteDialog'

const tableLabels: Record<string, string> = {
  leads: 'Lead',
  students: 'Student',
  institutions: 'Institution',
  institute_expenses: 'Expense',
}

export default function TrashView() {
  const { isOwner } = useAuth()
  const { data: trash = [] } = useTrash()
  const restore = useRestore()
  const permanentDelete = usePermanentDelete()

  const [permDeleteTarget, setPermDeleteTarget] = useState<DeletedRecord | null>(null)

  if (!isOwner) return null

  const handleRestore = (record: DeletedRecord) => {
    restore.mutate({ table: record.table, id: record.id })
  }

  const handlePermanentDelete = () => {
    if (!permDeleteTarget) return
    permanentDelete.mutate({ table: permDeleteTarget.table, id: permDeleteTarget.id }, {
      onSuccess: () => setPermDeleteTarget(null),
    })
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b border-border/50 pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Trash2 className="h-4 w-4 text-danger" />
          Trash ({trash.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {trash.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Trash2 className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Trash is empty</p>
            <p className="text-sm text-muted-foreground/60">Deleted records appear here and can be restored within 30 days.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Deleted At</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trash.map((record) => {
                const deletedDate = new Date(record.deleted_at)
                const expiresDate = new Date(deletedDate.getTime() + 30 * 86400000)
                const isExpired = expiresDate < new Date()

                return (
                  <TableRow key={`${record.table}-${record.id}`}>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {tableLabels[record.table] ?? record.table}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{record.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(deletedDate, 'MMM d, yyyy h:mm a')}
                    </TableCell>
                    <TableCell>
                      {isExpired ? (
                        <span className="text-danger text-sm font-medium">Expired</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {format(expiresDate, 'MMM d, yyyy')}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRestore(record)}
                          disabled={restore.isPending}
                          title="Restore"
                        >
                          <RotateCcw className="h-4 w-4 text-success" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPermDeleteTarget(record)}
                          disabled={permanentDelete.isPending}
                          title="Permanently delete"
                        >
                          <AlertTriangle className="h-4 w-4 text-danger" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <SoftDeleteDialog
        open={!!permDeleteTarget}
        onOpenChange={() => setPermDeleteTarget(null)}
        title="Permanently Delete?"
        entityType={permDeleteTarget ? tableLabels[permDeleteTarget.table] ?? 'record' : 'record'}
        entityName={permDeleteTarget?.name ?? ''}
        onConfirm={handlePermanentDelete}
        loading={permanentDelete.isPending}
      />
    </Card>
  )
}