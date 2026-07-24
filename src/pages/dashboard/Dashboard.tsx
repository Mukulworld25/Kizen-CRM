import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useDashboardStats, useFollowUps, useDashboardInsights, useExpenses } from '@/hooks/useStudents'
import { useBdmDashboardStats } from '@/hooks/useInstitutions'
import { StatsCard } from '@/components/shared/StatsCard'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label as UiLabel } from '@/components/ui/input'
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
  DollarSign, Activity, Star, Flame, ShieldAlert, UserCheck, Compass,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

/* ── Widget Registry ── */
interface WidgetDef {
  key: string
  label: string
  defaultVisible: boolean
  defaultPosition: number
}

const ALL_WIDGETS: WidgetDef[] = [
  { key: 'risk_radar', label: '🚨 Operational Risk Radar', defaultVisible: true, defaultPosition: 0 },
  { key: 'revenue_collected', label: 'Revenue Collected', defaultVisible: true, defaultPosition: 1 },
  { key: 'admissions_goal', label: 'Admissions vs Goal', defaultVisible: true, defaultPosition: 2 },
  { key: 'conversion_rate', label: 'Conversion Rate', defaultVisible: true, defaultPosition: 3 },
  { key: 'lead_temperature', label: '🔥 Lead Temperature Heatmap', defaultVisible: true, defaultPosition: 4 },
  { key: 'course_goal_pacing', label: '🎯 Course Target Pacing', defaultVisible: true, defaultPosition: 5 },
  { key: 'pipeline_chart', label: 'Pipeline Stages', defaultVisible: true, defaultPosition: 6 },
  { key: 'counselor_leaderboard', label: '🏆 Counselor Leaderboard', defaultVisible: true, defaultPosition: 7 },
  { key: 'cash_expense', label: 'Cash / Expense Snapshot', defaultVisible: true, defaultPosition: 8 },
  { key: 'lead_sources', label: 'Lead Sources Chart', defaultVisible: true, defaultPosition: 9 },
  { key: 'today_followups', label: "Today's Follow-ups", defaultVisible: true, defaultPosition: 10 },
  { key: 'cold_leads', label: 'Cold Leads', defaultVisible: true, defaultPosition: 11 },
  { key: 'overdue_followups', label: 'Overdue Follow-ups', defaultVisible: true, defaultPosition: 12 },
  { key: 'overdue_fees', label: 'Overdue Fees', defaultVisible: true, defaultPosition: 13 },
  { key: 'batch_capacity', label: 'Batch Capacity', defaultVisible: true, defaultPosition: 14 },
  { key: 'cycle_countdown', label: 'Admissions Cycle Countdown', defaultVisible: true, defaultPosition: 15 },
  { key: 'insight_alerts', label: 'Insight Alerts', defaultVisible: false, defaultPosition: 16 },
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

/* ── Animated score ring (from original design) ── */
function ScoreRing({ score, size = 40, animate = true }: { score: number; size?: number; animate?: boolean }) {
  const r = (size - 6) / 2
  const circ = 2 * Math.PI * r
  // Cap visual fill at 100% so values > 100 show a full ring, not an overflowing arc
  const clamped = Math.min(score, 100)
  const offset = circ - (clamped / 100) * circ
  const color = score >= 85 ? '#22c55e' : score >= 70 ? '#F5A623' : '#7A90B0'

  return (
    <svg width={size} height={size} aria-label={`Score ${score}`} style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r}
        fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={3} />
      <circle
        cx={size/2} cy={size/2} r={r}
        fill="none" stroke={color} strokeWidth={3} strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={animate ? circ : offset}
        className="score-ring"
        style={{
          transition: animate ? `stroke-dashoffset 0.9s cubic-bezier(0.16,1,0.3,1) 0.1s` : 'none',
          filter: `drop-shadow(0 0 4px ${color}55)`,
        }}
        ref={(el) => {
          if (el && animate) {
            requestAnimationFrame(() => {
              el.style.strokeDashoffset = String(offset)
            })
          }
        }}
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle"
        fontSize={size * 0.26} fontWeight="700" fill={color}>
        {score}
      </text>
    </svg>
  )
}

/* ── Achievement badge (from original design) ── */
function AchievementBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold"
      style={{
        background: 'linear-gradient(100deg, #C8871A 0%, #F5A623 50%, #FFC84A 100%)',
        color: '#111D30',
      }}>
      <Star style={{ width: 8, height: 8 }} />
      {label}
    </span>
  )
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
      .eq('user_id', userId)
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          const map: Record<string, { visible: boolean; position: number }> = {}
          for (const row of data) {
            map[row.widget_key] = { visible: row.visible, position: row.position }
          }
          setPrefs(map)
        } else {
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
    const { error } = await supabase.from('dashboard_preferences').upsert(rows, {
      onConflict: 'user_id,widget_key',
      ignoreDuplicates: false,
    })
    if (error) console.error('Failed to save dashboard prefs', error)
    else setPrefs(newPrefs)
  }, [userId])

  return { prefs, loading, savePrefs }
}

/* ── Styled KPI card (high-contrast, matches mockup) ── */
interface DashboardKpiCardProps {
  title: string
  value: string | number
  icon: React.ElementType
  accent?: string
  subtitle?: React.ReactNode
  trend?: { value: string; up: boolean }
  isAlert?: boolean
  rightSlot?: React.ReactNode
}

function DashboardKpiCard({
  title,
  value,
  icon: Icon,
  accent = 'var(--kizen-gold)',
  subtitle,
  trend,
  isAlert,
  rightSlot,
}: DashboardKpiCardProps) {
  return (
    <div
      className="glass-card rounded-2xl p-5 animate-card-in flex items-start justify-between gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg relative overflow-hidden h-full"
      style={{
        border: isAlert ? '1px solid rgba(239,83,80,0.35)' : '1px solid var(--glass-border)',
        background: `linear-gradient(135deg, ${accent}26 0%, ${accent}08 100%)`,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget
        el.style.boxShadow = `0 12px 32px ${accent}15`
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget
        el.style.boxShadow = ''
      }}
    >
      <div className="flex items-start gap-4 min-w-0 flex-1 h-full">
        {/* Icon Badge */}
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${accent}1A`, border: `1px solid ${accent}33` }}
        >
          <Icon style={{ width: 22, height: 22, color: accent }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] block mb-1">
              {title}
            </span>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-3xl font-black tracking-tight text-[var(--foreground)] tabular-nums">
                {value}
              </span>
              {trend && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                  style={{
                    background: trend.up ? 'rgba(34,197,94,0.12)' : 'rgba(239,83,80,0.12)',
                    color: trend.up ? '#22c55e' : '#ef5350',
                  }}
                >
                  {trend.up ? '▲' : '▼'} {trend.value}
                </span>
              )}
            </div>
          </div>
          {subtitle && (
            <div className="mt-2 text-[11px] text-[var(--muted-foreground)] leading-relaxed font-medium">
              {subtitle}
            </div>
          )}
        </div>
      </div>
      {rightSlot && <div className="flex-shrink-0 self-center">{rightSlot}</div>}
    </div>
  )
}

/* ── Owner Dashboard ── */
function OwnerDashboard() {
  const { data: stats } = useDashboardStats()
  const { data: insights } = useDashboardInsights()
  const { data: expenses = [] } = useExpenses()
  const { data: todayFollowUps = [] } = useFollowUps('today')
  const { profile } = useAuth()
  const [editOpen, setEditOpen] = useState(false)
  const [widgetPrefs, setWidgetPrefs] = useState<Record<string, { visible: boolean; position: number }>>({})
  const [dirtyPrefs, setDirtyPrefs] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { const t = setTimeout(() => setMounted(true), 80); return () => clearTimeout(t) }, [])

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

  const handleToggleWidget = (key: string, visible: boolean) => {
    setWidgetPrefs(prev => ({ ...prev, [key]: { ...prev[key], visible } }))
    setDirtyPrefs(true)
  }

  const handleMoveUp = (key: string) => {
    const sorted = ALL_WIDGETS.filter(w => widgetPrefs[w.key]?.visible !== false)
      .sort((a, b) => (widgetPrefs[a.key]?.position ?? a.defaultPosition) - (widgetPrefs[b.key]?.position ?? b.defaultPosition))
    const idx = sorted.findIndex(w => w.key === key)
    if (idx <= 0) return
    const prevKey = sorted[idx - 1].key
    setWidgetPrefs(prev => {
      const curPos = prev[key]?.position ?? 0; const prevPos = prev[prevKey]?.position ?? 0
      return { ...prev, [key]: { ...prev[key], position: prevPos }, [prevKey]: { ...prev[prevKey], position: curPos } }
    })
    setDirtyPrefs(true)
  }

  const handleMoveDown = (key: string) => {
    const sorted = ALL_WIDGETS.filter(w => widgetPrefs[w.key]?.visible !== false)
      .sort((a, b) => (widgetPrefs[a.key]?.position ?? a.defaultPosition) - (widgetPrefs[b.key]?.position ?? b.defaultPosition))
    const idx = sorted.findIndex(w => w.key === key)
    if (idx < 0 || idx >= sorted.length - 1) return
    const nextKey = sorted[idx + 1].key
    setWidgetPrefs(prev => {
      const curPos = prev[key]?.position ?? 0; const nextPos = prev[nextKey]?.position ?? 0
      return { ...prev, [key]: { ...prev[key], position: nextPos }, [nextKey]: { ...prev[nextKey], position: curPos } }
    })
    setDirtyPrefs(true)
  }

  const handleSavePrefs = () => { savePrefs(widgetPrefs); setEditOpen(false); setDirtyPrefs(false) }

  const statusStyle: Record<string, { bg: string; color: string }> = {
    'New Lead':  { bg: 'rgba(122,144,176,0.15)', color: '#7A90B0' },
    Contacted:   { bg: 'rgba(245,166,35,0.13)',  color: '#F5A623' },
    Qualified:   { bg: 'rgba(34,197,94,0.13)',   color: '#22c55e' },
    Applied:     { bg: 'rgba(255,200,74,0.13)',  color: '#FFC84A' },
    Enrolled:    { bg: 'rgba(56,189,248,0.13)',  color: '#38bdf8' },
  }

  const renderWidget = (widgetKey: string) => {
    switch (widgetKey) {
      case 'risk_radar':
        return (
          <div className="glass-card rounded-2xl p-4 bg-gradient-to-r from-red-500/10 via-amber-500/5 to-transparent border border-red-500/20 animate-card-in">
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-red-600">Operational Risk & Alarm Radar</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-white/70 border border-border flex items-center justify-between shadow-xs">
                <div>
                  <p className="text-[11px] text-slate-500 font-semibold">Stale Leads (&gt;48h Uncontacted)</p>
                  <h4 className="text-xl font-black text-red-600 mt-0.5">342</h4>
                  <span className="text-[10px] text-red-500 font-medium">Requires Immediate Call</span>
                </div>
                <AlertTriangle className="w-6 h-6 text-red-400 opacity-80" />
              </div>
              <div className="p-3 rounded-xl bg-white/70 border border-border flex items-center justify-between shadow-xs">
                <div>
                  <p className="text-[11px] text-slate-500 font-semibold">Overdue Fee Collections</p>
                  <h4 className="text-xl font-black text-amber-600 mt-0.5">{overdueInstallments} Student Slabs</h4>
                  <span className="text-[10px] text-amber-600 font-medium">Pending Installment Action</span>
                </div>
                <IndianRupee className="w-6 h-6 text-amber-400 opacity-80" />
              </div>
              <div className="p-3 rounded-xl bg-white/70 border border-border flex items-center justify-between shadow-xs">
                <div>
                  <p className="text-[11px] text-slate-500 font-semibold">Overdue Task Items</p>
                  <h4 className="text-xl font-black text-orange-600 mt-0.5">{overdueFus} Tasks</h4>
                  <span className="text-[10px] text-orange-500 font-medium">Missed Follow-up Times</span>
                </div>
                <Clock className="w-6 h-6 text-orange-400 opacity-80" />
              </div>
              <div className="p-3 rounded-xl bg-white/70 border border-border flex items-center justify-between shadow-xs">
                <div>
                  <p className="text-[11px] text-slate-500 font-semibold">Dormant Cold Pool</p>
                  <h4 className="text-xl font-black text-slate-700 mt-0.5">{coldLeads} Leads</h4>
                  <span className="text-[10px] text-blue-600 font-medium">Ready for Campaign Broadcast</span>
                </div>
                <Thermometer className="w-6 h-6 text-slate-400 opacity-80" />
              </div>
            </div>
          </div>
        )
      case 'lead_temperature':
        const tempSummary = [
          { name: 'Hot Leads (🔥)', value: 1240, color: '#EF4444' },
          { name: 'Warm Leads (☀️)', value: 4500, color: '#F59E0B' },
          { name: 'Cold Leads (❄️)', value: 5910, color: '#3B82F6' },
        ]
        return (
          <div className="glass-card rounded-2xl p-5 animate-card-in flex flex-col h-full">
            <div className="flex items-center gap-2 mb-3">
              <Flame className="w-4 h-4 text-red-500" />
              <span className="text-xs font-semibold text-slate-700">Lead Temperature & Quality Heatmap</span>
            </div>
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie data={tempSummary} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4}>
                  {tempSummary.map((t, idx) => (
                    <Cell key={idx} fill={t.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => Number(v).toLocaleString() + ' leads'} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )
      case 'course_goal_pacing':
        const coursePacing = [
          { course: 'ACCA', enrolled: 45, target: 150, pct: 30, color: '#10B981', status: 'On Track' },
          { course: 'Class 12th Commerce', enrolled: 32, target: 100, pct: 32, color: '#3B82F6', status: 'On Track' },
          { course: 'Class 11th Commerce', enrolled: 24, target: 100, pct: 24, color: '#F59E0B', status: 'Needs Boost' },
          { course: 'CA Foundation Prep', enrolled: 12, target: 50, pct: 24, color: '#8B5CF6', status: 'Needs Boost' },
          { course: 'CUET Prep 2026', enrolled: 6, target: 50, pct: 12, color: '#EF4444', status: 'Focus Required' },
        ]
        return (
          <div className="glass-card rounded-2xl p-5 animate-card-in flex flex-col h-full">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-slate-700">Course Target Velocity Pacing</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Batch Intake 2026</span>
            </div>
            <div className="space-y-3 flex-1 flex flex-col justify-center">
              {coursePacing.map((cp) => (
                <div key={cp.course} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-800 font-semibold">{cp.course}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold" style={{ backgroundColor: `${cp.color}1A`, color: cp.color }}>
                        {cp.status}
                      </span>
                      <span className="text-slate-500 tabular-nums">{cp.enrolled} / {cp.target}</span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${cp.pct}%`, backgroundColor: cp.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      case 'counselor_leaderboard':
        const counselors = [
          { name: 'Preeti Verma', leads: 420, converted: 48, revenue: 2240000, rate: '11.4%' },
          { name: 'Aadya Sharma', leads: 380, converted: 39, revenue: 1850000, rate: '10.2%' },
          { name: 'Lakshaya Ma\'am', leads: 310, converted: 32, revenue: 1584000, rate: '10.3%' },
        ]
        return (
          <div className="glass-card rounded-2xl p-5 animate-card-in flex flex-col h-full">
            <div className="flex items-center gap-2 mb-3">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-semibold text-slate-700">Counselor Performance & Conversion Leaderboard</span>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-slate-400 font-semibold uppercase text-[10px]">
                    <th className="pb-2">Counselor</th>
                    <th className="pb-2 text-right">Leads</th>
                    <th className="pb-2 text-right">Admitted</th>
                    <th className="pb-2 text-right">Revenue</th>
                    <th className="pb-2 text-right">Conv. Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {counselors.map((c) => (
                    <tr key={c.name} className="hover:bg-slate-50/50">
                      <td className="py-2.5 font-bold text-slate-800">{c.name}</td>
                      <td className="py-2.5 text-right tabular-nums text-slate-600">{c.leads}</td>
                      <td className="py-2.5 text-right tabular-nums font-bold text-emerald-600">{c.converted}</td>
                      <td className="py-2.5 text-right tabular-nums font-semibold text-slate-700">{formatCurrency(c.revenue)}</td>
                      <td className="py-2.5 text-right">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                          {c.rate}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      case 'revenue_collected':
        return (
          <DashboardKpiCard
            title="Revenue Collected"
            value={formatCurrency(revenue)}
            icon={IndianRupee}
            accent="#22c55e"
            subtitle="Total revenue from all fees"
          />
        )
      case 'admissions_goal':
        const goalPct = Math.round((admissions / admissionsGoal) * 100)
        return (
          <DashboardKpiCard
            title="Admissions vs Goal"
            value={`${admissions}/${admissionsGoal}`}
            icon={Target}
            accent="var(--kizen-gold)"
            subtitle={
              <div className="mt-1">
                <div className="flex justify-between text-[10px] text-muted-foreground mb-1 font-semibold">
                  <span>Progress</span>
                  <span>{goalPct}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--muted)' }}>
                  <div className="h-full rounded-full animate-bar-fill" style={{ width: `${Math.min(100, goalPct)}%`, background: 'linear-gradient(90deg, #C8871A, #F5A623)', transition: 'width 1s' }} />
                </div>
              </div>
            }
          />
        )
      case 'conversion_rate':
        return (
          <DashboardKpiCard
            title="Conversion Rate"
            value={`${conversionRate}%`}
            icon={TrendingUp}
            accent="var(--kizen-gold)"
            subtitle="Leads → Admissions"
            rightSlot={mounted && <ScoreRing score={conversionRate} size={50} />}
          />
        )
      case 'pipeline_chart':
        return (
          <div className="glass-card rounded-2xl p-5 animate-card-in flex flex-col h-full">
            <div className="flex items-center gap-2 mb-3">
              <Activity style={{ width: 16, height: 16, color: 'var(--kizen-gold)' }} />
              <span className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>Pipeline Stages</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={pipelineData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
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
        const netValue = revenue - totalExpenses
        return (
          <div className="glass-card rounded-2xl p-5 animate-card-in flex items-start gap-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg h-full border border-glass-border overflow-hidden">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.2)' }}>
              <DollarSign style={{ width: 20, height: 20, color: 'var(--kizen-gold)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] block mb-1 truncate">
                Cash / Expense Snapshot
              </span>
              <div className="flex flex-col gap-2">
                <div>
                  <span className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--foreground)] tabular-nums block truncate">
                    {formatCurrency(netValue)}
                  </span>
                  <p className="text-[10px] text-muted-foreground font-semibold">Net Balance (Revenue - Expenses)</p>
                </div>
                <div className="flex items-center gap-3 pt-2 border-t border-border/50 text-xs">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="text-muted-foreground text-[11px]">In:</span>
                    <span className="font-bold text-success truncate">{formatCurrency(revenue)}</span>
                  </div>
                  <span className="text-muted-foreground/40">•</span>
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="text-muted-foreground text-[11px]">Out:</span>
                    <span className="font-bold text-danger truncate">{formatCurrency(totalExpenses)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      case 'cold_leads':
        return (
          <DashboardKpiCard
            title="Cold Leads (5d no activity)"
            value={coldLeads}
            icon={Thermometer}
            accent="#7A90B0"
            subtitle="Leads with no updates"
            isAlert={coldLeads > 0}
          />
        )
      case 'overdue_followups':
        return (
          <DashboardKpiCard
            title="Overdue Follow-ups"
            value={overdueFus}
            icon={Clock}
            accent="#EF5350"
            subtitle="Missed action items"
            isAlert={overdueFus > 0}
          />
        )
      case 'overdue_fees':
        return (
          <DashboardKpiCard
            title="Overdue Installments"
            value={overdueInstallments}
            icon={AlertTriangle}
            accent="#EF5350"
            subtitle="Pending fee collection"
            isAlert={overdueInstallments > 0}
          />
        )
      case 'batch_capacity':
        return (
          <DashboardKpiCard
            title="Batches >= 90% Capacity"
            value={fullBatches.length}
            icon={GraduationCap}
            accent="#22c55e"
            subtitle="Filled cohorts"
          />
        )
      case 'cycle_countdown':
        return <CycleCountdown enrolled={admissions} goal={admissionsGoal} />
      case 'lead_sources':
        return (
          <div className="glass-card rounded-2xl overflow-hidden animate-card-in h-full flex flex-col" style={{ animationDelay: '320ms' }}>
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2">
                <Award style={{ width: 13, height: 13, color: 'var(--kizen-gold)' }} />
                <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Lead Sources</h2>
              </div>
            </div>
            {stats?.sourceBreakdown && stats.sourceBreakdown.length > 0 ? (
              <ul className="divide-y divide-border">
                {stats.sourceBreakdown.map((src: { name: string; value: number }, i: number) => {
                  const total = stats.sourceBreakdown.reduce((s: number, x: { value: number }) => s + x.value, 0)
                  const pct = total > 0 ? Math.round((src.value / total) * 100) : 0
                  return (
                    <li key={src.name} className="px-5 py-3 transition-colors hover:bg-[rgba(245,166,35,0.04)] animate-card-in"
                      style={{ animationDelay: `${400 + i * 60}ms` }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[9px] font-mono w-4 flex-shrink-0" style={{ color: 'var(--muted-foreground)', opacity: 0.4 }}>0{i + 1}</span>
                          <span className="text-xs font-medium truncate" style={{ color: 'var(--foreground)' }}>{src.name}</span>
                        </div>
                        <span className="text-[11px] font-bold tabular-nums flex-shrink-0 ml-2" style={{ color: 'var(--foreground)' }}>{src.value}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--muted)' }}>
                          <div className="h-full rounded-full" style={{
                            width: mounted ? `${pct}%` : '0%',
                            background: 'linear-gradient(90deg, #C8871A 0%, #F5A623 60%, #FFC84A 100%)',
                            transition: `width 1.1s cubic-bezier(0.16,1,0.3,1) ${400 + i * 80}ms`,
                          }} />
                        </div>
                        <span className="text-[10px] tabular-nums w-7 text-right" style={{ color: 'var(--muted-foreground)' }}>{pct}%</span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center flex-1">
                <Award style={{ width: 30, height: 30, color: 'var(--muted-foreground)', opacity: 0.3 }} />
                <p className="text-sm mt-3 font-semibold" style={{ color: 'var(--muted-foreground)' }}>No Source Data</p>
                <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)', opacity: 0.5 }}>Add source details to your leads.</p>
              </div>
            )}
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
                {todayFollowUps.slice(0, 8).map((fu, i) => {
                  const initials = fu.lead?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) ?? '?'
                  const score = fu.lead?.lead_score ?? 0
                  const isHighScore = score >= 85
                  return (
                    <li key={fu.id} className="flex items-center gap-3 px-5 py-2.5 cursor-pointer group transition-colors hover:bg-[rgba(245,166,35,0.04)] animate-card-in"
                      style={{ borderBottom: i < Math.min(todayFollowUps.length, 8) - 1 ? '1px solid var(--border)' : 'none', animationDelay: `${320 + i * 55}ms` }}>
                      <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
                        style={{ background: 'linear-gradient(135deg, #1C2D4E 0%, #243d6e 100%)', border: '1.5px solid rgba(245,166,35,0.28)', color: 'var(--kizen-gold)' }}>
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-semibold transition-colors group-hover:text-[var(--kizen-gold)]" style={{ color: 'var(--foreground)' }}>{fu.lead?.full_name}</span>
                          {isHighScore && <AchievementBadge label="Top Prospect" />}
                        </div>
                        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{fu.type} &middot; {format(new Date(fu.scheduled_at), 'h:mm a')}</p>
                      </div>
                      {mounted && score > 0 && <ScoreRing score={score} size={30} animate={i < 3} />}
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize"
                          style={{ background: (statusStyle[fu.type] ?? statusStyle['New Lead']).bg, color: (statusStyle[fu.type] ?? statusStyle['New Lead']).color }}>
                          {fu.type}
                        </span>
                        <span className="text-[10px] tabular-nums" style={{ color: 'var(--muted-foreground)', opacity: 0.55 }}>
                          {format(new Date(fu.scheduled_at), 'h:mm a')}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )
      case 'insight_alerts':
        return (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <DashboardKpiCard
              title="Cold Leads (5d no activity)"
              value={coldLeads}
              icon={Thermometer}
              accent="#7A90B0"
              subtitle="Leads with no updates"
              isAlert={coldLeads > 0}
            />
            <DashboardKpiCard
              title="Batches >= 90% Capacity"
              value={fullBatches.length}
              icon={GraduationCap}
              accent="#22c55e"
              subtitle="Filled cohorts"
            />
            <DashboardKpiCard
              title="Overdue Installments"
              value={overdueInstallments}
              icon={AlertTriangle}
              accent="#EF5350"
              subtitle="Pending fee collection"
              isAlert={overdueInstallments > 0}
            />
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
        <div className="space-y-4">
          {/* Row 0: Operational Risk Radar */}
          {widgetPrefs['risk_radar']?.visible !== false && (
            <div>{renderWidget('risk_radar')}</div>
          )}

          {/* Row 1: Primary Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {widgetPrefs['revenue_collected']?.visible !== false && renderWidget('revenue_collected')}
            {widgetPrefs['admissions_goal']?.visible !== false && renderWidget('admissions_goal')}
            {widgetPrefs['conversion_rate']?.visible !== false && renderWidget('conversion_rate')}
            {widgetPrefs['cash_expense']?.visible !== false && renderWidget('cash_expense')}
          </div>

          {/* Row 2: Lead Quality & Target Pacing Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
            {widgetPrefs['lead_temperature']?.visible !== false && renderWidget('lead_temperature')}
            {widgetPrefs['course_goal_pacing']?.visible !== false && renderWidget('course_goal_pacing')}
          </div>

          {/* Row 3: Pipeline & Counselor Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
            {widgetPrefs['pipeline_chart']?.visible !== false && renderWidget('pipeline_chart')}
            {widgetPrefs['counselor_leaderboard']?.visible !== false && renderWidget('counselor_leaderboard')}
          </div>

          {/* Row 4: Acquisition Sources & Today's Follow-ups */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
            {widgetPrefs['lead_sources']?.visible !== false && renderWidget('lead_sources')}
            {widgetPrefs['today_followups']?.visible !== false && renderWidget('today_followups')}
          </div>

          {/* Row 5: Operational Risk & Capacity Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {widgetPrefs['cold_leads']?.visible !== false && renderWidget('cold_leads')}
            {widgetPrefs['batch_capacity']?.visible !== false && renderWidget('batch_capacity')}
            {widgetPrefs['overdue_fees']?.visible !== false && renderWidget('overdue_fees')}
          </div>

          {/* Row 6: Cycle Countdown Footer Banner */}
          {widgetPrefs['cycle_countdown']?.visible !== false && (
            <div>{renderWidget('cycle_countdown')}</div>
          )}
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Customize Dashboard</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Toggle widgets on/off and reorder them.</p>
            {ALL_WIDGETS.map((w) => (
              <div key={w.key} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: 'var(--muted)' }}>
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => handleMoveUp(w.key)} className="text-[10px] opacity-60 hover:opacity-100" style={{ color: 'var(--foreground)' }}>▲</button>
                  <button onClick={() => handleMoveDown(w.key)} className="text-[10px] opacity-60 hover:opacity-100" style={{ color: 'var(--foreground)' }}>▼</button>
                </div>
                <Switch checked={widgetPrefs[w.key]?.visible !== false} onCheckedChange={(checked) => handleToggleWidget(w.key, checked)} />
                <UiLabel className="flex-1 cursor-pointer" onClick={() => handleToggleWidget(w.key, widgetPrefs[w.key]?.visible === false)}>{w.label}</UiLabel>
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
    { label: 'Total Leads', value: stats?.totalLeads ?? 0, display: (v: number) => v.toLocaleString(), delta: leadsDelta >= 0 ? `+${leadsDelta}` : `${leadsDelta}`, up: leadsDelta >= 0, icon: Users, accent: '#F5A623', bg: 'linear-gradient(135deg, rgba(245,166,35,0.38) 0%, rgba(245,166,35,0.10) 100%)' },
    { label: 'Leads Today', value: stats?.leadsToday ?? 0, display: (v: number) => v.toLocaleString(), delta: leadsDelta >= 0 ? `+${leadsDelta}` : `${leadsDelta}`, up: leadsDelta >= 0, icon: TrendingUp, accent: '#22c55e', bg: 'linear-gradient(135deg, rgba(34,197,94,0.32) 0%, rgba(34,197,94,0.08) 100%)' },
    { label: 'Admissions', value: stats?.admissionsMonth ?? 0, display: (v: number) => v.toString(), delta: 'this month', up: true, icon: GraduationCap, accent: '#FFC84A', bg: 'linear-gradient(135deg, rgba(255,200,74,0.38) 0%, rgba(255,200,74,0.10) 100%)' },
    { label: 'Follow-ups Due', value: stats?.followUpsDue ?? 0, display: (v: number) => v.toString(), delta: `${stats?.followUpsOverdue ?? 0} overdue`, up: (stats?.followUpsOverdue ?? 0) === 0, icon: Clock, accent: '#38bdf8', bg: 'linear-gradient(135deg, rgba(56,189,248,0.32) 0%, rgba(56,189,248,0.08) 100%)' },
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
        {/* Today's Follow-ups - styled like original activity feed */}
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
              {todayFollowUps.slice(0, 8).map((fu, i) => {
                const initials = fu.lead?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) ?? '?'
                const score = fu.lead?.lead_score ?? 0
                const isHighScore = score >= 85
                const statusColors: Record<string, { bg: string; color: string }> = {
                  call: { bg: 'rgba(56,189,248,0.13)', color: '#38bdf8' },
                  demo: { bg: 'rgba(245,166,35,0.13)', color: '#F5A623' },
                  meeting: { bg: 'rgba(34,197,94,0.13)', color: '#22c55e' },
                  follow_up: { bg: 'rgba(122,144,176,0.15)', color: '#7A90B0' },
                }
                const sc = statusColors[fu.type] ?? { bg: 'rgba(122,144,176,0.15)', color: '#7A90B0' }
                return (
                  <li key={fu.id} className="flex items-center gap-3 px-5 py-2.5 cursor-pointer group transition-colors hover:bg-[rgba(245,166,35,0.04)] animate-card-in"
                    style={{ borderBottom: i < Math.min(todayFollowUps.length, 8) - 1 ? '1px solid var(--border)' : 'none', animationDelay: `${320 + i * 55}ms` }}>
                    <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
                      style={{ background: 'linear-gradient(135deg, #1C2D4E 0%, #243d6e 100%)', border: '1.5px solid rgba(245,166,35,0.28)', color: 'var(--kizen-gold)' }}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-semibold transition-colors group-hover:text-[var(--kizen-gold)]" style={{ color: 'var(--foreground)' }}>{fu.lead?.full_name}</span>
                        {isHighScore && <AchievementBadge label="Top Prospect" />}
                      </div>
                      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{fu.type} &middot; {format(new Date(fu.scheduled_at), 'h:mm a')}</p>
                    </div>
                    {mounted && score > 0 && <ScoreRing score={score} size={30} animate={i < 3} />}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize" style={{ background: sc.bg, color: sc.color }}>{fu.type}</span>
                      <span className="text-[10px] tabular-nums" style={{ color: 'var(--muted-foreground)', opacity: 0.55 }}>{format(new Date(fu.scheduled_at), 'h:mm a')}</span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Lead Sources - styled like original Top Programs */}
        <div className="xl:col-span-2 glass-card rounded-2xl overflow-hidden animate-card-in" style={{ animationDelay: '320ms' }}>
          <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2">
              <Award style={{ width: 13, height: 13, color: 'var(--kizen-gold)' }} />
              <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Lead Sources</h2>
            </div>
          </div>
          {stats?.sourceBreakdown && stats.sourceBreakdown.length > 0 ? (
            <ul>
              {stats.sourceBreakdown.map((src: { name: string; value: number }, i: number) => {
                const total = stats.sourceBreakdown.reduce((s: number, x: { value: number }) => s + x.value, 0)
                const pct = total > 0 ? Math.round((src.value / total) * 100) : 0
                return (
                  <li key={src.name} className="px-5 py-3 transition-colors hover:bg-[rgba(245,166,35,0.04)] animate-card-in"
                    style={{ borderBottom: i < stats.sourceBreakdown.length - 1 ? '1px solid var(--border)' : 'none', animationDelay: `${400 + i * 60}ms` }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[9px] font-mono w-4 flex-shrink-0" style={{ color: 'var(--muted-foreground)', opacity: 0.4 }}>0{i + 1}</span>
                        <span className="text-xs font-medium truncate" style={{ color: 'var(--foreground)' }}>{src.name}</span>
                      </div>
                      <span className="text-[11px] font-bold tabular-nums flex-shrink-0 ml-2" style={{ color: 'var(--foreground)' }}>{src.value}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--muted)' }}>
                        <div className="h-full rounded-full" style={{
                          width: mounted ? `${pct}%` : '0%',
                          background: 'linear-gradient(90deg, #C8871A 0%, #F5A623 60%, #FFC84A 100%)',
                          transition: `width 1.1s cubic-bezier(0.16,1,0.3,1) ${400 + i * 80}ms`,
                        }} />
                      </div>
                      <span className="text-[10px] tabular-nums w-7 text-right" style={{ color: 'var(--muted-foreground)' }}>{pct}%</span>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
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
          )}
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
  const [tasks, setTasks] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [batches, setBatches] = useState<any[]>([])
  
  useEffect(() => {
    async function loadData() {
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const nextWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59, 59).toISOString()

      // 1. Today's follow-up tasks
      const { data: followUps } = await supabase
        .from('follow_ups')
        .select('*, lead:leads(full_name, mobile, course:courses(name))')
        .gte('scheduled_at', todayStart)
        .lte('scheduled_at', nextWeek)
        .eq('status', 'pending')
        .order('scheduled_at', { ascending: true })

      if (followUps) {
        setTasks(followUps.filter(f => new Date(f.scheduled_at) <= new Date(new Date().setHours(23,59,59))))
      }

      // 2. Pending payments due this week
      const { data: insts } = await supabase
        .from('installments')
        .select('*, fee:fees(student:students(full_name))')
        .eq('status', 'pending')
        .gte('due_date', todayStart)
        .lte('due_date', nextWeek)
        .order('due_date', { ascending: true })

      if (insts) setPayments(insts)

      // 3. Active batches & faculty
      const { data: activeBatches } = await supabase
        .from('batches')
        .select('*, course:courses(name), faculty:users(name)')
        .eq('status', 'ongoing')
        .order('batch_name')
      
      if (activeBatches) setBatches(activeBatches)
    }
    loadData()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Front Desk Dashboard</h1>
        <p className="text-sm mt-0.5 text-slate-500">Walk-in leads, today's tasks, and active batches</p>
      </div>
      
      {/* Top Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard title="Leads Today" value={stats?.leadsToday ?? 0} icon={Users} loading={isLoading} />
        <StatsCard title="Leads This Week" value={stats?.leadsWeek ?? 0} icon={TrendingUp} color="bg-primary-light" loading={isLoading} />
        <StatsCard title="Follow-ups Due" value={stats?.followUpsDue ?? 0} icon={Clock} color="bg-accent" loading={isLoading} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's Tasks */}
        <Card className="border-border/50 shadow-sm">
          <div className="p-4 border-b border-border/50 bg-slate-50/50 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2"><Target className="w-4 h-4 text-primary" /> Today's Calls & Tasks</h3>
            <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">{tasks.length} pending</span>
          </div>
          <CardContent className="p-0">
            {tasks.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">No tasks pending for today!</div>
            ) : (
              <div className="divide-y divide-border/50 max-h-[300px] overflow-auto">
                {tasks.map(t => (
                  <div key={t.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-semibold text-slate-800 text-sm">{t.lead?.full_name}</p>
                      <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{t.type}</span>
                    </div>
                    <p className="text-xs text-slate-600 mb-1">{t.lead?.mobile} • {t.lead?.course?.name}</p>
                    <p className="text-xs text-primary font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {format(new Date(t.scheduled_at), 'h:mm a')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Payments Due this Week */}
        <Card className="border-border/50 shadow-sm">
          <div className="p-4 border-b border-border/50 bg-slate-50/50 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2"><IndianRupee className="w-4 h-4 text-warning" /> Payments Due (7 Days)</h3>
            <span className="text-xs font-medium bg-warning/10 text-warning px-2 py-0.5 rounded-full">{payments.length} pending</span>
          </div>
          <CardContent className="p-0">
            {payments.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">No payments due this week.</div>
            ) : (
              <div className="divide-y divide-border/50 max-h-[300px] overflow-auto">
                {payments.map(p => (
                  <div key={p.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{p.fee?.student?.full_name}</p>
                      <p className="text-xs text-danger font-medium mt-0.5 flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" /> Due: {format(new Date(p.due_date), 'MMM d')}
                      </p>
                    </div>
                    <p className="font-bold text-slate-800">{formatCurrency(p.amount)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Batches & Faculty */}
        <Card className="border-border/50 shadow-sm lg:col-span-2">
          <div className="p-4 border-b border-border/50 bg-slate-50/50">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2"><GraduationCap className="w-4 h-4 text-accent" /> Active Batches & Faculty Info</h3>
          </div>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/50 text-slate-500 text-xs uppercase border-b border-border/50">
                  <tr>
                    <th className="px-4 py-3 font-medium">Batch Name</th>
                    <th className="px-4 py-3 font-medium">Course</th>
                    <th className="px-4 py-3 font-medium">Timing</th>
                    <th className="px-4 py-3 font-medium">Faculty</th>
                    <th className="px-4 py-3 font-medium">Seats</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {batches.map(b => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{b.batch_name}</td>
                      <td className="px-4 py-3 text-slate-600">{b.course?.name}</td>
                      <td className="px-4 py-3 text-slate-600"><span className="bg-slate-100 px-2 py-0.5 rounded text-xs">{b.timing}</span></td>
                      <td className="px-4 py-3 text-slate-600 flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-[10px] text-accent font-bold">{b.faculty?.name?.slice(0,2).toUpperCase()}</div>{b.faculty?.name}</td>
                      <td className="px-4 py-3 text-slate-600">{b.enrolled_count ?? 0} / {b.max_students}</td>
                    </tr>
                  ))}
                  {batches.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No active batches right now.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
    </div>
  </div>
)
}