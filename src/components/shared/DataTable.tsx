import { useState, useMemo, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { ChevronLeft, ChevronRight, Download, Search, Settings2, Pencil, Check, X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useColumnOverrides, useUpdateColumnOverride } from '@/hooks/useColumnOverrides'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Skeleton } from '@/components/ui/table'
import { EmptyState } from '@/components/shared/PageHeader'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export interface Column<T> {
  key: string
  header: string
  sortable?: boolean
  render?: (row: T, index: number) => React.ReactNode
  exportValue?: (row: T) => string | number
}

export interface BulkAction<T> {
  label: string
  icon?: React.ReactNode
  onClick: (selected: T[]) => void
  variant?: 'default' | 'destructive' | 'outline'
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
  /** Enables checkboxes for bulk selection */
  selectable?: boolean
  /** Bulk action buttons shown when rows are selected */
  bulkActions?: BulkAction<T>[]
  /** Unique key for localStorage column visibility (e.g. 'leads', 'students') */
  tableKey?: string
  /** Total count for server-side pagination */
  totalCount?: number
  /** Current page for server-side pagination */
  page?: number
  /** Callback for page change in server-side pagination */
  onPageChange?: (page: number) => void
  /** Callback for search input change (useful for server-side search) */
  onSearch?: (search: string) => void
  /** Callback for page size change */
  onPageSizeChange?: (pageSize: number) => void
  /** Available page size options */
  pageSizeOptions?: number[]
}

const VISIBILITY_STORAGE_KEY = 'kizen-column-visibility'

function loadVisibility(tableKey?: string): Record<string, boolean> | null {
  if (!tableKey) return null
  try {
    const raw = localStorage.getItem(`${VISIBILITY_STORAGE_KEY}-${tableKey}`)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveVisibility(tableKey: string, map: Record<string, boolean>) {
  localStorage.setItem(`${VISIBILITY_STORAGE_KEY}-${tableKey}`, JSON.stringify(map))
}

export function DataTable<T>({
  columns,
  data,
  loading,
  searchable,
  searchPlaceholder = 'Search...',
  pageSize = 15,
  onExport,
  exportFilename = 'export',
  showExport,
  emptyTitle = 'No data found',
  emptyDescription = 'Get started by adding your first record.',
  emptyAction,
  rowKey,
  onRowClick,
  selectable,
  bulkActions,
  tableKey,
  totalCount,
  page: serverPage,
  onPageChange,
  onSearch,
  onPageSizeChange,
  pageSizeOptions,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<string | null>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [clientPage, setClientPage] = useState(1)
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())

  const isServerPagination = totalCount !== undefined && onPageChange !== undefined
  const activePage = isServerPagination ? (serverPage ?? 1) : clientPage

  const { isOwner } = useAuth()
  const { data: columnOverrides = {} } = useColumnOverrides(tableKey)
  const updateColumnOverride = useUpdateColumnOverride(tableKey)
  const [editingColKey, setEditingColKey] = useState<string | null>(null)
  const [editingLabel, setEditingLabel] = useState('')

  const handleSaveOverride = (columnKey: string, newLabel: string) => {
    updateColumnOverride.mutate({ columnKey, customLabel: newLabel })
    setEditingColKey(null)
  }

  // Column visibility
  const [visibility, setVisibility] = useState<Record<string, boolean>>(() => {
    return loadVisibility(tableKey) ?? Object.fromEntries(columns.map(c => [c.key, true]))
  })

  const visibleColumns = useMemo(() => {
    return columns.filter(c => visibility[c.key] !== false)
  }, [columns, visibility])

  const toggleColumn = useCallback((key: string, value?: boolean) => {
    setVisibility(prev => {
      const nextValue = value !== undefined ? value : !(prev[key] ?? true)
      const next = { ...prev, [key]: nextValue }
      if (tableKey) saveVisibility(tableKey, next)
      return next
    })
  }, [tableKey])

  const filtered = useMemo(() => {
    let result = [...data]
    if (search && !isServerPagination) {
      const q = search.toLowerCase()
      result = result.filter((row) =>
        visibleColumns.some((col) => {
          const val = col.exportValue ? col.exportValue(row) : (row as Record<string, unknown>)[col.key]
          return String(val ?? '').toLowerCase().includes(q)
        })
      )
    }
    if (sortKey && !isServerPagination) {
      result.sort((a, b) => {
        const av = (a as Record<string, unknown>)[sortKey]
        const bv = (b as Record<string, unknown>)[sortKey]
        const cmp = String(av ?? '').localeCompare(String(bv ?? ''))
        return sortDir === 'asc' ? cmp : -cmp
      })
    }
    return result
  }, [data, search, sortKey, sortDir, visibleColumns, isServerPagination])

  const effectiveTotal = isServerPagination ? (totalCount ?? 0) : filtered.length
  const totalPages = Math.max(1, Math.ceil(effectiveTotal / pageSize))
  const paginated = isServerPagination ? data : filtered.slice((clientPage - 1) * pageSize, clientPage * pageSize)

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  const handleExport = async () => {
    const exportData = onExport ? await onExport() : filtered
    const rows = exportData.map((row) => {
      const obj: Record<string, string | number> = {}
      visibleColumns.forEach((col) => {
        obj[col.header] = col.exportValue ? col.exportValue(row) : String((row as Record<string, unknown>)[col.key] ?? '')
      })
      return obj
    })
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Data')
    XLSX.writeFile(wb, `${exportFilename}.xlsx`)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedKeys(new Set(paginated.map(r => rowKey(r))))
    } else {
      setSelectedKeys(new Set())
    }
  }

  const handleSelectOne = (key: string, checked: boolean) => {
    setSelectedKeys(prev => {
      const next = new Set(prev)
      if (checked) next.add(key)
      else next.delete(key)
      return next
    })
  }

  const selectedData = useMemo(() => {
    return data.filter(r => selectedKeys.has(rowKey(r)))
  }, [data, selectedKeys, rowKey])

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
        <div className="flex items-center gap-2">
          {searchable && (
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }} />
              <Input
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setClientPage(1)
                  onSearch?.(e.target.value)
                }}
                className="pl-9"
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {showExport && (
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4" /> Export Excel
            </Button>
          )}
          {/* Column visibility toggle */}
          {columns.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="rounded-xl">
                  <Settings2 className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {columns.map((col) => {
                  const displayHeader = (tableKey && columnOverrides[col.key]) ? columnOverrides[col.key] : col.header
                  return (
                    <DropdownMenuCheckboxItem
                      key={col.key}
                      checked={visibility[col.key] !== false}
                      onCheckedChange={(checked) => toggleColumn(col.key, checked)}
                      onSelect={(e) => e.preventDefault()}
                    >
                      {displayHeader}
                    </DropdownMenuCheckboxItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectable && selectedKeys.size > 0 && bulkActions && bulkActions.length > 0 && (
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-xl border shadow-sm animate-fade-up"
          style={{ background: 'var(--primary)', color: 'var(--primary-foreground)', borderColor: 'var(--primary)' }}
        >
          <span className="text-sm font-medium">{selectedKeys.size} selected</span>
          <div className="flex-1" />
          {bulkActions.map((action, i) => (
            <Button
              key={i}
              size="sm"
              variant={action.variant === 'destructive' ? 'destructive' : 'secondary'}
              onClick={() => action.onClick(selectedData)}
              className="text-xs"
            >
              {action.icon}
              {action.label}
            </Button>
          ))}
          <Button size="sm" variant="ghost" className="text-xs ml-2" onClick={() => setSelectedKeys(new Set())} style={{ color: 'var(--primary-foreground)' }}>
            Clear
          </Button>
        </div>
      )}

      {paginated.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
      ) : (
        <>
          <div className="rounded-xl border border-border shadow-sm overflow-hidden" style={{ background: 'var(--card)' }}>
            <Table containerClassName="min-h-[520px] max-h-[calc(100vh-210px)] overflow-auto">
              <TableHeader className="sticky top-0 z-20 bg-slate-50 dark:bg-[#162338]">
                <TableRow>
                  {selectable && (
                    <TableHead className="w-10 sticky top-0 z-20 bg-slate-50 dark:bg-[#162338] border-b border-border shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-border accent-[var(--primary)]"
                        checked={paginated.length > 0 && selectedKeys.size === paginated.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </TableHead>
                  )}
                  {visibleColumns.map((col) => {
                    const displayHeader = (tableKey && columnOverrides[col.key]) ? columnOverrides[col.key] : col.header
                    const isEditing = editingColKey === col.key
                    const isEditable = isOwner && !!tableKey && col.key !== 'actions' && col.key !== 'flag' && col.header !== ''

                    return (
                      <TableHead
                        key={col.key}
                        className={cn(
                          col.sortable && !isEditing ? 'cursor-pointer select-none' : '',
                          'relative px-4 py-3 h-11 text-xs font-semibold text-slate-700 dark:text-slate-200 sticky top-0 z-20 bg-slate-50 dark:bg-[#162338] border-b border-border shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
                        )}
                        onClick={() => {
                          if (!isEditing && col.sortable) {
                            handleSort(col.key)
                          }
                        }}
                      >
                        {isEditing && (
                          <div
                            className="absolute left-1 top-1.5 flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-primary shadow-xl rounded-lg p-1.5 min-w-[200px] z-40"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Input
                              type="text"
                              value={editingLabel}
                              onChange={(e) => setEditingLabel(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  handleSaveOverride(col.key, editingLabel)
                                } else if (e.key === 'Escape') {
                                  e.preventDefault()
                                  setEditingColKey(null)
                                }
                              }}
                              autoFocus
                              placeholder={col.header}
                              className="h-7 text-xs font-normal px-2 py-1 w-full bg-slate-50 dark:bg-slate-800"
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 shrink-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSaveOverride(col.key, editingLabel)
                              }}
                              title="Save custom label"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-muted-foreground hover:bg-muted shrink-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingColKey(null)
                              }}
                              title="Cancel"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                        <div className={cn("inline-flex items-center gap-1.5 whitespace-nowrap group/th", isEditing && "opacity-20")}>
                          <span className="font-semibold text-xs tracking-tight">{displayHeader}</span>
                          {sortKey === col.key && (
                            <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                              {sortDir === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                          {isEditable && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingColKey(col.key)
                                setEditingLabel(displayHeader)
                              }}
                              className="opacity-0 group-hover/th:opacity-70 hover:!opacity-100 transition-opacity p-0.5 rounded text-muted-foreground hover:text-primary shrink-0"
                              title={`Edit label for ${displayHeader}`}
                              aria-label={`Edit ${displayHeader} column header`}
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </TableHead>
                    )
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((row, rowIndex) => {
                  const key = rowKey(row)
                  const isSelected = selectedKeys.has(key)
                  return (
                    <TableRow
                      key={key}
                      className={cn(
                        onRowClick ? 'cursor-pointer' : '',
                        isSelected ? 'bg-primary/5' : ''
                      )}
                      onClick={() => onRowClick?.(row)}
                    >
                      {selectable && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-border accent-[var(--primary)]"
                            checked={isSelected}
                            onChange={(e) => handleSelectOne(key, e.target.checked)}
                          />
                        </TableCell>
                      )}
                      {visibleColumns.map((col) => {
                        const rawVal = (row as Record<string, unknown>)[col.key]
                        const isEmpty = rawVal === null || rawVal === undefined || rawVal === ''
                        return (
                          <TableCell key={col.key}>
                            {col.render ? col.render(row, (activePage - 1) * pageSize + rowIndex) : (
                              <span className={cn(isEmpty ? 'text-muted-foreground/50 italic text-sm' : '')}>
                                {isEmpty ? 'No data' : String(rawVal)}
                              </span>
                            )}
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm px-1" style={{ color: 'var(--muted-foreground)' }}>
            <div className="flex items-center gap-3">
              <span>{effectiveTotal.toLocaleString()} records · Page {activePage} of {totalPages}</span>
              <div className="flex items-center gap-1.5 text-xs">
                <span>Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const newSize = Number(e.target.value)
                    onPageSizeChange?.(newSize)
                    if (!isServerPagination) {
                      setClientPage(1)
                    }
                  }}
                  className="h-7 rounded-lg border border-border bg-card px-2 text-xs text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {(pageSizeOptions ?? [15, 25, 50, 100]).map((sz) => (
                    <option key={sz} value={sz}>{sz}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                disabled={activePage <= 1}
                onClick={() => isServerPagination ? onPageChange!(activePage - 1) : setClientPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                disabled={activePage >= totalPages}
                onClick={() => isServerPagination ? onPageChange!(activePage + 1) : setClientPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}