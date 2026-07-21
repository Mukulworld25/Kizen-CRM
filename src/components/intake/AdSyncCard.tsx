import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Megaphone, Lock, AlertCircle } from 'lucide-react'

export interface AdSyncConn {
  id: string
  platform: 'meta' | 'google_ads'
  account_id: string | null
  access_token: string | null
  is_active: boolean
  last_synced_at: string | null
  sync_status: 'not_connected' | 'pending_approval' | 'active' | 'error'
}

export function AdSyncCard() {
  const [connections, setConnections] = useState<AdSyncConn[]>([])

  const fetchConnections = async () => {
    const { data } = await supabase.from('ad_sync_connections').select('*')
    setConnections(data || [])
  }

  useEffect(() => {
    fetchConnections()
  }, [])

  const platforms = [
    {
      key: 'meta' as const,
      title: 'Meta Ads Lead Sync (Facebook / Instagram)',
      desc: 'Direct auto-intake from Meta Lead Ad Forms into Kizen leads table.',
    },
    {
      key: 'google_ads' as const,
      title: 'Google Ads Campaign Lead Forms',
      desc: 'Direct auto-intake from Google Ads Search Lead Extensions.',
    },
  ]

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 border-b border-border/50">
        <CardTitle className="text-base flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-primary" />
          Ad Campaign Lead Sync Scaffolding
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {platforms.map((p) => {
          const conn = connections.find((c) => c.platform === p.key)
          const statusText = conn?.sync_status ? conn.sync_status.replace('_', ' ') : 'pending approval'

          return (
            <div key={p.key} className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-card/50 opacity-90">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 mt-0.5">
                  <Lock className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{p.title}</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-800 border border-amber-500/20 font-mono capitalize">
                      {statusText}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch disabled checked={conn?.is_active || false} />
              </div>
            </div>
          )
        })}

        <div className="p-3 rounded-xl bg-muted/30 border border-border text-xs text-muted-foreground flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
          <span>
            Intake pipeline scaffolding is fully wired in Edge Functions. Once Meta/Google developer tokens approve, populate credentials to activate.
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
