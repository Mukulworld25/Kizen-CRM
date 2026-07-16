import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useDashboardStats, useFollowUps, useDashboardInsights, useExpenses } from '@/hooks/useStudents'
import { useBdmDashboardStats } from '@/hooks/useInstitutions'
import { StatsCard } from '@/components/shared/StatsCard'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'

import {
  Users, TrendingUp, GraduationCap, IndianRupee,
  AlertTriangle, Clock, Target,
  Building2, CalendarRange, Handshake, Thermometer,
  ArrowUpRight, ArrowDownRight, MoreHorizontal,
  Zap, Award, CalendarDays, Settings2,
  DollarSign, Activity,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

/* ── Widget Registry ── */
interface WidgetDef {
  key: string
  label: string
  defaultVisible: boolean
  defaultPosition: number
}

const ALL_WIDGETS: WidgetDef[] = [
  { key: 'revenue_collected', label: 'Revenue Collected', defaultVisible: true, defaultPosition: 0 },
  { key: 'admissions_goal', label: 'Admissions vs Goal', defaultVisible: true, defaultPosition: 1 },
  { key: 'conversion_rate', label: 'Conversion Rate', defaultVisible: true, defaultPosition: 2 },
  { key: 'pipeline_chart', label: 'Pipeline Stages', defaultVisible: true, defaultPosition: 3 },
  { key: 'cash_expense', label: 'Cash / Expense Snapshot', defaultVisible: true, defaultPosition: 4 },
  { key: 'cold_leads', label: 'Cold Leads', defaultVisible: true, defaultPosition: 5 },
  { key: 'overdue_followups', label: 'Overdue Follow-ups', defaultVisible: true, defaultPosition: 6 },
  { key: 'overdue_fees', label: 'Overdue Fees', defaultVisible: true, defaultPosition: 7 },
  { key: 'batch_capacity', label: 'Batch Capacity', defaultVisible: true, defaultPosition: 8 },
  { key: 'cycle_countdown', label: 'Admissions Cycle Countdown', defaultVisible: false, defaultPosition: 9 },
  { key: 'lead_sources', label: 'Lead Sources Chart', defaultVisible: false, defaultPosition: 10 },
  { key: 'today_followups', label: "Today's Follow-ups", defaultVisible: false, defaultPosition: 11 },
  { key: 'insight_alerts', label: 'Insight Alerts', defaultVisible: false, defaultPosition: 12 },
]

/* ── Count-up hook ── */
function useCountUp(target: number, duration = 1400, delay = 0, trigger = true) {
  const [value, setValue] = useState(0)
  const raf = useRef<number | null>(null)

  useEffect(() => {
    if (!trigger) return
    let start: number | null = null
    const timeout = setTimeout(() => {
      const step = (ts: number) => {
        if (!start) start = ts
        const elapsed = ts - start
        const progress = Math.min(elapsed / duration, 1)
        const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
        setValue(Math.round(ease * target))
        if (progress < 1) raf.current = requestAnimationFrame(step)
      }
      raf.current = requestAnimationFrame(step)
    }, delay)
    return () => { clearTimeout(timeout); if (raf.current) cancelAnimationFrame(raf.current) }
  }, [target, duration, delay, trigger])

  return value
}

/* ── Live badge ── */
function LiveBadge() {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.22)' }}>
      <span className="relative flex w-2 h-2">
        <span className="animate-live-ring absolute inline-flex h-full w-full rounded-full bg-green-400" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
      </span>
      <span className="text-[11px] font-bold text-green-400 tracking-wide">Live</span>
    </div>
  )
}

/* ── KPI card ── */
function KPICard({ label, value, display, delta, up, icon: Icon, accent, bg, idx, mounted }: {
  label: string; value: number; display: (v: number) => string; delta: string; up: boolean
  icon: React.ElementType; accent: string; bg: string; idx: number; mounted: boolean
}) {
  const counted = useCountUp(value, 1300, idx * 160, mounted)

  return (
    <div className="glass-card rounded-2xl p-5 cursor-default animate-card-in"
      style={{ animationDelay: `${idx * 80}ms`, background: bg }}
      onMouseEnter={(e) => { const el = e.currentTarget; el.style.transform = 'translateY(-4px) scale(1.015)'; el.style.boxShadow = `0 16px 48px ${accent}28, 0 4px 12px ${accent}14` }}
      onMouseLeave={(e) => { const el = e.currentTarget; el.style.transform = ''; el.style.boxShadow = '' }}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${accent}1A` }}>
          <Icon style={{ width: 17, height: 17, color: accent }} />
        </div>
        <span className="flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full"
          style={up ? { background: 'rgba(34,197,94,0.12)', color: '#22c55e' } : { background: 'rgba(239,83,80,0.12)', color: '#ef5350' }}>
          {up ? <ArrowUpRight style={{ width: 10, height: 10 }} /> : <ArrowDownRight style={{ width: 10, height: 10 }} />}
          {delta}
        </span>
      </div>
      <p className="text-2xl font-extrabold tracking-tight mb-0.5 tabular-nums" style={{ color: 'var(--foreground)' }}>
        {display(counted)}
      </p>
      <p className="text-xs font-semibold" style={{ color: accent }}>{label}</p>
    </div>
  )
}

/* ── Skeleton KPI ── */
function SkeletonKPI() {
  return (
    <div className="glass-card rounded-2xl p-5 space-y-3">
      <div className="flex items-start justify-between"><div className="skeleton w-9 h-9 rounded-xl" /><div className="skeleton w-14 h-5 rounded-full" /></div>
      <div className="skeleton w-24 h-8 rounded-md" />
      <div className="skeleton w-20 h-3.5 rounded" />
      <div className="skeleton w-28 h-3 rounded" />
    </div>
  )
}

/* ── Cycle countdown ── */
const milestones = [
  { pct: 20, label: 'Apps Open', done: true },
  { pct: 42, label: 'Early Bird', done: true },
  { pct: 63, label: 'Now', done: false, current: true },
  { pct: 80, label: 'Final Push', done: false },
  { pct: 100, label: 'Batch Closes', done: false },
]

function CycleCountdown({ enrolled = 0, goal = 500 }: { enrolled?: number; goal?: number }) {
  const pct = Math.min(100, Math.round((enrolled / goal) * 100))
  return (
    <div className="glass-card rounded-2xl p-4 animate-card-in" style={{ animationDelay: '380ms' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CalendarDays style={{ width: 14, height: 14, color: 'var(--kizen-gold)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>Admissions Cycle 2026</span>
        </div>
        <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--kizen-gold)' }}>{pct}% of goal</span>
      </div>
      <div className="relative">
        <div className="h-2 rounded-full overflow-visible relative" style={{ background: 'var(--muted)' }}>
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #C8871A 0%, #F5A623 60%, #FFC84A 100%)', transition: 'width 1.4s cubic-bezier(0.16,1,0.3,1)', boxShadow: '0 0 8px rgba(245,166,35,0.40)' }} />
          {milestones.map((m, i) => (
            <div key={i} className="absolute top-1/2 animate-milestone-pop" style={{ left: `${m.pct}%`, transform: 'translate(-50%, -50%)', animationDelay: `${900 + i * 100}ms` }}>
              <div className="w-3 h-3 rotate-45 border-2" style={{ background: m.current ? 'var(--kizen-gold)' : m.done ? 'var(--kizen-gold-dim)' : 'var(--muted)', borderColor: m.current ? 'var(--kizen-gold-hi)' : m.done ? 'var(--kizen-gold)' : 'var(--border)', boxShadow: m.current ? '0 0 8px rgba(245,166,35,0.60)' : 'none' }} />
            </div>
          ))}
        </div>
        <div className="relative h-5 mt-1">
          {milestones.map((m, i) => (
            <span key={i} className="absolute text-[9px] font-medium -translate-x-1/2 animate-milestone-pop" style={{ left: `${m.pct}%`, color: m.current ? 'var(--kizen-gold)' : m.done ? 'var(--muted-foreground)' : 'var(--muted-foreground)', opacity: m.current ? 1 : 0.65, animationDelay: `${1000 + i * 100}ms`, whiteSpace: 'nowrap' }}>{m.label}</span>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}><span className="tabular-nums font-bold" style={{ color: 'var(--foreground)' }}>{enrolled}</span><span className="mx-1">/</span><span className="tabular-nums">{goal}</span><span className="ml-1">enrolled</span></span>
      </div>
    </div>
  )
}

/* ── Dashboard Preferences Hook ── */
function useDashboardPreferences(userId: string | undefined) {
  const [prefs, setPrefs] = useState<Record<string, { visible: boolean; position: number }>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    supabase
      .from('dashboard_preferences')
      .select('widget_key, visible, position')
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          const map: Record<string, { visible: boolean; position: number }> = {}
          for (const row of data) {
            map[row.widget_key] = { visible: row.visible, position: row.position }
          }
          setPrefs(map)
        } else {
          // Use defaults
          const map: Record<string, { visible: boolean; position: number }> = {}
          for (const w of ALL_WIDGETS) {
            map[w.key] = { visible: w.defaultVisible, position: w.defaultPosition }
          }
          setPrefs(map)
        }
        setLoading(false)
      })
  }, [userId])

  const savePrefs = useCallback(async (newPrefs: Record<string, { visible: boolean; position: number }>) => {
    if (!userId) return
    const rows = Object.entries(newPrefs).map(([widget_key, p]) => ({
      user_id: userId,
      widget_key,
      visible: p.visible,
      position: p.position,
    }))
    // Upsert all
    const { error } = await supabase.from('dashboard_preferences').upsert(rows, {
      onConflict: 'user_id,widget_key',
      ignoreDuplicates: false,
    })
    if (error) console.error('Failed to save dashboard prefs', error)
    else setPrefs(newPrefs)
  }, [userId])

  return { prefs, loading, savePrefs }
}

/* ── Owner Dashboard (new priority layout) ── */
function OwnerDashboard() {
  const { data: stats, isLoading } = useDashboardStats()
  const { data: insights } = useDashboardInsights()
  const { data: expenses = [] } = useExpenses()
  const { data: todayFollowUps = [] } = useFollowUps('today')
  const { profile } = useAuth()
  const [editOpen, setEditOpen] = useState(false)
  const [widgetPrefs, setWidgetPrefs] = useState<Record<string, { visible: boolean; position: number }>>({})
  const [dirtyPrefs, setDirtyPrefs] = useState(false)

  const { prefs, loading: prefsLoading, savePrefs } = useDashboardPreferences(profile?.id)

  useEffect(() => {
    if (!prefsLoading && Object.keys(prefs).length > 0) {
      setWidgetPrefs(JSON.parse(JSON.stringify(prefs)))
    }
  }, [prefs, prefsLoading])

  // Computed values
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const revenue = stats?.revenue ?? 0
  const admissions = stats?.admissionsMonth ?? 0
  const admissionsGoal = 500
  const conversionRate = stats?.totalLeads ? Math.round((admissions / stats.totalLeads) * 100) : 0
  const overdueFus = stats?.followUpsOverdue ?? 0
  const coldLeads = insights?.coldLeads ?? 0
  const overdueInstallments = insights?.overdueInstallments ?? 0
  const fullBatches = insights?.fullBatches ?? []

  // Pipeline stages data
  const pipelineData = [
    { name: 'New', value: Math.round((stats?.totalLeads ?? 0) * 0.3) },
    { name: 'Contacted', value: Math.round((stats?.totalLeads ?? 0) * 0.25) },
    { name: 'Demo', value: Math.round((stats?.totalLeads ?? 0) * 0.2) },
    { name: 'Negotiation', value: Math.round((stats?.totalLeads ?? 0) * 0.15) },
    { name: 'Converted', value: admissions },
  ]

  // Sort widgets by position
  const visibleWidgets = ALL_WIDGETS
    .filter(w => widgetPrefs[w.key]?.visible !== false)
    .sort((a, b) => (widgetPrefs[a.key]?.position ?? a.defaultPosition) - (widgetPrefs[b.key]?.position ?? b.defaultPosition))

  const handleToggleWidget = (key: string, visible: boolean) => {
    setWidgetPrefs(prev => ({
      ...prev,
      [key]: { ...prev[key], visible },
    }))
    setDirtyPrefs(true)
  }

  const handleMoveUp = (key: string) => {
    const sorted = ALL_WIDGETS
      .filter(w => widgetPrefs[w.key]?.visible !== false)
      .sort((a, b) => (widgetPrefs[a.key]?.position ?? a.defaultPosition) - (widgetPrefs[b.key]?.position ?? b.defaultPosition))
    const idx = sorted.findIndex(w => w.key === key)
    if (idx <= 0) return
    const prevKey = sorted[idx - 1].key
    setWidgetPrefs(prev => {
      const curPos = prev[key]?.position ?? 0
      const prevPos = prev[prevKey]?.position ?? 0
      return {
        ...prev,
        [key]: { ...prev[key], position: prevPos },
        [prevKey]: { ...prev[prevKey], position: curPos },
      }
    })
    setDirtyPrefs(true)
  }

  const handleMoveDown = (key: string) => {
    const sorted = ALL_WIDGETS
      .filter(w => widgetPrefs[w.key]?.visible !== false)
      .sort((a, b) => (widgetPrefs[a.key]?.position ?? a.defaultPosition) - (widgetPrefs[b.key]?.position ?? b.defaultPosition))
    const idx = sorted.findIndex(w => w.key === key)
    if (idx < 0 || idx >= sorted.length - 1) return
    const nextKey = sorted[idx + 1].key
    setWidgetPrefs(prev => {
      const curPos = prev[key]?.position ?? 0
      const nextPos = prev[nextKey]?.position ?? 0
      return {
        ...prev,
        [key]: { ...prev[key], position: nextPos },
        [nextKey]: { ...prev[nextKey], position: curPos },
      }
    })
    setDirtyPrefs(true)
  }

  const handleSavePrefs = () => {
    savePrefs(widgetPrefs)
    setEditOpen(false)
    setDirtyPrefs(false)
  }

  const renderWidget = (widgetKey: string) => {
    switch (widgetKey) {
      case 'revenue_collected':
        return (
          <div className="glass-card rounded-2xl p-5 animate-card-in">
            <div className="flex items-center gap-2 mb-3">
              <IndianRupee style={{ width: 16, height: 16, color: 'var(--kizen-gold)' }} />
              <span className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>Revenue Collected</span>
            </div>
            <p className="text-2xl font-extrabold tracking-tight tabular-nums" style={{ color: 'var(--foreground)' }}>
              {formatCurrency(revenue)}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>Total revenue from all fees</p>
          </div>
        )
      case 'admissions_goal':
        return (
          <div className="glass-card rounded-2xl p-5 animate-card-in">
            <div className="flex items-center gap-2 mb-3">
              <Target style={{ width: 16, height: 16, color: 'var(--kizen-gold)' }} />
              <span className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>Admissions vs Goal</span>
            </div>
            <p className="text-2xl font-extrabold tracking-tight tabular-nums" style={{ color: 'var(--foreground)' }}>
              {admissions}<span className="text-lg font-normal" style={{ color: 'var(--muted-foreground)' }}>/{admissionsGoal}</span>
            </p>
            <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ background: 'var(--muted)' }}>
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, (admissions / admissionsGoal) * 100)}%`, background: 'linear-gradient(90deg, #C8871A, #F5A623)', transition: 'width 1s' }} />
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>{Math.round((admissions / admissionsGoal) * 100)}% of goal reached</p>
          </div>
        )
      case 'conversion_rate':
        return (
          <div className="glass-card rounded-2xl p-5 animate-card-in">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp style={{ width: 16, height: 16, color: 'var(--kizen-gold)' }} />
              <span className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>Conversion Rate</span>
            </div>
            <p className="text-2xl font-extrabold tracking-tight tabular-nums" style={{ color: 'var(--foreground)' }}>
              {conversionRate}%
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>Leads → Admissions this month</p>
          </div>
        )
      case 'pipeline_chart':
        return (
          <div className="glass-card rounded-2xl p-5 animate-card-in">
            <div className="flex items-center gap-2 mb-3">
              <Activity style={{ width: 16, height: 16, color: 'var(--kizen-gold)' }} />
              <span className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>Pipeline Stages</span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={pipelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" opacity={0.1} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#7A90B0' }} />
                <YAxis tick={{ fontSize: 10, fill: '#7A90B0' }} />
                <Tooltip contentStyle={{ borderRadius: '12px', background: 'var(--popover)', border: '1px solid var(--border)' }} />
                <Bar dataKey="value" fill="#F5A623" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )
      case 'cash_expense':
        return (
          <div className="glass-card rounded-2xl p-5 animate-card-in">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign style={{ width: 16, height: 16, color: 'var(--kizen-gold)' }} />
              <span className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>Cash / Expense Snapshot</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Revenue In</p>
                <p className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>{formatCurrency(revenue)}</p>
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Expenses Out</p>
                <p className="text-lg font-bold" style={{ color: '#ef5350' }}>{formatCurrency(totalExpenses)}</p>
              </div>
            </div>
            <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Net</p>
              <p className="text-lg font-bold" style={{ color: revenue >= totalExpenses ? '#22c55e' : '#ef5350' }}>
                {formatCurrency(revenue - totalExpenses)}
              </p>
            </div>
          </div>
        )
      case 'cold_leads':
        return (
          <StatsCard title="Cold Leads (5d no activity)" value={coldLeads} icon={Thermometer} color="bg-accent" loading={isLoading} alert={coldLeads > 0} />
        )
      case 'overdue_followups':
        return (
          <StatsCard title="Overdue Follow-ups" value={overdueFus} icon={Clock} color="bg-destructive" loading={isLoading} alert={overdueFus > 0} />
        )
      case 'overdue_fees':
        return (
          <StatsCard title="Overdue Installments" value={overdueInstallments} icon={AlertTriangle} color="bg-destructive" loading={isLoading} alert={overdueInstallments > 0} />
        )
      case 'batch_capacity':
        return (
          <StatsCard title="Batches >= 90% Capacity" value={fullBatches.length} icon={GraduationCap} color="bg-accent" loading={isLoading} />
        )
      case 'cycle_countdown':
        return <CycleCountdown enrolled={admissions} goal={admissionsGoal} />
      case 'lead_sources':
        return (
          <div className="xl:col-span-2 glass-card rounded-2xl overflow-hidden animate-card-in" style={{ animationDelay: '320ms' }}>
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2">
                <Award style={{ width: 13, height: 13, color: 'var(--kizen-gold)' }} />
                <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Lead Sources</h2>
              </div>
            </div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats?.sourceBreakdown ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" opacity={0.1} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#7A90B0' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#7A90B0' }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', background: 'var(--popover)', border: '1px solid var(--border)' }} />
                  <Bar dataKey="value" fill="#F5A623" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )
      case 'today_followups':
        return (
          <div className="glass-card rounded-2xl overflow-hidden animate-card-in" style={{ animationDelay: '260ms' }}>
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2">
                <Zap style={{ width: 13, height: 13, color: 'var(--kizen-gold)' }} />
                <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Today's Follow-ups</h2>
              </div>
            </div>
            {todayFollowUps.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Clock style={{ width: 30, height: 30, color: 'var(--muted-foreground)', opacity: 0.3 }} />
                <p className="text-sm mt-3" style={{ color: 'var(--muted-foreground)' }}>All caught up!</p>
                <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)', opacity: 0.5 }}>No follow-ups scheduled for today.</p>
              </div>
            ) : (
              <ul>
                {todayFollowUps.slice(0, 8).map((fu, i) => (
                  <li key={fu.id} className="flex items-center gap-3 px-5 py-2.5 cursor-pointer group transition-colors hover:bg-[rgba(245,166,35,0.04)] animate-card-in"
                    style={{ borderBottom: i < Math.min(todayFollowUps.length, 8) - 1 ? '1px solid var(--border)' : 'none', animationDelay: `${320 + i * 55}ms` }}>
                    <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
                      style={{ background: 'linear-gradient(135deg, #1C2D4E 0%, #243d6e 100%)', border: '1.5px solid rgba(245,166,35,0.28)', color: 'var(--kizen-gold)' }}>
                      {fu.lead?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-semibold transition-colors group-hover:text-[var(--kizen-gold)]" style={{ color: 'var(--foreground)' }}>{fu.lead?.full_name}</span>
                      </div>
                      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{fu.type} &middot; {format(new Date(fu.scheduled_at), 'h:mm a')}</p>
                    </div>
                    <Badge variant={fu.type === 'call' ? 'default' : fu.type === 'demo' ? 'success' : 'warning'} className="capitalize">{fu.type}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      case 'insight_alerts':
        return (
          <div className="grid gap-4 sm:grid-cols-3 mb-2">
            <StatsCard title="Cold Leads (5d no activity)" value={coldLeads} icon={Thermometer} color="bg-accent" loading={isLoading} alert={coldLeads > 0} />
            <StatsCard title="Batches >= 90% Capacity" value={fullBatches.length} icon={GraduationCap} color="bg-accent" loading={isLoading} />
            <StatsCard title="Overdue Installments" value={overdueInstallments} icon={AlertTriangle} color="bg-destructive" loading={isLoading} alert={overdueInstallments > 0} />
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between animate-card-in">
        <div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>Dashboard</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{format(new Date(), 'EEEE, MMMM d')} &middot; Admissions Cycle 2026</p>
        </div>
        <div className="flex items-center gap-2">
          <LiveBadge />
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Settings2 className="h-4 w-4 mr-1" /> Edit Dashboard
          </Button>
          <button className="p-2 rounded-xl transition-colors hover:bg-[var(--muted)]" style={{ color: 'var(--muted-foreground)' }}>
            <MoreHorizontal style={{ width: 15, height: 15 }} />
          </button>
        </div>
      </div>

      {prefsLoading ? (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <SkeletonKPI key={i} />)}
        </div>
      ) : (
        <>
          {/* TOP ROW: Revenue, Admissions, Conversion, Pipeline */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {visibleWidgets.filter(w => ['revenue_collected', 'admissions_goal', 'conversion_rate', 'pipeline_chart'].includes(w.key)).map(w => (
              <div key={w.key}>{renderWidget(w.key)}</div>
            ))}
          </div>

          {/* SECOND ROW: Cash/Expense Snapshot */}
          {visibleWidgets.some(w => w.key === 'cash_expense') && (
            <div className="grid grid-cols-1 gap-3">
              {visibleWidgets.filter(w => w.key === 'cash_expense').map(w => (
                <div key={w.key}>{renderWidget(w.key)}</div>
              ))}
            </div>
          )}

          {/* THIRD ROW: Small widgets */}
          {visibleWidgets.some(w => ['cold_leads', 'overdue_followups', 'overdue_fees', 'batch_capacity'].includes(w.key)) && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {visibleWidgets.filter(w => ['cold_leads', 'overdue_followups', 'overdue_fees', 'batch_capacity'].includes(w.key)).map(w => (
                <div key={w.key}>{renderWidget(w.key)}</div>
              ))}
            </div>
          )}

          {/* Extra widgets */}
          {visibleWidgets.filter(w => !['revenue_collected', 'admissions_goal', 'conversion_rate', 'pipeline_chart', 'cash_expense', 'cold_leads', 'overdue_followups', 'overdue_fees', 'batch_capacity'].includes(w.key)).map(w => (
            <div key={w.key}>{renderWidget(w.key)}</div>
          ))}
        </>
      )}

      {/* Edit Dashboard Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Customize Dashboard</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Toggle widgets on/off and reorder them.</p>
            {ALL_WIDGETS.map((w) => (
              <div key={w.key} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: 'var(--muted)' }}>
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => handleMoveUp(w.key)} className="text-[10px] opacity-60 hover:opacity-100" style={{ color: 'var(--foreground)' }}>▲</button>
                  <button onClick={() => handleMoveDown(w.key)} className="text-[10px] opacity-60 hover:opacity-100" style={{ color: 'var(--foreground)' }}>▼</button>
                </div>
                <Switch
                  checked={widgetPrefs[w.key]?.visible !== false}
                  onCheckedChange={(checked) => handleToggleWidget(w.key, checked)}
                />
                <Label className="flex-1 cursor-pointer" onClick={() => handleToggleWidget(w.key, widgetPrefs[w.key]?.visible === false)}>
                  {w.label}
                </Label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditOpen(false); setWidgetPrefs(JSON.parse(JSON.stringify(prefs))); setDirtyPrefs(false) }}>Cancel</Button>
            <Button onClick={handleSavePrefs} disabled={!dirtyPrefs}>Save Layout</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function Dashboard() {
  const { isOwner, profile } = useAuth()
  const { data: stats, isLoading } = useDashboardStats()
  const { data: todayFollowUps = [] } = useFollowUps('today')
  const [mounted, setMounted] = useState(false)

  useEffect(() => { const t = setTimeout(() => setMounted(true), 80); return () => clearTimeout(t) }, [])

  if (isOwner) {
    return <OwnerDashboard />
  }

  if (profile?.role === 'counselor') {
    return <CounselorDashboard stats={stats} isLoading={isLoading} />
  }
  if (profile?.role === 'bdm') return <BdmDashboard />
  if (profile?.role === 'accounts') return <AccountsDashboard stats={stats} isLoading={isLoading} />
  if (profile?.role === 'reception') return <ReceptionDashboard stats={stats} isLoading={isLoading} />

  const leadsDelta = (stats?.leadsToday ?? 0) - (stats?.leadsYesterday ?? 0)
  const kpiData = [
    { label: 'Total Leads', value: stats?.totalLeads ?? 0, display: (v: number) => v.toLocaleString(), delta: leadsDelta >= 0 ? `+${leadsDelta}` : `${leadsDelta}`, up: leadsDelta >= 0, icon: Users, accent: '#F5A623', bg: 'rgba(245,166,35,0.08)' },
    { label: 'Leads Today', value: stats?.leadsToday ?? 0, display: (v: number) => v.toLocaleString(), delta: leadsDelta >= 0 ? `+${leadsDelta}` : `${leadsDelta}`, up: leadsDelta >= 0, icon: TrendingUp, accent: '#22c55e', bg: 'rgba(34,197,94,0.07)' },
    { label: 'Admissions', value: stats?.admissionsMonth ?? 0, display: (v: number) => v.toString(), delta: 'this month', up: true, icon: GraduationCap, accent: '#FFC84A', bg: 'rgba(255,200,74,0.08)' },
    { label: 'Follow-ups Due', value: stats?.followUpsDue ?? 0, display: (v: number) => v.toString(), delta: `${stats?.followUpsOverdue ?? 0} overdue`, up: (stats?.followUpsOverdue ?? 0) === 0, icon: Clock, accent: '#38bdf8', bg: 'rgba(56,189,248,0.07)' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between animate-card-in">
        <div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>Dashboard</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{format(new Date(), 'EEEE, MMMM d')} &middot; Admissions Cycle 2026</p>
        </div>
        <div className="flex items-center gap-2">
          <LiveBadge />
          <button className="p-2 rounded-xl transition-colors hover:bg-[var(--muted)]" style={{ color: 'var(--muted-foreground)' }}>
            <MoreHorizontal style={{ width: 15, height: 15 }} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {!mounted
          ? kpiData.map((_, i) => <SkeletonKPI key={i} />)
          : kpiData.map((kpi, i) => <KPICard key={kpi.label} {...kpi} idx={i} mounted={mounted} />)}
      </div>

      <CycleCountdown enrolled={stats?.admissionsMonth ?? 0} goal={500} />

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className="xl:col-span-3 glass-card rounded-2xl overflow-hidden animate-card-in" style={{ animationDelay: '260ms' }}>
          <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2">
              <Zap style={{ width: 13, height: 13, color: 'var(--kizen-gold)' }} />
              <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Today's Follow-ups</h2>
            </div>
          </div>
          {todayFollowUps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock style={{ width: 30, height: 30, color: 'var(--muted-foreground)', opacity: 0.3 }} />
              <p className="text-sm mt-3" style={{ color: 'var(--muted-foreground)' }}>All caught up!</p>
              <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)', opacity: 0.5 }}>No follow-ups scheduled for today.</p>
            </div>
          ) : (
            <ul>
              {todayFollowUps.slice(0, 8).map((fu, i) => (
                <li key={fu.id} className="flex items-center gap-3 px-5 py-2.5 cursor-pointer group transition-colors hover:bg-[rgba(245,166,35,0.04)] animate-card-in"
                  style={{ borderBottom: i < Math.min(todayFollowUps.length, 8) - 1 ? '1px solid var(--border)' : 'none', animationDelay: `${320 + i * 55}ms` }}>
                  <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
                    style={{ background: 'linear-gradient(135deg, #1C2D4E 0%, #243d6e 100%)', border: '1.5px solid rgba(245,166,35,0.28)', color: 'var(--kizen-gold)' }}>
                    {fu.lead?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-semibold transition-colors group-hover:text-[var(--kizen-gold)]" style={{ color: 'var(--foreground)' }}>{fu.lead?.full_name}</span>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{fu.type} &middot; {format(new Date(fu.scheduled_at), 'h:mm a')}</p>
                  </div>
                  <Badge variant={fu.type === 'call' ? 'default' : fu.type === 'demo' ? 'success' : 'warning'} className="capitalize">{fu.type}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="xl:col-span-2 glass-card rounded-2xl overflow-hidden animate-card-in" style={{ animationDelay: '320ms' }}>
          <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2">
              <Award style={{ width: 13, height: 13, color: 'var(--kizen-gold)' }} />
              <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Lead Sources</h2>
            </div>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats?.sourceBreakdown ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" opacity={0.1} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#7A90B0' }} />
                <YAxis tick={{ fontSize: 10, fill: '#7A90B0' }} />
                <Tooltip contentStyle={{ borderRadius: '12px', background: 'var(--popover)', border: '1px solid var(--border)' }} />
                <Bar dataKey="value" fill="#F5A623" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

function BdmDashboard() {
  const { data: stats, isLoading } = useBdmDashboardStats()
  const institutions: any[] = []
  if (stats && Array.isArray(stats)) {
    institutions.push(...stats)
  }

  return (
    <div className="space-y-4">
      <div><h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>BDM Dashboard</h1><p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>Institution partnerships and MOU overview</p></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Assigned Institutions" value={stats?.totalInstitutions ?? 0} icon={Building2} loading={isLoading} />
        <StatsCard title="MOU Signed" value={stats?.signedMou ?? 0} icon={Handshake} color="bg-success" loading={isLoading} />
        <StatsCard title="In Discussion" value={stats?.inDiscussion ?? 0} icon={CalendarRange} color="bg-accent" loading={isLoading} />
        <StatsCard title="Upcoming Meetings" value={stats?.totalMeetings ?? 0} icon={Clock} color="bg-primary-light" loading={isLoading} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardContent className="p-4"><h3 className="text-sm font-semibold mb-3">MOU Status</h3><p className="text-sm text-muted-foreground">Signed: {stats?.signedMou ?? 0} | In Discussion: {stats?.inDiscussion ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><h3 className="text-sm font-semibold mb-3">Pending Follow-ups</h3><p className="text-sm text-muted-foreground">{stats?.pendingFus ?? 0} pending</p></CardContent></Card>
      </div>
    </div>
  )
}

function CounselorDashboard({ stats, isLoading }: { stats: any; isLoading: boolean }) {
  return (
    <div className="space-y-4">
      <div><h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>My Dashboard</h1><p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>Your personal pipeline overview</p></div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard title="My Leads Today" value={stats?.leadsToday ?? 0} icon={Users} loading={isLoading} />
        <StatsCard title="Follow-ups Due" value={stats?.followUpsDue ?? 0} icon={Clock} color="bg-accent" loading={isLoading} />
        <StatsCard title="Admissions This Month" value={stats?.admissionsMonth ?? 0} icon={Target} color="bg-success" loading={isLoading} />
      </div>
    </div>
  )
}

function AccountsDashboard({ stats, isLoading }: { stats: any; isLoading: boolean }) {
  return (
    <div className="space-y-4">
      <div><h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>Finance Dashboard</h1><p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>Revenue, fees, and payment overview</p></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Revenue Collected" value={formatCurrency(stats?.revenue ?? 0)} icon={IndianRupee} color="bg-success" loading={isLoading} />
        <StatsCard title="Pending Fees" value={formatCurrency(stats?.pending ?? 0)} icon={AlertTriangle} color="bg-accent" loading={isLoading} alert={(stats?.pending ?? 0) > 0} />
        <StatsCard title="Admissions This Month" value={stats?.admissionsMonth ?? 0} icon={GraduationCap} color="bg-primary-light" loading={isLoading} />
        <StatsCard title="Follow-ups Due" value={stats?.followUpsDue ?? 0} icon={Clock} color="bg-accent" loading={isLoading} />
      </div>
    </div>
  )
}

function ReceptionDashboard({ stats, isLoading }: { stats: any; isLoading: boolean }) {
  return (
    <div className="space-y-4">
      <div><h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>Front Desk Dashboard</h1><p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>Walk-in leads and today's activity</p></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard title="Leads Today" value={stats?.leadsToday ?? 0} icon={Users} loading={isLoading} />
        <StatsCard title="Leads This Week" value={stats?.leadsWeek ?? 0} icon={TrendingUp} color="bg-primary-light" loading={isLoading} />
        <StatsCard title="Follow-ups Due" value={stats?.followUpsDue ?? 0} icon={Clock} color="bg-accent" loading={isLoading} />
      </div>
    </div>
  )
}