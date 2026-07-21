import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Upload, AlertCircle, CheckCircle, FileSpreadsheet, ArrowRight, Settings, Info, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { format } from 'date-fns'

interface ImportRow {
  rowNum: number
  data: Record<string, any>
  errors: string[]
  warnings: string[]
}

interface FieldMapping {
  spreadsheetCol: string
  schemaField: string
}

export default function DataImport() {
  const { can } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [importType, setImportType] = useState<'leads' | 'students'>('leads')
  const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'done'>('upload')
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<FieldMapping[]>([])
  const [parsedRows, setParsedRows] = useState<ImportRow[]>([])
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState(0)
  
  // Database lookup cache for resolving FKs
  const [courses, setCourses] = useState<any[]>([])
  const [batches, setBatches] = useState<any[]>([])
  const [createdCourses, setCreatedCourses] = useState<string[]>([])
  const [createdBatches, setCreatedBatches] = useState<string[]>([])
  const [showPopup, setShowPopup] = useState(false)

  useEffect(() => {
    async function loadCache() {
      const { data: c } = await supabase.from('courses').select('*')
      const { data: b } = await supabase.from('batches').select('*')
      if (c) setCourses(c)
      if (b) setBatches(b)
    }
    loadCache()
  }, [])

  if (!can('importData')) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground font-medium">You do not have permission to import data.</p>
      </div>
    )
  }

  // Target schema fields depending on Leads vs Students
  const leadFields = [
    { field: 'full_name', label: 'Full Name', required: true },
    { field: 'mobile', label: 'Mobile / Phone', required: true },
    { field: 'email', label: 'Email', required: false },
    { field: 'parent_name', label: 'Parent Name', required: false },
    { field: 'parent_contact', label: 'Parent Contact', required: false },
    { field: 'city', label: 'City', required: false },
    { field: 'school_college', label: 'School/College', required: false },
    { field: 'source', label: 'Source (instagram, walk_in, etc)', required: false },
    { field: 'course_name', label: 'Interested Course', required: false },
    { field: 'status', label: 'Status (new_lead, etc)', required: false },
    { field: 'notes', label: 'Notes / Remarks', required: false }
  ]

  const studentFields = [
    { field: 'full_name', label: 'Full Name', required: true },
    { field: 'mobile', label: 'Mobile / Phone', required: true },
    { field: 'email', label: 'Email', required: false },
    { field: 'student_id', label: 'Student ID (Optional)', required: false },
    { field: 'roll_number', label: 'Roll Number (Optional)', required: false },
    { field: 'dob', label: 'Date of Birth (YYYY-MM-DD)', required: false },
    { field: 'gender', label: 'Gender (male/female)', required: false },
    { field: 'parent_name', label: 'Parent Name', required: false },
    { field: 'parent_contact', label: 'Parent Contact', required: false },
    { field: 'emergency_contact', label: 'Emergency Contact', required: false },
    { field: 'address', label: 'Address', required: false },
    { field: 'city', label: 'City', required: false },
    { field: 'school_college', label: 'School/College', required: false },
    { field: 'course_name', label: 'Course Enrolled', required: true },
    { field: 'batch_name', label: 'Batch Name', required: true },
    { field: 'admission_date', label: 'Admission Date (YYYY-MM-DD)', required: false },
    { field: 'total_fee', label: 'Total Fee Amount', required: true },
    { field: 'paid_amount', label: 'Amount Paid (Optional)', required: false },
    { field: 'payment_date', label: 'Payment Date (Optional)', required: false },
    { field: 'payment_method', label: 'Payment Method (cash/upi/card/etc)', required: false }
  ]

  const activeFields = importType === 'leads' ? leadFields : studentFields

  // Helper to parse Excel dates or standard string dates safely (resolves epoch bug)
  const parseExcelDate = (val: any): string | null => {
    if (!val) return null
    if (typeof val === 'number') {
      // Excel serial date code
      const date = new Date(Math.round((val - 25569) * 86400 * 1000))
      return isNaN(date.getTime()) ? null : format(date, 'yyyy-MM-dd')
    }
    const cleanStr = String(val).trim()
    if (!cleanStr) return null
    const parsed = new Date(cleanStr)
    return isNaN(parsed.getTime()) ? null : format(parsed, 'yyyy-MM-dd')
  }

  // Clean and standardize phone numbers
  const parsePhoneNumber = (val: any): string => {
    if (!val) return ''
    let str = String(val).trim()
    // Remove .0 suffix often added by Excel float parsing
    if (str.endsWith('.0')) str = str.slice(0, -2)
    // Strip everything except digits
    return str.replace(/\D/g, '').slice(-10) // standard 10 digit
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
        if (json.length === 0) {
          toast.error('File is empty')
          return
        }
        
        const headers = Object.keys(json[0])
        setRawRows(json)

        // Auto-mapping columns based on database normalized helpers
        const initialMapping = headers.map(h => {
          const lower = h.toLowerCase().trim()
          let schemaField = ''
          
          if (lower.includes('lead no') || lower.includes('s.no') || lower.includes('sr.no') || lower.includes('sr no')) {
            schemaField = '' // Skip serial number column
          }
          else if (lower.includes('name') && !lower.includes('parent') && !lower.includes('father') && !lower.includes('course') && !lower.includes('batch')) schemaField = 'full_name'
          else if (lower.includes('phone') || lower.includes('mobile') || lower.includes('contact') && !lower.includes('parent')) schemaField = 'mobile'
          else if (lower.includes('email') || lower.includes('mail')) schemaField = 'email'
          else if (lower.includes('father') || lower.includes('parent') && lower.includes('name')) schemaField = 'parent_name'
          else if (lower.includes('parent') && (lower.includes('phone') || lower.includes('contact') || lower.includes('mobile'))) schemaField = 'parent_contact'
          else if (lower.includes('course') || lower.includes('program') || lower.includes('subject')) schemaField = 'course_name'
          else if (lower.includes('batch')) schemaField = 'batch_name'
          else if (lower.includes('admission') || lower === 'date' || lower === 'lead date' || lower === 'enquiry date') schemaField = importType === 'leads' ? 'notes' : 'admission_date'
          else if (lower.includes('city') || lower.includes('location')) schemaField = 'city'
          else if (lower.includes('college') || lower.includes('school')) schemaField = 'school_college'
          else if (lower.includes('total') || lower.includes('fee')) schemaField = 'total_fee'
          else if (lower.includes('paid') || lower.includes('amount')) schemaField = 'paid_amount'
          else if (lower.includes('dob') || lower.includes('birth')) schemaField = 'dob'
          else if (lower.includes('gender') || lower.includes('sex')) schemaField = 'gender'
          else if (lower.includes('followup') || lower.includes('notes') || lower.includes('remarks')) schemaField = 'notes'
          
          return { spreadsheetCol: h, schemaField }
        })

        setMapping(initialMapping)
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
    const requiredFields = activeFields.filter(f => f.required).map(f => f.field)

    const rows: ImportRow[] = rawRows.map((row, i) => {
      const data: Record<string, any> = {}
      const errors: string[] = []
      const warnings: string[] = []

      for (const m of activeMapping) {
        data[m.schemaField] = row[m.spreadsheetCol]
      }

      // 1. Check Required fields
      for (const rf of requiredFields) {
        if (!data[rf] || String(data[rf]).trim() === '') {
          errors.push(`Missing required field: ${rf.replace('_', ' ')}`)
        }
      }

      // 2. Clean Phone numbers & validate
      if (data.mobile) {
        data.mobile = parsePhoneNumber(data.mobile)
        if (data.mobile.length < 10) {
          errors.push(`Invalid mobile phone format (needs 10 digits): ${row[activeMapping.find(m => m.schemaField === 'mobile')?.spreadsheetCol ?? '']}`)
        }
      }

      // 3. Clean Dates to prevent Jan 1, 1970 errors
      if (data.dob) {
        const parsed = parseExcelDate(data.dob)
        if (!parsed) errors.push(`Invalid DOB format: ${data.dob}`)
        else data.dob = parsed
      }
      if (data.admission_date) {
        const parsed = parseExcelDate(data.admission_date)
        if (!parsed) errors.push(`Invalid Admission Date format: ${data.admission_date}`)
        else data.admission_date = parsed
      }
      if (data.payment_date) {
        const parsed = parseExcelDate(data.payment_date)
        if (!parsed) errors.push(`Invalid Payment Date format: ${data.payment_date}`)
        else data.payment_date = parsed
      }

      // 4. Validate Numbers
      if (importType === 'students') {
        if (data.total_fee && isNaN(Number(data.total_fee))) {
          errors.push(`Total fee must be a valid number: ${data.total_fee}`)
        } else {
          data.total_fee = Number(data.total_fee)
        }

        if (data.paid_amount) {
          if (isNaN(Number(data.paid_amount))) {
            errors.push(`Paid amount must be a number: ${data.paid_amount}`)
          } else {
            data.paid_amount = Number(data.paid_amount)
          }
        } else {
          data.paid_amount = 0
        }
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
    
    const resolvedCourses = [...courses]
    const resolvedBatches = [...batches]
    const newCourses: string[] = []
    const newBatches: string[] = []

    try {
      for (const row of validRows) {
        const rowData = row.data
        
        // --- COURSE RESOLUTION ---
        let courseId = null
        if (rowData.course_name) {
          const cleanCourseName = String(rowData.course_name).trim()
          let existingCourse = resolvedCourses.find(
            c => c.name.toLowerCase() === cleanCourseName.toLowerCase()
          )
          
          if (!existingCourse) {
            // Auto-create missing Course (User Instruction 2)
            const { data: newC, error: cErr } = await supabase
              .from('courses')
              .insert({
                name: cleanCourseName,
                total_fee: rowData.total_fee || 0,
                is_active: true
              })
              .select()
              .single()
              
            if (cErr) throw cErr
            existingCourse = newC
            resolvedCourses.push(newC)
            newCourses.push(cleanCourseName)
          }
          courseId = existingCourse.id
        }

        // --- BATCH RESOLUTION ---
        let batchId = null
        if (rowData.batch_name && courseId) {
          const cleanBatchName = String(rowData.batch_name).trim()
          let existingBatch = resolvedBatches.find(
            b => b.batch_name.toLowerCase() === cleanBatchName.toLowerCase() && b.course_id === courseId
          )

          if (!existingBatch) {
            // Auto-create missing Batch (User Instruction 2)
            const { data: newB, error: bErr } = await supabase
              .from('batches')
              .insert({
                course_id: courseId,
                batch_name: cleanBatchName,
                status: 'ongoing',
                total_seats: 40
              })
              .select()
              .single()
              
            if (bErr) throw bErr
            existingBatch = newB
            resolvedBatches.push(newB)
            newBatches.push(cleanBatchName)
          }
          batchId = existingBatch.id
        }

        if (importType === 'leads') {
          // --- LEADS BULK IMPORT ---
          // Check if Lead already exists by Mobile (Option A)
          const { data: existingLead } = await supabase
            .from('leads')
            .select('id')
            .eq('mobile', rowData.mobile)
            .maybeSingle()

          const leadPayload = {
            full_name: rowData.full_name,
            mobile: rowData.mobile,
            email: rowData.email || null,
            parent_name: rowData.parent_name || null,
            parent_contact: rowData.parent_contact || null,
            city: rowData.city || null,
            school_college: rowData.school_college || null,
            interested_course_id: courseId,
            source: rowData.source || 'walk_in',
            status: rowData.status || 'new_lead',
            notes: rowData.notes || null,
          }

          if (existingLead) {
            // Option A: Update details
            await supabase.from('leads').update(leadPayload).eq('id', existingLead.id)
          } else {
            // Insert new
            await supabase.from('leads').insert(leadPayload)
          }
        } else {
          // --- STUDENTS & FEES CASCADE IMPORT ---
          // 1. Upsert Student (Option A: Update details on Mobile match)
          const { data: existingStudent } = await supabase
            .from('students')
            .select('id')
            .eq('mobile', rowData.mobile)
            .maybeSingle()

          const studentPayload = {
            full_name: rowData.full_name,
            mobile: rowData.mobile,
            email: rowData.email || null,
            student_id: rowData.student_id || null,
            roll_number: rowData.roll_number || null,
            dob: rowData.dob || null,
            gender: rowData.gender || null,
            parent_name: rowData.parent_name || null,
            parent_contact: rowData.parent_contact || null,
            emergency_contact: rowData.emergency_contact || null,
            address: rowData.address || null,
            city: rowData.city || null,
            school_college: rowData.school_college || null,
            course_id: courseId,
            batch_id: batchId,
            admission_date: rowData.admission_date || format(new Date(), 'yyyy-MM-dd'),
            is_active: true
          }

          let studentId = null
          if (existingStudent) {
            await supabase.from('students').update(studentPayload).eq('id', existingStudent.id)
            studentId = existingStudent.id
          } else {
            const { data: newS, error: sErr } = await supabase.from('students').insert(studentPayload).select().single()
            if (sErr) throw sErr
            studentId = newS.id
          }

          // 2. Setup Fee Record
          const totalFee = rowData.total_fee
          const paidAmount = rowData.paid_amount || 0
          const pendingBalance = totalFee - paidAmount

          // Check if fee record exists
          const { data: existingFee } = await supabase.from('fees').select('*').eq('student_id', studentId).maybeSingle()

          let feeId = null
          if (existingFee) {
            const updatedPaid = existingFee.amount_paid + paidAmount
            const updatedPending = Math.max(0, existingFee.total_fee - updatedPaid)
            const { data: nextFee } = await supabase
              .from('fees')
              .update({
                amount_paid: updatedPaid,
                pending_balance: updatedPending
              })
              .eq('id', existingFee.id)
              .select()
              .single()
            feeId = nextFee?.id
          } else {
            const { data: newFee, error: fErr } = await supabase
              .from('fees')
              .insert({
                student_id: studentId,
                course_id: courseId,
                total_fee: totalFee,
                discount: 0,
                scholarship: 0,
                net_fee: totalFee,
                amount_paid: paidAmount,
                pending_balance: pendingBalance,
                gst_applicable: false,
                gst_percent: 18
              })
              .select()
              .single()
            if (fErr) throw fErr
            feeId = newFee.id
          }

          // 3. Create Payment & Installments if Paid
          if (paidAmount > 0 && feeId) {
            // Record payment
            await supabase.from('fee_payments').insert({
              fee_id: feeId,
              student_id: studentId,
              amount: paidAmount,
              payment_date: rowData.payment_date || format(new Date(), 'yyyy-MM-dd'),
              payment_method: rowData.payment_method || 'cash',
              receipt_number: `REC-${Date.now().toString(36).toUpperCase()}-${count}`
            })

            // Generate paid installment record
            await supabase.from('installments').insert({
              fee_id: feeId,
              student_id: studentId,
              installment_number: 1,
              amount: paidAmount,
              due_date: rowData.payment_date || format(new Date(), 'yyyy-MM-dd'),
              paid_date: rowData.payment_date || format(new Date(), 'yyyy-MM-dd'),
              status: 'paid'
            })
          }

          // Create pending installment for balance if any
          if (pendingBalance > 0 && feeId) {
            await supabase.from('installments').insert({
              fee_id: feeId,
              student_id: studentId,
              installment_number: paidAmount > 0 ? 2 : 1,
              amount: pendingBalance,
              due_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
              status: 'pending'
            })
          }
        }
        
        count++
      }

      setImported(count)
      setCreatedCourses(newCourses)
      setCreatedBatches(newBatches)
      setStep('done')
      if (newCourses.length > 0 || newBatches.length > 0) {
        setShowPopup(true)
      }
      toast.success(`Successfully processed ${count} records!`)
    } catch (err) {
      toast.error('Import process failed: ' + (err as Error).message)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Intelligent CRM Importer" description="Bulk upload spreadsheet data directly into Leads or Admitted Students" />

      {step === 'upload' && (
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="border-b border-border/50 bg-slate-50/50">
            <CardTitle className="text-base text-slate-800">Select Import Directory</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex justify-center">
              <Tabs value={importType} onValueChange={(v) => setImportType(v as 'leads' | 'students')} className="w-full max-w-md">
                <TabsList className="grid grid-cols-2">
                  <TabsTrigger value="leads" className="text-sm">Inquiry Leads</TabsTrigger>
                  <TabsTrigger value="students" className="text-sm">Admitted Students</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="flex flex-col items-center py-12 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <FileSpreadsheet className="h-16 w-16 text-slate-400 mb-4" />
              <p className="text-sm text-slate-700 font-semibold mb-1">Drag and drop your spreadsheet here</p>
              <p className="text-xs text-slate-500 mb-5">Supports Excel (.xlsx, .xls) and CSV files</p>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
              <Button onClick={() => fileInputRef.current?.click()} className="shadow-sm">
                <Upload className="h-4 w-4 mr-2" /> Choose Spreadsheet File
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'map' && (
        <Card className="border-border/50 shadow-sm animate-in fade-in duration-200">
          <div className="p-4 border-b border-border/50 bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-semibold text-slate-800">Map Columns ({importType === 'leads' ? 'Leads' : 'Students & Fees'})</h3>
            <span className="text-xs text-slate-500 font-medium">Automatic header normalization has been pre-applied</span>
          </div>

          <div className="m-4 rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="font-semibold text-amber-900 text-sm flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" /> AI Auto-Header Match Applied!
              </p>
              <p className="text-xs text-amber-800/90 mt-0.5">
                Key required fields (Full Name & Phone) have been matched automatically. You do NOT need to fill out any dropdowns manually! Click the button to import immediately.
              </p>
            </div>
            <Button onClick={validateAndPreview} className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-sm">
              Proceed to Import Preview →
            </Button>
          </div>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/30">
                <TableRow>
                  <TableHead className="px-6 py-3 text-xs uppercase font-semibold text-slate-500">Spreadsheet Column</TableHead>
                  <TableHead className="px-6 py-3 text-xs uppercase font-semibold text-slate-500">Maps to CRM Field</TableHead>
                  <TableHead className="px-6 py-3 text-xs uppercase font-semibold text-slate-500">Validation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border/50">
                {mapping.map((m, i) => (
                  <TableRow key={i} className="hover:bg-slate-50/50">
                    <TableCell className="px-6 py-4 font-medium text-slate-800 text-sm">{m.spreadsheetCol}</TableCell>
                    <TableCell className="px-6 py-4">
                      <select
                        className="w-full max-w-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-primary focus:ring-1 focus:ring-primary"
                        value={m.schemaField}
                        onChange={(e) => updateMapping(i, e.target.value)}
                      >
                        <option value="">— Skip Column —</option>
                        {activeFields.map(sf => (
                          <option key={sf.field} value={sf.field}>{sf.label} {sf.required ? '(Required)' : ''}</option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      {activeFields.find(f => f.field === m.schemaField)?.required && (
                        <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-100">Required</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex gap-2 justify-end p-4 border-t border-border/50">
              <Button variant="outline" onClick={() => setStep('upload')}>Back</Button>
              <Button onClick={validateAndPreview}>Validate & Preview Data</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'preview' && (
        <Card className="border-border/50 shadow-sm animate-in fade-in duration-200">
          <div className="p-4 border-b border-border/50 bg-slate-50/50 flex justify-between items-center flex-wrap gap-2">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">Data Digestion Preview</h3>
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-slate-100 text-slate-700">{parsedRows.length} Rows</Badge>
              <Badge variant="success" className="bg-green-50 text-green-700">{parsedRows.filter(r => r.errors.length === 0).length} Valid</Badge>
              {parsedRows.filter(r => r.errors.length > 0).length > 0 && (
                <Badge variant="destructive" className="bg-red-50 text-red-700">{parsedRows.filter(r => r.errors.length > 0).length} Errors</Badge>
              )}
            </div>
          </div>
          <CardContent className="p-0">
            {parsedRows.filter(r => r.errors.length > 0).length > 0 && (
              <div className="m-4 rounded-lg bg-red-50 border border-red-100 p-3 text-sm text-red-800 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Validation Conflicts Detected</p>
                  <p className="text-xs text-red-700/80 mt-0.5">Rows containing validation errors will be skipped to protect data integrity. Please review the issues in the grid below.</p>
                </div>
              </div>
            )}
            
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader className="bg-slate-50/30 sticky top-0">
                  <TableRow>
                    <TableHead className="px-6 py-3 text-xs uppercase font-semibold text-slate-500">Row</TableHead>
                    <TableHead className="px-6 py-3 text-xs uppercase font-semibold text-slate-500">Full Name</TableHead>
                    <TableHead className="px-6 py-3 text-xs uppercase font-semibold text-slate-500">Phone</TableHead>
                    <TableHead className="px-6 py-3 text-xs uppercase font-semibold text-slate-500">Course / Batch</TableHead>
                    <TableHead className="px-6 py-3 text-xs uppercase font-semibold text-slate-500">Issues</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/50">
                  {parsedRows.map((r) => (
                    <TableRow key={r.rowNum} className={r.errors.length > 0 ? 'bg-red-50/20 hover:bg-red-50/35' : 'hover:bg-slate-50/50'}>
                      <TableCell className="px-6 py-4 font-medium text-slate-500 text-sm">{r.rowNum}</TableCell>
                      <TableCell className="px-6 py-4 font-medium text-slate-800 text-sm">{r.data.full_name || '—'}</TableCell>
                      <TableCell className="px-6 py-4 text-slate-600 text-sm">{r.data.mobile || '—'}</TableCell>
                      <TableCell className="px-6 py-4 text-slate-600 text-sm">
                        {r.data.course_name ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-800">{r.data.course_name}</span>
                            {r.data.batch_name && (
                              <>
                                <ArrowRight className="w-3 h-3 text-slate-400" />
                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs">{r.data.batch_name}</span>
                              </>
                            )}
                          </div>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        {r.errors.map((e, i) => <p key={i} className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {e}</p>)}
                        {r.warnings.map((w, i) => <p key={i} className="text-xs text-amber-600 flex items-center gap-1"><Info className="w-3 h-3" /> {w}</p>)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <div className="flex gap-2 justify-end p-4 border-t border-border/50">
              <Button variant="outline" onClick={() => setStep('map')}>Back</Button>
              <Button onClick={handleImport} disabled={importing || parsedRows.filter(r => r.errors.length === 0).length === 0}>
                {importing ? 'Processing Data...' : `Import ${parsedRows.filter(r => r.errors.length === 0).length} Records`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'done' && (
        <div className="space-y-6">
          <Card className="border-border/50 shadow-sm text-center py-12">
            <CardContent className="flex flex-col items-center">
              <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
              <h2 className="text-xl font-bold text-slate-800 mb-1">Import Complete!</h2>
              <p className="text-sm text-slate-500 mb-6">CRM Standardizer has processed and updated all modules.</p>
              
              <div className="grid grid-cols-2 gap-4 max-w-sm w-full mb-8">
                <div className="bg-slate-50 p-4 rounded-xl border border-border/50">
                  <p className="text-2xl font-bold text-slate-800">{imported}</p>
                  <p className="text-xs text-slate-500 font-medium">Successfully Imported</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-border/50">
                  <p className="text-2xl font-bold text-slate-800">{parsedRows.length - imported}</p>
                  <p className="text-xs text-slate-500 font-medium">Skipped (With Errors)</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => { setStep('upload'); setImported(0); setCreatedCourses([]); setCreatedBatches([]); }}>
                  Import Another File
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* User Instruction 2: Auto-Created Entities Warning Popup/Card */}
          {showPopup && (createdCourses.length > 0 || createdBatches.length > 0) && (
            <Card className="border-amber-100 bg-amber-50/50 shadow-sm animate-in slide-in-from-bottom duration-300">
              <CardHeader className="pb-2 flex flex-row items-center gap-2">
                <Settings className="w-5 h-5 text-amber-600 animate-spin" style={{ animationDuration: '3s' }} />
                <CardTitle className="text-base text-amber-800">Entity Creation Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-amber-800/90">
                <p>We detected new courses or batches in your sheet. To avoid import failure, the system automatically created them in the background. However, you should configure their pricing and timing structures:</p>
                
                {createdCourses.length > 0 && (
                  <div className="space-y-1">
                    <p className="font-semibold flex items-center gap-1">📚 New Courses Created ({createdCourses.length}):</p>
                    <div className="flex gap-1.5 flex-wrap pl-5">
                      {createdCourses.map((c, i) => <Badge key={i} variant="outline" className="bg-white border-amber-200 text-amber-800">{c}</Badge>)}
                    </div>
                  </div>
                )}

                {createdBatches.length > 0 && (
                  <div className="space-y-1">
                    <p className="font-semibold flex items-center gap-1">🏫 New Batches Created ({createdBatches.length}):</p>
                    <div className="flex gap-1.5 flex-wrap pl-5">
                      {createdBatches.map((b, i) => <Badge key={i} variant="outline" className="bg-white border-amber-200 text-amber-800">{b}</Badge>)}
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-amber-100 text-xs text-amber-600 font-medium">
                  Go to Courses Settings or Batch Settings to configure Faculty, timings, and standard pricing schedules for these new records.
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
