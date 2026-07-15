import { useState, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { Upload, AlertCircle, CheckCircle, FileSpreadsheet } from 'lucide-react'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'

const VALID_STATUSES = ['new_lead', 'contacted', 'follow_up', 'demo_booked', 'demo_attended', 'negotiation', 'registration_pending', 'fee_pending', 'converted', 'lost']
const VALID_SOURCES = ['instagram', 'facebook', 'walk_in', 'referral', 'website', 'whatsapp', 'college_visit', 'other']
const VALID_PRIORITIES = ['high', 'medium', 'low']
const VALID_TEMPERATURES = ['hot', 'warm', 'cold']
const REQUIRED_FIELDS = ['full_name', 'mobile']

interface ImportRow {
  rowNum: number
  data: Record<string, string>
  errors: string[]
  warnings: string[]
}

interface FieldMapping {
  spreadsheetCol: string
  schemaField: string
}

const SCHEMA_FIELDS = [
  { field: 'full_name', label: 'Full Name', required: true },
  { field: 'mobile', label: 'Mobile', required: true },
  { field: 'email', label: 'Email', required: false },
  { field: 'parent_name', label: 'Parent Name', required: false },
  { field: 'parent_contact', label: 'Parent Contact', required: false },
  { field: 'city', label: 'City', required: false },
  { field: 'school_college', label: 'School/College', required: false },
  { field: 'source', label: 'Source', required: false },
  { field: 'interested_course_id', label: 'Course ID', required: false },
  { field: 'status', label: 'Status', required: false },
  { field: 'priority', label: 'Priority', required: false },
  { field: 'temperature', label: 'Temperature', required: false },
  { field: 'budget', label: 'Budget', required: false },
  { field: 'expected_joining_date', label: 'Expected Joining Date', required: false },
  { field: 'notes', label: 'Notes', required: false },
]

export default function LeadImport() {
  const { can } = useAuth()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'done'>('upload')

  const [rawRows, setRawRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<FieldMapping[]>([])
  const [parsedRows, setParsedRows] = useState<ImportRow[]>([])
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState(0)

  if (!can('importData')) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">You do not have permission to import data.</p></div>
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' })
        if (json.length === 0) { toast.error('File is empty'); return }
        const headers = Object.keys(json[0])

        setRawRows(json.slice(0, 100)) // Preview first 100
        setMapping(headers.map(h => ({ spreadsheetCol: h, schemaField: '' })))
        setStep('map')
        toast.success(`Loaded ${json.length} rows from ${file.name}`)
      } catch (err) {
        toast.error('Failed to parse file: ' + (err as Error).message)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const updateMapping = (idx: number, schemaField: string) => {
    const next = [...mapping]
    next[idx] = { ...next[idx], schemaField }
    setMapping(next)
  }

  const validateAndPreview = () => {
    const activeMapping = mapping.filter(m => m.schemaField)
    const rows: ImportRow[] = rawRows.map((row, i) => {
      const data: Record<string, string> = {}
      const errors: string[] = []
      const warnings: string[] = []

      for (const m of activeMapping) {
        data[m.schemaField] = row[m.spreadsheetCol] ?? ''
      }

      // Required field checks
      for (const rf of REQUIRED_FIELDS) {
        if (!data[rf]?.trim()) errors.push(`Missing ${rf}`)
      }

      // Duplicate mobile check (client-side)
      if (data.mobile) {
        const mobiles = rawRows.map(r => r[activeMapping.find(m => m.schemaField === 'mobile')?.spreadsheetCol ?? '']?.trim())
          .filter(Boolean)
        const dupCount = mobiles.filter(m => m === data.mobile).length
        if (dupCount > 1) warnings.push('Duplicate mobile in file')
      }

      // Validate status
      if (data.status && !VALID_STATUSES.includes(data.status)) {
        errors.push(`Invalid status: "${data.status}"`)
      }

      // Validate source
      if (data.source && !VALID_SOURCES.includes(data.source)) {
        errors.push(`Invalid source: "${data.source}"`)
      }

      // Validate priority
      if (data.priority && !VALID_PRIORITIES.includes(data.priority)) {
        errors.push(`Invalid priority: "${data.priority}"`)
      }

      // Validate temperature
      if (data.temperature && !VALID_TEMPERATURES.includes(data.temperature)) {
        errors.push(`Invalid temperature: "${data.temperature}"`)
      }

      // Validate budget
      if (data.budget && isNaN(Number(data.budget))) {
        errors.push(`Budget must be a number`)
      }

      return { rowNum: i + 2, data, errors, warnings }
    })

    setParsedRows(rows)
    setStep('preview')
  }

  const handleImport = async () => {
    setImporting(true)
    const validRows = parsedRows.filter(r => r.errors.length === 0)
    let count = 0
    const BATCH_SIZE = 500
    const currentUserId = (await supabase.auth.getUser()).data.user?.id

    try {
      for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
        const batch = validRows.slice(i, i + BATCH_SIZE).map(r => ({
          ...r.data,
          budget: r.data.budget ? Number(r.data.budget) : null,
          expected_joining_date: r.data.expected_joining_date || null,
          created_by: currentUserId,
        }))
        const { error } = await supabase.from('leads').insert(batch)
        if (error) throw error
        count += batch.length
      }
      setImported(count)
      setStep('done')
      toast.success(`Imported ${count} leads successfully`)
    } catch (err) {
      toast.error('Import failed: ' + (err as Error).message)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div>
      <PageHeader title="Import Leads" description="Upload Excel/CSV file to bulk import leads" />

      {step === 'upload' && (
        <Card>
          <CardHeader><CardTitle>Select File</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center py-12">
            <FileSpreadsheet className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-4">Upload an Excel (.xlsx, .xls) or CSV file</p>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" /> Choose File
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 'map' && (
        <Card>
          <CardHeader><CardTitle>Map Columns</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Match spreadsheet columns to CRM fields</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Spreadsheet Column</TableHead>
                  <TableHead>CRM Field</TableHead>
                  <TableHead>Required</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mapping.map((m, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{m.spreadsheetCol}</TableCell>
                    <TableCell>
                      <select
                        className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                        value={m.schemaField}
                        onChange={(e) => updateMapping(i, e.target.value)}
                      >
                        <option value="">— Skip —</option>
                        {SCHEMA_FIELDS.map(sf => (
                          <option key={sf.field} value={sf.field}>{sf.label}</option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      {REQUIRED_FIELDS.includes(m.schemaField) && <Badge variant="destructive">Required</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setStep('upload')}>Back</Button>
              <Button onClick={validateAndPreview}>Validate & Preview</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'preview' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Preview
              <Badge variant="outline">{parsedRows.length} rows</Badge>
              <Badge variant="success">{parsedRows.filter(r => r.errors.length === 0).length} valid</Badge>
              {parsedRows.filter(r => r.errors.length > 0).length > 0 && (
                <Badge variant="destructive">{parsedRows.filter(r => r.errors.length > 0).length} errors</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {parsedRows.filter(r => r.errors.length > 0).length > 0 && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm">
                <p className="font-medium flex items-center gap-1"><AlertCircle className="h-4 w-4" /> Rows with errors will be skipped</p>
              </div>
            )}
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Issues</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.map((r) => (
                    <TableRow key={r.rowNum} className={r.errors.length > 0 ? 'bg-destructive/5' : ''}>
                      <TableCell>{r.rowNum}</TableCell>
                      <TableCell>{r.data.full_name || '—'}</TableCell>
                      <TableCell>{r.data.mobile || '—'}</TableCell>
                      <TableCell>{r.data.status || 'new_lead'}</TableCell>
                      <TableCell>
                        {r.errors.map((e, i) => <p key={i} className="text-xs text-destructive">{e}</p>)}
                        {r.warnings.map((w, i) => <p key={i} className="text-xs text-amber-600">{w}</p>)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setStep('map')}>Back</Button>
              <Button onClick={handleImport} disabled={importing || parsedRows.filter(r => r.errors.length === 0).length === 0}>
                {importing ? 'Importing...' : `Import ${parsedRows.filter(r => r.errors.length === 0).length} Leads`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'done' && (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <CheckCircle className="h-16 w-16 text-success mb-4" />
            <h2 className="text-xl font-bold mb-2">Import Complete</h2>
            <p className="text-muted-foreground">{imported} leads imported successfully</p>
            <p className="text-sm text-muted-foreground mt-1">{parsedRows.length - imported} rows skipped due to errors</p>
            <Button className="mt-6" onClick={() => { setStep('upload'); setImported(0) }}>Import Another File</Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}