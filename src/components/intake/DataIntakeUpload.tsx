import React, { useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, AlertCircle, FileSpreadsheet, Info, CheckCircle2 } from 'lucide-react'

export function DataIntakeUpload({ onUploadSuccess }: { onUploadSuccess?: () => void }) {
  const { profile } = useAuth()
  const [section, setSection] = useState<'leads' | 'finance' | 'institutions'>('leads')
  const [importType, setImportType] = useState<'live' | 'historical_backfill'>('live')
  const [file, setFile] = useState<File | null>(null)
  const [detectedTabs, setDetectedTabs] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, any>[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return
    parseFile(selectedFile)
  }

  const parseFile = (fileToParse: File) => {
    setFile(fileToParse)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        
        const allParsedRows: Record<string, any>[] = []
        const tabsFound: string[] = []

        workbook.SheetNames.forEach((sheetName) => {
          const sheet = workbook.Sheets[sheetName]
          const sheetRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: null })
          if (sheetRows.length > 0) {
            tabsFound.push(sheetName)
            sheetRows.forEach((r) => {
              allParsedRows.push({
                ...r,
                source_sheet: sheetName.trim()
              })
            })
          }
        })

        if (allParsedRows.length === 0) {
          toast.error('File contains no data rows.')
          return
        }

        setDetectedTabs(tabsFound)
        setRows(allParsedRows)
      } catch (err) {
        toast.error('Failed to parse file. Make sure it is a valid CSV or XLSX.')
      }
    }
    reader.readAsArrayBuffer(fileToParse)
  }

  const handleImport = async () => {
    if (!file || rows.length === 0) {
      toast.error('Please select a valid file first.')
      return
    }

    setIsSubmitting(true)
    try {
      const sampleHeaders = Object.keys(rows[0] || {})

      const { data, error } = await supabase.rpc('process_intake_batch', {
        p_section: section,
        p_source: 'manual_upload',
        p_filename: file.name,
        p_headers: sampleHeaders,
        p_rows: rows,
        p_uploaded_by: profile?.id || null,
        p_import_type: importType,
      })

      if (error) {
        toast.error('Import Error: ' + error.message)
      } else if (data && !data.success) {
        toast.error('Import Rejected: ' + data.error)
      } else if (data && data.success) {
        const newAdded = data.imported || 0
        const updated = data.updated || 0
        const skipped = data.skipped || 0
        toast.success(`Import Successful! ${newAdded} new leads added, ${updated} existing leads updated, ${skipped} empty rows skipped.`)
        setFile(null)
        setDetectedTabs([])
        setRows([])
        if (onUploadSuccess) onUploadSuccess()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 border-b border-border/50">
        <CardTitle className="text-base flex items-center gap-2">
          <Upload className="h-4 w-4 text-primary" />
          Multi-Tab Smart Auto-Sync Intake
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Target Section</label>
            <Select value={section} onValueChange={(v) => setSection(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="leads">1. Leads (`leads`)</SelectItem>
                <SelectItem value="institutions">2. Institutions (`institutions`)</SelectItem>
                <SelectItem value="finance">3. Finance (`institute_expenses`)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Import Mode</label>
            <Select value={importType} onValueChange={(v) => setImportType(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="live">Live Smart Upsert</SelectItem>
                <SelectItem value="historical_backfill">Historical Backfill</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Select File (CSV / XLSX)</label>
            <input
              type="file"
              accept=".csv, .xlsx, .xls"
              onChange={handleFileChange}
              className="text-xs text-muted-foreground file:mr-2 file:py-1.5 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer w-full"
            />
          </div>
        </div>

        {/* Tip */}
        <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block">Permanent Smart Sync Active:</span>
            <span>Uploads process all tabs automatically. Re-uploading the same file updates existing leads without creating duplicates or breaking campaign counts.</span>
          </div>
        </div>

        {file && (
          <div className="p-3 rounded-xl border border-border bg-muted/40 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
                <span>{file.name}</span>
                <span className="text-muted-foreground">({rows.length} total rows detected across {detectedTabs.length} tabs)</span>
              </div>
              <Button size="sm" onClick={handleImport} disabled={isSubmitting}>
                {isSubmitting ? 'Syncing & Updating...' : 'Start Smart Sync'}
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground block mb-1">Detected Tabs ({detectedTabs.length}): </span>
              <div className="flex flex-wrap gap-1">
                {detectedTabs.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 bg-background border border-border rounded px-2 py-0.5 text-[11px] font-mono">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1 text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
            <AlertCircle className="h-3.5 w-3.5" />
            Zero-Maintenance Protection
          </div>
          <p>
            Re-upload as many times as you like. Existing leads in matching tabs are updated, new leads are added, and blank rows are skipped automatically.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
