import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input, Label } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  FileSpreadsheet, 
  Send, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Database, 
  AlertCircle,
  ExternalLink,
  History
} from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

interface IntakeSetting {
  id: string
  source: string
  is_enabled: boolean
  last_synced_at: string | null
}

interface IntakeRequestRecord {
  id: string
  ticket_id: string
  data_type: string
  dataset_name: string
  sheet_url: string
  priority: string
  notes: string
  status: 'pending' | 'in_progress' | 'completed'
  created_at: string
}

export default function DataImport() {
  const { session, profile, isOwner } = useAuth()
  const [settings, setSettings] = useState<IntakeSetting[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form State
  const [dataType, setDataType] = useState<string>('leads')
  const [datasetName, setDatasetName] = useState<string>('')
  const [sheetUrl, setSheetUrl] = useState<string>('')
  const [priority, setPriority] = useState<string>('standard')
  const [notes, setNotes] = useState<string>('')

  // Submission confirmation modal state
  const [submittedTicket, setSubmittedTicket] = useState<string | null>(null)

  // Recent requests stored locally in session
  const [recentRequests, setRecentRequests] = useState<IntakeRequestRecord[]>(() => {
    try {
      const saved = localStorage.getItem('kizen_sagedo_intake_requests')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    async function loadSettings() {
      setLoading(true)
      const { data, error } = await supabase.from('data_intake_settings').select('*')
      if (error) {
        // Previously the error was discarded and the panel silently rendered
        // as "no intake sources configured".
        console.error('Failed to load intake settings:', error.message)
        toast.error(`Could not load intake sources: ${error.message}`)
      } else if (data) {
        setSettings(data)
      }
      setLoading(false)
    }
    loadSettings()
  }, [])

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!datasetName.trim()) {
      toast.error('Please provide a dataset name or campaign title')
      return
    }

    setSubmitting(true)
    const ticketId = `REQ-SAGEDO-${Math.floor(1000 + Math.random() * 9000)}`

    try {
      // 1. Create a notification record for SAGEDO/Owner
      const { error: notifyError } = await supabase.from('notifications').insert({
        user_id: profile?.id,
        title: `Data Intake Request: ${dataType.toUpperCase()} (${ticketId})`,
        message: `New dataset intake requested by ${profile?.name || session?.user?.email || 'User'}: "${datasetName}". Priority: ${priority}. Notes: ${notes || 'None'}`,
        type: 'system',
        link: '/settings?tab=intake',
        record_id: ticketId,
        record_type: 'intake_request',
        is_read: false
      })
      // Previously the insert result was never checked, so a failure was
      // swallowed while the user still saw "submitted successfully".
      if (notifyError) throw notifyError

      const newRecord: IntakeRequestRecord = {
        id: crypto.randomUUID(),
        ticket_id: ticketId,
        data_type: dataType,
        dataset_name: datasetName,
        sheet_url: sheetUrl,
        priority,
        notes,
        status: 'pending',
        created_at: new Date().toISOString()
      }

      const updated = [newRecord, ...recentRequests]
      setRecentRequests(updated)
      localStorage.setItem('kizen_sagedo_intake_requests', JSON.stringify(updated))

      setSubmittedTicket(ticketId)
      setDatasetName('')
      setSheetUrl('')
      setNotes('')
      toast.success(`Request ${ticketId} submitted to SAGEDO successfully`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit intake request')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <PageHeader 
        title="Data Intake Operations" 
        description="Centralized data ingestion and pipeline integration managed by SAGEDO engineering"
      />

      {/* MANAGED OPERATIONS NOTICE */}
      <Card className="border-sky-200 bg-sky-50/50 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-sky-100 text-sky-800">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-slate-900 text-base">
                Self-Serve CSV Upload Superseded by SAGEDO Precision Ingestion
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                To guarantee zero schema corruption, prevent duplicate collisions across phone/name pairs, and preserve non-Latin scripts (Gurmukhi, Arabic, Devanagari) without character mangling, all bulk datasets are committed directly by the SAGEDO data operations engineering team.
              </p>
              <div className="pt-2 flex items-center gap-4 text-xs font-medium text-sky-900">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Complete Audit Logging
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Reversible Archive Protocol
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Verbatim Header Alignment
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* REQUEST INTAKE FORM */}
        <div className="md:col-span-2">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                Request Data Intake to SAGEDO
              </CardTitle>
              <CardDescription>
                Submit new lead sheets, student batches, or fee trackers for schema verification and live import.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitRequest} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Data Category</Label>
                    <Select value={dataType} onValueChange={setDataType}>
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="leads">Leads Pipeline (Google Sheets / XLSX)</SelectItem>
                        <SelectItem value="students">Student Master Enrollment</SelectItem>
                        <SelectItem value="fees">Fee Tracker & Installments</SelectItem>
                        <SelectItem value="campaign">Meta / Google Ads Campaign Export</SelectItem>
                        <SelectItem value="other">Other Tabular Dataset</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Priority Level</Label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard (within 24 hours)</SelectItem>
                        <SelectItem value="urgent">Urgent Live Migration (within 4 hours)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Dataset Name / Campaign Reference *</Label>
                  <Input 
                    placeholder="e.g. Q3 Chandigarh Walk-in Leads / Class 11th Fee Tracker" 
                    value={datasetName}
                    onChange={(e) => setDatasetName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Google Sheets Link / Shared Drive URL</Label>
                  <Input 
                    placeholder="https://docs.google.com/spreadsheets/d/..." 
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">Ensure permissions are set to view with link or shared with SAGEDO support.</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Special Instructions / Custom Notes</Label>
                  <textarea
                    rows={3}
                    placeholder="Specify any column header nuances, phone number splitting rules, or missing fields..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>

                <Button type="submit" disabled={submitting} className="w-full h-11 font-semibold gap-2">
                  <Send className="h-4 w-4" />
                  {submitting ? 'Submitting Request to SAGEDO...' : 'Submit Request to SAGEDO'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* SIDEBAR: INTAKE CHANNELS & SYSTEM STATUS */}
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Database className="h-4 w-4 text-slate-500" />
                Intake Sources Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {settings.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-1.5 border-b last:border-0 border-slate-100 text-xs">
                  <span className="capitalize font-medium text-slate-700">
                    {s.source.replace('_', ' ')}
                  </span>
                  <Badge variant={s.is_enabled ? 'success' : 'secondary'} className="text-[10px] uppercase">
                    {s.is_enabled ? 'Active' : 'Standby'}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <History className="h-4 w-4 text-slate-500" />
                Latest Verified Ingestions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex items-center justify-between font-semibold text-slate-900">
                  <span>Google Sheets live sync</span>
                  <Badge variant="success" className="text-[10px]">Active</Badge>
                </div>
                <p className="text-slate-500 text-[11px]">
                  Row counts are recorded per run in the Intake Audit Log.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex items-center justify-between font-semibold text-slate-900">
                  <span>Ad / WhatsApp webhooks</span>
                  <Badge variant="secondary" className="text-[10px]">Standby</Badge>
                </div>
                <p className="text-slate-500 text-[11px]">
                  Inactive until platform API credentials are configured.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* RECENT REQUESTS TABLE */}
      {recentRequests.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-500" />
              Your Recent Intake Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                  <tr>
                    <th className="py-2.5 px-3">Ticket ID</th>
                    <th className="py-2.5 px-3">Dataset Name</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Priority</th>
                    <th className="py-2.5 px-3">Submitted</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentRequests.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-mono font-bold text-sky-700">{r.ticket_id}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">{r.dataset_name}</td>
                      <td className="py-2.5 px-3 capitalize">{r.data_type}</td>
                      <td className="py-2.5 px-3 capitalize">
                        <span className={r.priority === 'urgent' ? 'text-rose-600 font-semibold' : 'text-slate-600'}>
                          {r.priority}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">{format(new Date(r.created_at), 'dd MMM, HH:mm')}</td>
                      <td className="py-2.5 px-3">
                        <Badge variant="warning" className="text-[10px]">Queued (SAGEDO)</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
