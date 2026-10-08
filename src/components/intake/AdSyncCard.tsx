import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Megaphone, 
  Lock, 
  CheckCircle2, 
  RefreshCw, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle,
  ShieldCheck,
  FileSpreadsheet
} from 'lucide-react'

export interface AdSyncConn {
  id: string
  platform: 'meta' | 'google_ads' | 'whatsapp'
  account_id: string | null
  access_token: string | null
  is_active: boolean
  last_synced_at: string | null
  sync_status: 'not_connected' | 'pending_approval' | 'active' | 'error'
}

interface MetaDiagnostics {
  tested: boolean
  valid: boolean
  pageName?: string
  pageId?: string
  appName?: string
  appId?: string
  systemUserName?: string
  activeFormsCount?: number
  forms?: Array<{ id: string; name: string; leads_count?: number }>
  hasLeadsRetrieval: boolean
  missingPermissions: string[]
  error?: string
}

export function AdSyncCard() {
  const [connections, setConnections] = useState<AdSyncConn[]>([])
  const [loading, setLoading] = useState(false)
  const [metaDetailsOpen, setMetaDetailsOpen] = useState(true)
  const [googleDetailsOpen, setGoogleDetailsOpen] = useState(false)
  const [whatsappDetailsOpen, setWhatsappDetailsOpen] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [syncingMeta, setSyncingMeta] = useState(false)
  
  const [metaDiag, setMetaDiag] = useState<MetaDiagnostics>({
    tested: false,
    valid: false,
    hasLeadsRetrieval: false,
    missingPermissions: [],
  })

  const copyToClipboard = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(keyName)
    toast.success(`Copied ${keyName} to clipboard!`)
    setTimeout(() => setCopiedKey(null), 2500)
  }

  const runMetaDiagnostics = async (token: string) => {
    setLoading(true)
    try {
      // 1. Check /me
      const meRes = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${token}`)
      const meData = await meRes.json()

      if (meData.error) {
        setMetaDiag({
          tested: true,
          valid: false,
          hasLeadsRetrieval: false,
          missingPermissions: [],
          error: meData.error.message,
        })
        return
      }

      // 2. Check permissions edge (for user tokens)
      let hasLeadsRetrieval = false
      try {
        const permRes = await fetch(`https://graph.facebook.com/v19.0/me/permissions?access_token=${token}`)
        const permData = await permRes.json()
        const perms: string[] = (permData.data || [])
          .filter((p: any) => p.status === 'granted')
          .map((p: any) => p.permission)
        if (perms.includes('leads_retrieval')) {
          hasLeadsRetrieval = true
        }
      } catch {
        // Ignored
      }

      // 3. Check App Info
      let appName = 'Kizen CRM Integration'
      let appId = '1691860812502526'
      try {
        const appRes = await fetch(`https://graph.facebook.com/v19.0/app?access_token=${token}`)
        const appData = await appRes.json()
        if (appData.name) appName = appData.name
        if (appData.id) appId = appData.id
      } catch {
        // Ignored
      }

      // 4. Check Page Info & Lead Forms
      const pageId = '814560305083276'
      let pageName = 'Kizen Education'
      try {
        const pageRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}?fields=id,name&access_token=${token}`)
        const pageData = await pageRes.json()
        if (pageData.name) pageName = pageData.name
      } catch {
        // Ignored
      }

      let forms: any[] = []
      try {
        const formsRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}/leadgen_forms?access_token=${token}&limit=25`)
        const formsData = await formsRes.json()
        forms = formsData.data || []
      } catch {
        // Ignored
      }

      // 5. Test real lead retrieval capability on form
      if (!hasLeadsRetrieval && forms.length > 0) {
        try {
          const testLeadRes = await fetch(`https://graph.facebook.com/v19.0/${forms[0].id}/leads?access_token=${token}&limit=1`)
          const testLeadData = await testLeadRes.json()
          if (!testLeadData.error) {
            hasLeadsRetrieval = true
          }
        } catch {
          // Ignored
        }
      }

      setMetaDiag({
        tested: true,
        valid: true,
        pageName,
        pageId,
        appName,
        appId,
        systemUserName: meData.name || 'Kizen CRM sync',
        activeFormsCount: forms.length,
        forms: forms.slice(0, 8),
        hasLeadsRetrieval,
        missingPermissions: hasLeadsRetrieval ? [] : ['leads_retrieval'],
      })
    } catch (err: any) {
      setMetaDiag({
        tested: true,
        valid: false,
        hasLeadsRetrieval: false,
        missingPermissions: [],
        error: err.message || 'Network error reaching Meta API',
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchConnections = async () => {
    const { data } = await supabase.from('ad_sync_connections').select('*')
    setConnections(data || [])
    
    // If Meta connection exists with token, auto-run diagnostic
    const metaConn = (data || []).find((c) => c.platform === 'meta')
    if (metaConn?.access_token) {
      runMetaDiagnostics(metaConn.access_token)
    }
  }

  useEffect(() => {
    fetchConnections()
  }, [])

  const handleSyncMetaLeads = async () => {
    const metaConn = connections.find((c) => c.platform === 'meta')
    if (!metaConn?.access_token) {
      toast.error('No Meta access token configured.')
      return
    }

    if (!metaDiag.hasLeadsRetrieval) {
      toast.error(
        "Meta permission 'leads_retrieval' is required before lead details can be downloaded. Please tick this checkbox on your Meta System User token.",
        { duration: 6000 }
      )
      return
    }

    setSyncingMeta(true)
    try {
      toast.loading('Syncing leads from Meta Lead Ads...', { id: 'meta-sync' })
      const formsRes = await fetch(
        `https://graph.facebook.com/v19.0/${metaDiag.pageId}/leadgen_forms?access_token=${metaConn.access_token}&limit=25`
      )
      const formsData = await formsRes.json()
      const forms = formsData.data || []

      let imported = 0
      let updatedCount = 0
      for (const f of forms) {
        const leadsRes = await fetch(
          `https://graph.facebook.com/v19.0/${f.id}/leads?fields=id,created_time,field_data,platform,campaign_name&access_token=${metaConn.access_token}&limit=100`
        )
        const leadsData = await leadsRes.json()
        const leads = leadsData.data || []

        for (const l of leads) {
          const fields = l.field_data || []
          let fullName = ''
          let phone = ''
          let email = ''
          let city = ''
          let qual = ''
          let isStudent = false
          let isParent = false
          let commerce = ''

          for (const fld of fields) {
            const name = (fld.name || '').toLowerCase()
            const val = (Array.isArray(fld.values) ? fld.values[0] : fld.values) || ''
            if (name.includes('full_name') || name.includes('name')) fullName = val
            else if (name.includes('phone') || name.includes('mobile')) phone = val
            else if (name.includes('email')) email = val
            else if (name.includes('city')) city = val
            else if (name.includes('qualification')) {
              const s = val.toLowerCase()
              if (s.includes('class_12') || s.includes('12th')) qual = 'Class 12 (Commerce + Arts)'
              else if (s.includes('class_11') || s.includes('11th')) qual = 'Class 11 (Commerce)'
              else if (s.includes('b.com') || s.includes('bcom')) qual = 'B.Com'
              else if (s.includes('bba')) qual = 'BBA'
              else qual = val.replace(/_/g, ' ')
            } else if (name.includes('student') || name.includes('parent')) {
              if (val.toLowerCase().includes('student')) isStudent = true
              if (val.toLowerCase().includes('parent')) isParent = true
            } else if (name.includes('commerce')) {
              if (val.toLowerCase().includes('yes')) commerce = 'Commerce'
              else if (val.toLowerCase().includes('no')) commerce = 'Non-Commerce'
            }
          }

          const roleSuffix = isStudent ? ' (Student)' : isParent ? ' (Parent)' : ''
          const finalQual = qual || (commerce ? `${commerce}${roleSuffix}` : null)
          const platform = (l.platform || '').toLowerCase()
          const source = (platform === 'ig' || platform === 'instagram') ? 'instagram' : 'facebook'
          const leadDate = l.created_time ? new Date(l.created_time).toISOString() : new Date().toISOString()

          if (fullName && phone) {
            const cleanPhone = phone.replace(/[^0-9+]/g, '')
            const { data: existing } = await supabase
              .from('leads')
              .select('id, source, city, class_year, tap_date')
              .eq('mobile', cleanPhone)
              .maybeSingle()

            if (!existing) {
              await supabase.from('leads').insert({
                full_name: fullName,
                mobile: cleanPhone,
                email: email || null,
                source: source,
                city: city || null,
                class_year: finalQual || null,
                lead_date: leadDate,
                tap_date: leadDate,
                source_sheet: `Meta Form: ${f.name}`,
                status: 'new',
                notes: `Imported from Meta Lead Form "${f.name}" (Platform: ${source === 'instagram' ? 'Instagram' : 'Facebook'}, Lead ID: ${l.id})`,
              })
              imported++
            } else {
              const updates: any = {}
              if (!existing.city && city) updates.city = city
              if (!existing.class_year && finalQual) updates.class_year = finalQual
              if (existing.source !== source) updates.source = source
              if (!existing.tap_date) updates.tap_date = leadDate
              if (Object.keys(updates).length > 0) {
                await supabase.from('leads').update(updates).eq('id', existing.id)
                updatedCount++
              }
            }
          }
        }
      }

      await supabase
        .from('ad_sync_connections')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', metaConn.id)

      toast.success(`Successfully imported ${imported} new lead(s) from Meta Ads!`, { id: 'meta-sync' })
      fetchConnections()
    } catch (err: any) {
      toast.error(`Sync failed: ${err.message}`, { id: 'meta-sync' })
    } finally {
      setSyncingMeta(false)
    }
  }

  const metaConn = connections.find((c) => c.platform === 'meta')
  const isMetaActive = metaConn?.is_active || false

  return (
    <Card className="shadow-sm border-border/80">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-primary" />
            Ad Campaign & Channel Lead Sync
          </CardTitle>
          <Badge variant="outline" className="text-xs bg-muted/40 font-mono">
            {isMetaActive ? '1 Active Channel' : 'Ready to Connect'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        
        {/* ================= 1. META ADS ================= */}
        <div className="rounded-xl border border-border/70 bg-card p-4 transition-all">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-xl mt-0.5 ${isMetaActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                {isMetaActive ? <CheckCircle2 className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">Meta Ads Lead Sync (Facebook & Instagram)</span>
                  {isMetaActive ? (
                    <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 border-emerald-500/30 text-[11px] font-medium">
                      Connected & Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground text-[11px]">
                      Not Connected
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Direct auto-intake from Meta Instant Lead Ad Forms into Kizen CRM.
                </p>
                {metaDiag.pageName && (
                  <div className="flex items-center gap-2 mt-2 text-xs font-medium text-foreground/80">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-[11px]">
                      Page: <span className="font-semibold">{metaDiag.pageName}</span> ({metaDiag.pageId})
                    </span>
                    {metaDiag.activeFormsCount !== undefined && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px]">
                        <FileSpreadsheet className="h-3 w-3" />
                        {metaDiag.activeFormsCount} Active Lead Forms
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground"
                onClick={() => setMetaDetailsOpen(!metaDetailsOpen)}
              >
                {metaDetailsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
              <Switch checked={isMetaActive} disabled />
            </div>
          </div>

          {/* Meta Collapsible Details */}
          {metaDetailsOpen && (
            <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
              {/* Permission Alert Banner */}
              {metaDiag.tested && !metaDiag.hasLeadsRetrieval ? (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Meta Token Connected — 1 Step Required for Lead Data:</p>
                    <p className="mt-1 text-muted-foreground leading-relaxed">
                      Your token is authenticated for <strong>Kizen Education</strong>. However, Meta requires the <code className="px-1.5 py-0.5 bg-background rounded font-mono text-amber-700 dark:text-amber-300">leads_retrieval</code> permission checkbox to be enabled in Meta Business Suite to allow reading applicant names and phone numbers.
                    </p>
                    <div className="mt-2 text-[11px] bg-background/80 p-2 rounded border border-amber-500/20 space-y-1">
                      <p className="font-medium text-foreground">How to complete in Meta Business Suite (30 seconds):</p>
                      <p>1. Open <span className="font-mono font-medium">business.facebook.com/settings → Users → System Users</span>.</p>
                      <p>2. Click on <span className="font-medium">Kizen CRM sync</span> → Click <strong>Generate New Token</strong>.</p>
                      <p>3. Select App <span className="font-medium">Kizen CRM Integration</span> → Check the box for <strong>leads_retrieval</strong> → Click Generate.</p>
                    </div>
                  </div>
                </div>
              ) : metaDiag.hasLeadsRetrieval ? (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span>All Meta permissions granted (<code className="font-mono">leads_retrieval</code> active). Ready for real-time leads.</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white"
                    onClick={handleSyncMetaLeads}
                    disabled={syncingMeta}
                  >
                    {syncingMeta ? <RefreshCw className="h-3 w-3 animate-spin mr-1" /> : null}
                    Sync Leads Now
                  </Button>
                </div>
              ) : null}

              {/* Form List Preview */}
              {metaDiag.forms && metaDiag.forms.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Detected Active Campaigns & Forms:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {metaDiag.forms.map((f) => (
                      <Badge key={f.id} variant="secondary" className="text-[11px] font-normal py-0.5">
                        {f.name}
                      </Badge>
                    ))}
                    {metaDiag.activeFormsCount && metaDiag.activeFormsCount > 8 && (
                      <span className="text-[11px] text-muted-foreground self-center">
                        +{metaDiag.activeFormsCount - 8} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-1">
                <div className="text-[11px] text-muted-foreground">
                  System User: <span className="font-mono font-medium text-foreground">{metaDiag.systemUserName || 'Kizen CRM sync'}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={() => metaConn?.access_token && runMetaDiagnostics(metaConn.access_token)}
                  disabled={loading}
                >
                  <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                  Re-Check Token Status
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ================= 2. GOOGLE ADS ================= */}
        <div className="rounded-xl border border-border/70 bg-card p-4 transition-all">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-muted text-muted-foreground mt-0.5">
                <Megaphone className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">Google Ads Campaign Lead Forms</span>
                  <Badge variant="outline" className="text-[11px] text-muted-foreground">
                    Webhook Ready
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Direct intake from Google Search & Display ad lead form extensions.
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground"
              onClick={() => setGoogleDetailsOpen(!googleDetailsOpen)}
            >
              {googleDetailsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>

          {googleDetailsOpen && (
            <div className="mt-4 pt-4 border-t border-border/50 space-y-3 text-xs">
              <p className="text-muted-foreground">
                Paste these into your Google Ads Lead Form extension under <strong>Lead delivery options → Webhook integration</strong>:
              </p>

              <div className="space-y-2">
                <div>
                  <span className="text-[11px] font-medium text-muted-foreground">Webhook URL:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 p-2 rounded bg-muted/60 font-mono text-[11px] select-all truncate border border-border/40">
                      https://bumjiykhgkgmqyynwtuh.supabase.co/functions/v1/google-ads-sync
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2.5"
                      onClick={() => copyToClipboard('https://bumjiykhgkgmqyynwtuh.supabase.co/functions/v1/google-ads-sync', 'Webhook URL')}
                    >
                      {copiedKey === 'Webhook URL' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-medium text-muted-foreground">Key (Secret Key):</span>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 p-2 rounded bg-muted/60 font-mono text-[11px] select-all border border-border/40">
                      kizen_google_leads_2026_sec
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2.5"
                      onClick={() => copyToClipboard('kizen_google_leads_2026_sec', 'Key')}
                    >
                      {copiedKey === 'Key' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ================= 3. WHATSAPP ================= */}
        <div className="rounded-xl border border-border/70 bg-card p-4 transition-all">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-muted text-muted-foreground mt-0.5">
                <Megaphone className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">WhatsApp Inbound Lead Sync</span>
                  <Badge variant="outline" className="text-[11px] text-muted-foreground">
                    Webhook Ready
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Automated intake from inbound messages via AiSensy, Wati, or Interakt.
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground"
              onClick={() => setWhatsappDetailsOpen(!whatsappDetailsOpen)}
            >
              {whatsappDetailsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>

          {whatsappDetailsOpen && (
            <div className="mt-4 pt-4 border-t border-border/50 space-y-3 text-xs">
              <p className="text-muted-foreground">
                In your WhatsApp Business provider dashboard (e.g., AiSensy / Wati), go to <strong>Settings → Webhooks</strong> and paste this URL:
              </p>

              <div>
                <span className="text-[11px] font-medium text-muted-foreground">Webhook URL:</span>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 p-2 rounded bg-muted/60 font-mono text-[11px] select-all truncate border border-border/40">
                    https://bumjiykhgkgmqyynwtuh.supabase.co/functions/v1/whatsapp-lead-sync
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-2.5"
                    onClick={() => copyToClipboard('https://bumjiykhgkgmqyynwtuh.supabase.co/functions/v1/whatsapp-lead-sync', 'WhatsApp Webhook')}
                  >
                    {copiedKey === 'WhatsApp Webhook' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

      </CardContent>
    </Card>
  )
}
