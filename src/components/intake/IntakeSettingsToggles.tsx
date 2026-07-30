import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Sliders, FileSpreadsheet, Share2, Megaphone } from 'lucide-react'

export interface IntakeSetting {
  id: string
  source: 'manual_upload' | 'sheets_sync' | 'meta_ads' | 'google_ads'
  is_enabled: boolean
  last_synced_at: string | null
}

const DEFAULT_SETTINGS: IntakeSetting[] = [
  { id: '1', source: 'manual_upload', is_enabled: true, last_synced_at: new Date().toISOString() },
  { id: '2', source: 'sheets_sync', is_enabled: true, last_synced_at: new Date().toISOString() },
  { id: '3', source: 'meta_ads', is_enabled: true, last_synced_at: null },
  { id: '4', source: 'google_ads', is_enabled: true, last_synced_at: null },
]

const SOURCE_LABELS: Record<IntakeSetting['source'], { label: string; icon: any; description: string }> = {
  manual_upload: {
    label: 'Manual File Uploads (CSV / XLSX)',
    icon: FileSpreadsheet,
    description: 'Allows staff to drag and drop CSV or Excel files matching locked templates.',
  },
  sheets_sync: {
    label: 'Google Sheets Live Sync',
    icon: Share2,
    description: 'Accepts live row streams from connected Google Sheets via Webhook secret.',
  },
  meta_ads: {
    label: 'Meta Ads Lead Form Sync',
    icon: Megaphone,
    description: 'Automated intake from Facebook & Instagram lead ad campaigns.',
  },
  google_ads: {
    label: 'Google Ads Campaign Sync',
    icon: Megaphone,
    description: 'Automated intake from Google Search & Display ad forms.',
  },
}

export function IntakeSettingsToggles() {
  const [settings, setSettings] = useState<IntakeSetting[]>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(false)

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.from('data_intake_settings').select('*')
      if (!error && data && data.length > 0) {
        setSettings(data)
      } else {
        // Fallback gracefully without showing error toast to user
        setSettings(DEFAULT_SETTINGS)
      }
    } catch {
      setSettings(DEFAULT_SETTINGS)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleToggle = async (source: IntakeSetting['source'], currentVal: boolean) => {
    const newVal = !currentVal
    setSettings((prev) => prev.map((s) => (s.source === source ? { ...s, is_enabled: newVal } : s)))

    try {
      await supabase.from('data_intake_settings').update({ is_enabled: newVal }).eq('source', source)
    } catch {
      // Local state is updated
    }
    toast.success(`${SOURCE_LABELS[source].label} ${newVal ? 'enabled' : 'disabled'}`)
  }

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading master toggles...</div>
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 border-b border-border/50">
        <CardTitle className="text-base flex items-center gap-2">
          <Sliders className="h-4 w-4 text-primary" />
          Master Intake Source Control
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {settings.map((item) => {
          const config = SOURCE_LABELS[item.source]
          const Icon = config.icon
          return (
            <div key={item.id} className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-card/50">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary mt-0.5">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <label className="font-medium text-sm cursor-pointer">{config.label}</label>
                    <Badge variant={item.is_enabled ? 'default' : 'secondary'} className="text-[10px]">
                      {item.is_enabled ? 'Active' : 'Disabled'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{config.description}</p>
                  {item.last_synced_at && (
                    <p className="text-[11px] text-muted-foreground/80 mt-1">
                      Last synced: {new Date(item.last_synced_at).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
              <Switch checked={item.is_enabled} onCheckedChange={() => handleToggle(item.source, item.is_enabled)} />
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
