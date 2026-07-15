import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useDashboardStats, useFollowUps, useDashboardInsights } from '@/hooks/useStudents'
import { useBdmDashboardStats } from '@/hooks/useInstitutions'
import { StatsCard } from '@/components/shared/StatsCard'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'

import {
  Users, TrendingUp, GraduationCap, IndianRupee,
  AlertTriangle, Clock, Target,
  Building2, CalendarRange, Handshake, Thermometer,
  ArrowUpRight, ArrowDownRight, MoreHorizontal,
  Zap, Award, CalendarDays,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

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

export default function Dashboard() {
  const { isOwner, profile } = useAuth()
  const { data: stats, isLoading } = useDashboardStats()
  const { data: todayFollowUps = [] } = useFollowUps('today')
  const [mounted, setMounted] = useState(false)

  useEffect(() => { const t = setTimeout(() => setMounted(true), 80); return () => clearTimeout(t) }, [])

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

      {isOwner && <InsightWidgets />}

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

function InsightWidgets() {
  const { data: insights, isLoading } = useDashboardInsights()
  return (
    <div className="grid gap-4 sm:grid-cols-3 mb-2">
      <StatsCard title="Cold Leads (5d no activity)" value={insights?.coldLeads ?? 0} icon={Thermometer} color="bg-accent" loading={isLoading} alert={(insights?.coldLeads ?? 0) > 0} />
      <StatsCard title="Batches >= 90% Capacity" value={insights?.fullBatches?.length ?? 0} icon={GraduationCap} color="bg-accent" loading={isLoading} />
      <StatsCard title="Overdue Installments" value={insights?.overdueInstallments ?? 0} icon={AlertTriangle} color="bg-destructive" loading={isLoading} alert={(insights?.overdueInstallments ?? 0) > 0} />
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