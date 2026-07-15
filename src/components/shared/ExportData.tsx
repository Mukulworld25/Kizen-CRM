import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format } from 'date-fns'
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'

type DateRange = 'last_month' | 'last_quarter' | 'all_time' | 'custom'
type EntityType = 'leads' | 'students' | 'fees' | 'institutions'

const ENTITIES: { value: EntityType; label: string }[] = [
  { value: 'leads', label: 'Leads' },
  { value: 'students', label: 'Students' },
  { value: 'fees', label: 'Fees & Payments' },
  { value: 'institutions', label: 'Institutions' },
]

async function fetchData(entity: EntityType, dateFrom?: string, dateTo?: string) {
  const dateField: Record<EntityType, string> = {
    leads: 'created_at',
    students: 'admission_date',
    fees: 'created_at',
    institutions: 'created_at',
  }

  let query = supabase.from(entity).select('*')

  const field = dateField[entity]
  if (dateFrom && dateTo) {
    query = query.gte(field, dateFrom).lte(field, dateTo + 'T23:59:59')
  } else if (dateFrom) {
    query = query.gte(field, dateFrom)
  }

  // For fees, also get payments
  if (entity === 'fees') {
    query = query.select('*, student:students(full_name, student_id, mobile), course:courses(name)')
  }
  if (entity === 'students') {
    query = query.select('*, course:courses(name), batch:batches(batch_name)')
  }
  if (entity === 'institutions') {
    query = query.select('*, bdm:users!institutions_assigned_bdm_id_fkey(name, email)')
  }

  const { data, error } = await query.order(dateField[entity], { ascending: false })
  if (error) throw error
  return data ?? []
}

function flattenRow(row: Record<string, unknown>): Record<string, unknown> {
  const flat: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(row)) {
    if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
      const sub = val as Record<string, unknown>
      for (const [sk, sv] of Object.entries(sub)) {
        flat[`${key}_${sk}`] = sv ?? ''
      }
    } else {
      flat[key] = val ?? ''
    }
  }
  return flat
}

function downloadWorkbook(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename, { bookType: 'xlsx', type: 'binary' })
}

export default function ExportData() {
  const { isOwner } = useAuth()
  const [range, setRange] = useState<DateRange>('last_month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [selected, setSelected] = useState<Set<EntityType>>(new Set(['leads', 'students']))
  const [exporting, setExporting] = useState(false)

  if (!isOwner) return null

  const getDateRange = () => {
    const now = new Date()
    switch (range) {
      case 'last_month': {
        const from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const to = new Date(now.getFullYear(), now.getMonth(), 0)
        return { from: format(from, 'yyyy-MM-dd'), to: format(to, 'yyyy-MM-dd') }
      }
      case 'last_quarter': {
        const from = new Date(now.getFullYear(), now.getMonth() - 3, 1)
        return { from: format(from, 'yyyy-MM-dd'), to: format(now, 'yyyy-MM-dd') }
      }
      case 'custom':
        return { from: customFrom, to: customTo }
      case 'all_time':
      default:
        return { from: '', to: '' }
    }
  }

  const toggleEntity = (entity: EntityType) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(entity)) next.delete(entity)
      else next.add(entity)
      return next
    })
  }

  const handleExport = async () => {
    if (selected.size === 0) {
      toast.error('Select at least one data type')
      return
    }
    if (range === 'custom' && (!customFrom || !customTo)) {
      toast.error('Select custom date range')
      return
    }

    setExporting(true)
    const { from, to } = getDateRange()

    try {
      const wb = XLSX.utils.book_new()
      const entities = Array.from(selected)

      for (const entity of entities) {
        const data = await fetchData(entity, from || undefined, to || undefined)
        const flattened = data.map((row: Record<string, unknown>) => flattenRow(row))
        const ws = XLSX.utils.json_to_sheet(flattened)

        // Auto-size columns (rough)
        const colWidths = Object.keys(flattened[0] ?? {}).map((key) => ({
          wch: Math.max(key.length, 12),
        }))
        ws['!cols'] = colWidths

        const label = ENTITIES.find((e) => e.value === entity)?.label ?? entity
        XLSX.utils.book_append_sheet(wb, ws, label.slice(0, 31))
      }

      const rangeLabel = range === 'all_time' ? 'all-time' : `${from}_to_${to}`
      const filename = `kizen-export_${rangeLabel}_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`
      downloadWorkbook(wb, filename)
      toast.success(`Exported ${entities.length} table(s)`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b border-border/50 pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-primary" />
          Export Data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <p className="text-sm text-muted-foreground">
          Download your CRM data as an Excel workbook (.xlsx). Each selected entity becomes a separate sheet.
        </p>

        {/* Date range */}
        <div className="space-y-2">
          <Label>Date Range</Label>
          <Select value={range} onValueChange={(v) => setRange(v as DateRange)}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="last_quarter">Last Quarter</SelectItem>
              <SelectItem value="all_time">All Time</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {range === 'custom' && (
            <div className="flex gap-2 items-center">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              />
              <span className="text-muted-foreground">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              />
            </div>
          )}
        </div>

        {/* Entity selection */}
        <div className="space-y-2">
          <Label>Data to Export</Label>
          <div className="flex flex-wrap gap-3">
            {ENTITIES.map((entity) => (
              <label key={entity.value} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  checked={selected.has(entity.value)}
                  onChange={() => toggleEntity(entity.value)}
                />
                {entity.label}
              </label>
            ))}
          </div>
        </div>

        <Button onClick={handleExport} disabled={exporting || selected.size === 0}>
          {exporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export as XLSX
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}