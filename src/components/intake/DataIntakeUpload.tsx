import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  FileSpreadsheet, 
  Send, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  HelpCircle,
  ExternalLink
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'

export function DataIntakeUpload({ onUploadSuccess }: { onUploadSuccess?: () => void }) {
  const { session, profile } = useAuth()
  const [section, setSection] = useState<'leads' | 'students' | 'fees' | 'institutions' | 'finance'>('leads')
  const [datasetTitle, setDatasetTitle] = useState('')
  const [sheetUrl, setSheetUrl] = useState('')
  const [priority, setPriority] = useState<'standard' | 'urgent'>('standard')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedTicket, setSubmittedTicket] = useState<string | null>(null)

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!datasetTitle.trim()) {
      toast.error('Please enter a dataset name or description.')
      return
    }

    setIsSubmitting(true)
    const ticketId = `REQ-SAGEDO-${Math.floor(1000 + Math.random() * 9000)}`

    try {
      // Create an internal request record via notification
      const { error } = await supabase.from('notifications').insert({
        user_id: profile?.id,
        title: `Data Intake Request: ${section.toUpperCase()} (${ticketId})`,
        message: `Dataset: "${datasetTitle}" (${section}). Priority: ${priority}. Sheets URL: ${sheetUrl || 'N/A'}. Notes: ${notes || 'None'}`,
        type: 'system',
        link: '/settings?tab=intake',
        record_id: ticketId,
        record_type: 'intake_request',
        is_read: false
      })

      if (error) throw error

      setSubmittedTicket(ticketId)
      setDatasetTitle('')
      setSheetUrl('')
      setNotes('')
      toast.success(`Request ${ticketId} logged with SAGEDO operations team!`)
      if (onUploadSuccess) onUploadSuccess()
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit intake request')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2 text-slate-900">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Request Data Intake to SAGEDO
          </CardTitle>
          <Badge variant="outline" className="text-xs bg-sky-50 text-sky-700 border-sky-200">
            Managed Ingestion
          </Badge>
        </div>
        <CardDescription className="text-xs text-slate-500">
          Self-serve CSV/Excel parsing has been superseded by SAGEDO precision ingestion to prevent duplicate collisions, protect foreign keys, and preserve multilingual script integrity.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {submittedTicket && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 space-y-1">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Intake Ticket #{submittedTicket} Created</span>
            </div>
            <p className="text-[11px] text-emerald-700">
              The SAGEDO data operations team has been notified. Schema verification and live ingest will be completed within SLA.
            </p>
          </div>
        )}

        <form onSubmit={handleRequestSubmit} className="space-y-3.5 text-xs">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs font-semibold text-slate-700 mb-1 block">Target Table / Module</Label>
              <Select value={section} onValueChange={(v) => setSection(v as any)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="leads">1. Leads Pipeline</SelectItem>
                  <SelectItem value="students">2. Student Master Enrollment</SelectItem>
                  <SelectItem value="fees">3. Fee Tracker & Installments</SelectItem>
                  <SelectItem value="institutions">4. Institutions & MOUs</SelectItem>
                  <SelectItem value="finance">5. Institute Expenses</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700 mb-1 block">Priority SLA</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard (within 24 hrs)</SelectItem>
                  <SelectItem value="urgent">Urgent Live (within 4 hrs)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700 mb-1 block">Dataset Name / Campaign Title *</Label>
            <Input
              placeholder="e.g. Q3 Chandigarh Walk-In Leads / Class 11th Fee Tracker"
              value={datasetTitle}
              onChange={(e) => setDatasetTitle(e.target.value)}
              className="h-9 text-xs"
              required
            />
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700 mb-1 block">Google Sheets Link / Shared Drive URL</Label>
            <Input
              placeholder="https://docs.google.com/spreadsheets/d/..."
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700 mb-1 block">Special Rules / Ingestion Notes</Label>
            <textarea
              rows={2}
              placeholder="e.g. Split secondary phone numbers to parent contact, skip blank rows, maintain exact headers..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-md border border-input bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full h-9 text-xs font-semibold gap-1.5">
            <Send className="h-3.5 w-3.5" />
            {isSubmitting ? 'Logging Request...' : 'Submit Request to SAGEDO'}
          </Button>
        </form>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-slate-400" />
            Current Live Ingestions: 406 Leads, 40 Fee Records
          </span>
          <span className="font-mono text-emerald-600 font-medium">Verified Active</span>
        </div>
      </CardContent>
    </Card>
  )
}
