import { useState, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { ChevronLeft, ChevronRight, Download, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Skeleton } from '@/components/ui/table'
import { EmptyState } from '@/components/shared/PageHeader'

export interface Column<T> {
  key: string
  header: string
  sortable?: boolean
  render?: (row: T) => React.ReactNode
  exportValue?: (row: T) => string | number
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  searchable?: boolean
  searchPlaceholder?: string
  pageSize?: number
  onExport?: () => T[] | Promise<T[]>
  exportFilename?: string
  showExport?: boolean
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: React.ReactNode
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
}

export function DataTable<T>({
  columns,
  data,
  loading,
  searchable,
  searchPlaceholder = 'Search...',
  pageSize = 25,
  onExport,
  exportFilename = 'export',
  showExport,
  emptyTitle = 'No data found',
  emptyDescription = 'Get started by adding your first record.',
  emptyAction,
  rowKey,
  onRowClick,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<string | null>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    let result = [...data]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter((row) =>
        columns.some((col) => {
          const val = col.exportValue ? col.exportValue(row) : (row as Record<string, unknown>)[col.key]
          return String(val ?? '').toLowerCase().includes(q)
        })
      )
    }
    if (sortKey) {
      result.sort((a, b) => {
        const av = (a as Record<string, unknown>)[sortKey]
        const bv = (b as Record<string, unknown>)[sortKey]
        const cmp = String(av ?? '').localeCompare(String(bv ?? ''))
        return sortDir === 'asc' ? cmp : -cmp
      })
    }
    return result
  }, [data, search, sortKey, sortDir, columns])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  const handleExport = async () => {
    const exportData = onExport ? await onExport() : filtered
    const rows = exportData.map((row) => {
      const obj: Record<string, string | number> = {}
      columns.forEach((col) => {
        obj[col.header] = col.exportValue ? col.exportValue(row) : String((row as Record<string, unknown>)[col.key] ?? '')
      })
      return obj
    })
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Data')
    XLSX.writeFile(wb, `${exportFilename}.xlsx`)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {searchable && (
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="pl-9"
            />
          </div>
        )}
        {showExport && (
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4" /> Export Excel
          </Button>
        )}
      </div>

      {paginated.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
      ) : (
        <>
          <div className="rounded-xl border border-border bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((col) => (
                    <TableHead
                      key={col.key}
                      className={col.sortable ? 'cursor-pointer select-none' : ''}
                      onClick={() => col.sortable && handleSort(col.key)}
                    >
                      {col.header}
                      {sortKey === col.key && (sortDir === 'asc' ? ' ↑' : ' ↓')}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((row) => (
                  <TableRow
                    key={rowKey(row)}
                    className={onRowClick ? 'cursor-pointer' : ''}
                    onClick={() => onRowClick?.(row)}
                  >
                    {columns.map((col) => {
                      const rawVal = (row as Record<string, unknown>)[col.key]
                      const isEmpty = rawVal === null || rawVal === undefined || rawVal === ''
                      return (
                        <TableCell key={col.key}>
                          {col.render ? col.render(row) : (
                            <span className={isEmpty ? 'text-muted-foreground/50 italic text-sm' : ''}>
                              {isEmpty ? 'No data' : String(rawVal)}
                            </span>
                          )}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{filtered.length} records · Page {page} of {totalPages}</span>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
