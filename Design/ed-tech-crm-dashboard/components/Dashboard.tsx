'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Users, TrendingUp, GraduationCap, Clock,
  ArrowUpRight, ArrowDownRight, MoreHorizontal,
  Zap, Trophy, Target, BookOpen, CalendarDays,
  Star, Award,
} from 'lucide-react'
import Modal, { type LeadDetail } from './Modal'

/* ─────────────────────────────────────────────────────────
   Count-up hook — fires whenever `trigger` flips to true
───────────────────────────────────────────────────────── */
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
        // ease-out-expo
        const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
        setValue(Math.round(ease * target))
        if (progress < 1) raf.current = requestAnimationFrame(step)
      }
      raf.current = requestAnimationFrame(step)
    }, delay)
    return () => {
      clearTimeout(timeout)
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [target, duration, delay, trigger])

  return value
}

/* ─────────────────────────────────────────────────────────
   Animated score ring
───────────────────────────────────────────────────────── */
function ScoreRing({
  score, size = 40, animate = true,
}: { score: number; size?: number; animate?: boolean }) {
  const r = (size - 6) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
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

/* ─────────────────────────────────────────────────────────
   Live badge
───────────────────────────────────────────────────────── */
function LiveBadge() {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
      style={{ background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.22)' }}>
      <span className="relative flex w-2 h-2">
        <span className="animate-live-ring absolute inline-flex h-full w-full rounded-full bg-green-400" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
      </span>
      <span className="text-[11px] font-bold text-green-400 tracking-wide">Live</span>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   Achievement badge — shown on high-score leads (≥85)
───────────────────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────────────────
   Cohort avatar strip
───────────────────────────────────────────────────────── */
const cohortMembers = [
  { initials: 'PS', color: '#2a4a7f' },
  { initials: 'JO', color: '#3b3270' },
  { initials: 'SN', color: '#1e4d6b' },
  { initials: 'RP', color: '#1e5c3d' },
  { initials: 'AD', color: '#5c3d1e' },
  { initials: 'LF', color: '#2e4a2e' },
  { initials: 'MT', color: '#4a2e5c' },
  { initials: 'KR', color: '#3d4a1e' },
]

function CohortStrip({ count = 8, total = 316 }: { count?: number; total?: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-2">
        {cohortMembers.slice(0, count).map((m, i) => (
          <div
            key={i}
            title={`Cohort member ${i + 1}`}
            className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold ring-2 animate-card-in"
            style={{
              background: m.color,
              ringColor: 'var(--background)',
              color: '#EDF2FA',
              animationDelay: `${600 + i * 60}ms`,
              zIndex: count - i,
              boxShadow: '0 0 0 2px var(--background)',
            }}
          >
            {m.initials}
          </div>
        ))}
      </div>
      <span className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
        <span className="font-bold" style={{ color: 'var(--foreground)' }}>{total}</span> enrolled this cycle
      </span>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   Cycle countdown with milestone markers
───────────────────────────────────────────────────────── */
const milestones = [
  { pct: 20,  label: 'Apps Open',    done: true  },
  { pct: 42,  label: 'Early Bird',   done: true  },
  { pct: 63,  label: 'Now',          done: false, current: true },
  { pct: 80,  label: 'Final Push',   done: false },
  { pct: 100, label: 'Batch Closes', done: false },
]

function CycleCountdown({ enrolled = 316, goal = 500 }: { enrolled?: number; goal?: number }) {
  const pct = Math.round((enrolled / goal) * 100)
  const daysLeft = 47

  return (
    <div className="glass-card rounded-2xl p-4 animate-card-in" style={{ animationDelay: '380ms' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CalendarDays style={{ width: 14, height: 14, color: 'var(--kizen-gold)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>
            Admissions Cycle 2026
          </span>
        </div>
        <div className="flex items-center gap-3">
          <CohortStrip count={6} total={enrolled} />
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(245,166,35,0.10)', border: '1px solid rgba(245,166,35,0.22)' }}>
            <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--kizen-gold)' }}>{daysLeft}d</span>
            <span className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>left</span>
          </div>
        </div>
      </div>

      {/* Progress bar + milestone markers */}
      <div className="relative">
        {/* Track */}
        <div className="h-2 rounded-full overflow-visible relative" style={{ background: 'var(--muted)' }}>
          {/* Fill */}
          <div
            className="h-full rounded-full"
            style={{
              width: `${pct}%`,
              background: 'linear-gradient(90deg, #C8871A 0%, #F5A623 60%, #FFC84A 100%)',
              transition: 'width 1.4s cubic-bezier(0.16,1,0.3,1)',
              boxShadow: '0 0 8px rgba(245,166,35,0.40)',
            }}
          />

          {/* Milestone diamonds */}
          {milestones.map((m, i) => (
            <div
              key={i}
              className="absolute top-1/2 -translate-y-1/2 animate-milestone-pop"
              style={{
                left: `${m.pct}%`,
                transform: 'translate(-50%, -50%)',
                animationDelay: `${900 + i * 100}ms`,
              }}
            >
              <div
                className="w-3 h-3 rotate-45 border-2"
                style={{
                  background: m.current ? 'var(--kizen-gold)' : m.done ? 'var(--kizen-gold-dim)' : 'var(--muted)',
                  borderColor: m.current ? 'var(--kizen-gold-hi)' : m.done ? 'var(--kizen-gold)' : 'var(--border)',
                  boxShadow: m.current ? '0 0 8px rgba(245,166,35,0.60)' : 'none',
                }}
              />
            </div>
          ))}
        </div>

        {/* Milestone labels */}
        <div className="relative h-5 mt-1">
          {milestones.map((m, i) => (
            <span
              key={i}
              className="absolute text-[9px] font-medium -translate-x-1/2 animate-milestone-pop"
              style={{
                left: `${m.pct}%`,
                color: m.current ? 'var(--kizen-gold)' : m.done ? 'var(--muted-foreground)' : 'var(--muted-foreground)',
                opacity: m.current ? 1 : 0.65,
                fontWeight: m.current ? 700 : 500,
                animationDelay: `${1000 + i * 100}ms`,
                top: 0,
                whiteSpace: 'nowrap',
              }}
            >
              {m.label}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between mt-1">
        <span className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
          <span className="tabular-nums font-bold" style={{ color: 'var(--foreground)' }}>{enrolled}</span>
          <span className="mx-1">/</span>
          <span className="tabular-nums">{goal}</span>
          <span className="ml-1">enrolled</span>
        </span>
        <span className="text-[11px] font-bold tabular-nums" style={{ color: 'var(--kizen-gold)' }}>
          {pct}% of goal
        </span>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   KPI data
───────────────────────────────────────────────────────── */
const kpiData = [
  {
    label: 'Total Leads',
    rawValue: 1284,
    display: (v: number) => v.toLocaleString(),
    delta: '+18%', up: true, sub: 'vs last month',
    icon: Users, accent: '#F5A623', bg: 'rgba(245,166,35,0.08)',
  },
  {
    label: 'Conversion Rate',
    rawValue: 246,
    display: (v: number) => `${(v / 10).toFixed(1)}%`,
    delta: '+3.2pp', up: true, sub: 'vs last quarter',
    icon: TrendingUp, accent: '#22c55e', bg: 'rgba(34,197,94,0.07)',
  },
  {
    label: 'Enrolled',
    rawValue: 316,
    display: (v: number) => v.toString(),
    delta: '+41', up: true, sub: 'new this cycle',
    icon: GraduationCap, accent: '#FFC84A', bg: 'rgba(255,200,74,0.08)',
  },
  {
    label: 'Avg. Response',
    rawValue: 42,
    display: (v: number) => `${(v / 10).toFixed(1)}h`,
    delta: '-1.1h', up: true, sub: 'faster than last month',
    icon: Clock, accent: '#38bdf8', bg: 'rgba(56,189,248,0.07)',
  },
]

/* ─────────────────────────────────────────────────────────
   Activity data
───────────────────────────────────────────────────────── */
const activityFeed = [
  { name: 'Priya Sharma',  action: 'submitted application',  program: 'MBA 2026',          time: '2m ago',  status: 'Applied',   score: 87 },
  { name: 'James Okafor',  action: 'moved to Qualified',     program: 'MSc Data Science',  time: '14m ago', status: 'Qualified', score: 84 },
  { name: 'Sofia Nguyen',  action: 'opened outreach email',  program: 'UX Design',         time: '31m ago', status: 'Contacted', score: 78 },
  { name: 'Raj Patel',     action: 'scheduled campus visit', program: 'MBA 2026',          time: '1h ago',  status: 'Qualified', score: 91 },
  { name: 'Amara Diallo',  action: 'enrolled in program',    program: 'Full-Stack Dev',    time: '2h ago',  status: 'Enrolled',  score: 93 },
  { name: 'Lena Fischer',  action: 'added to pipeline',      program: 'Data Analytics',    time: '3h ago',  status: 'New Lead',  score: 62 },
]

const statusStyle: Record<string, { bg: string; color: string }> = {
  'New Lead':  { bg: 'rgba(122,144,176,0.15)', color: '#7A90B0' },
  Contacted:   { bg: 'rgba(245,166,35,0.13)',  color: '#F5A623' },
  Qualified:   { bg: 'rgba(34,197,94,0.13)',   color: '#22c55e' },
  Applied:     { bg: 'rgba(255,200,74,0.13)',  color: '#FFC84A' },
  Enrolled:    { bg: 'rgba(56,189,248,0.13)',  color: '#38bdf8' },
}

const topPrograms = [
  { name: 'MBA 2026',            leads: 342, enrolled: 88,  pct: 82, icon: Trophy  },
  { name: 'MSc Data Science',    leads: 218, enrolled: 54,  pct: 65, icon: Target  },
  { name: 'UX Design Bootcamp',  leads: 196, enrolled: 71,  pct: 78, icon: BookOpen },
  { name: 'Full-Stack Dev',      leads: 154, enrolled: 62,  pct: 56, icon: BookOpen },
  { name: 'Product Management',  leads: 98,  enrolled: 41,  pct: 44, icon: Target  },
]

const sampleLeadDetail: LeadDetail = {
  name: 'Priya Sharma',
  program: 'MBA 2026',
  status: 'Applied',
  email: 'priya.sharma@email.com',
  phone: '+91 98765 43210',
  location: 'Chandigarh, India',
  appliedDate: 'Jul 12, 2026',
  score: 87,
  tags: ['High Intent', 'Scholarship Interest', 'Referral', 'International'],
  notes: 'Strong academic background (GPA 3.9) with 4 years consulting experience. Interested in fintech elective track. Follow up on scholarship options.',
}

/* ─────────────────────────────────────────────────────────
   Skeleton
───────────────────────────────────────────────────────── */
function SkeletonKPI() {
  return (
    <div className="glass-card rounded-2xl p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div className="skeleton w-9 h-9 rounded-xl" />
        <div className="skeleton w-14 h-5 rounded-full" />
      </div>
      <div className="skeleton w-24 h-8 rounded-md" />
      <div className="skeleton w-20 h-3.5 rounded" />
      <div className="skeleton w-28 h-3 rounded" />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   KPI card — count-up triggers only once on mount
───────────────────────────────────────────────────────── */
function KPICard({ kpi, idx, mounted }: { kpi: typeof kpiData[0]; idx: number; mounted: boolean }) {
  const Icon = kpi.icon
  const countedRaw = useCountUp(kpi.rawValue, 1300, idx * 160, mounted)
  const displayed = kpi.display(countedRaw)

  return (
    <div
      className="glass-card rounded-2xl p-5 cursor-default animate-card-in"
      style={{
        animationDelay: `${idx * 80}ms`,
        background: kpi.bg,
        transition: 'transform 0.2s cubic-bezier(0.16,1,0.3,1), box-shadow 0.2s ease',
        willChange: 'transform',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = 'translateY(-4px) scale(1.015)'
        el.style.boxShadow = `0 16px 48px ${kpi.accent}28, 0 4px 12px ${kpi.accent}14`
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = ''
        el.style.boxShadow = ''
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${kpi.accent}1A` }}>
          <Icon style={{ width: 17, height: 17, color: kpi.accent }} />
        </div>
        <span className="flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full"
          style={kpi.up
            ? { background: 'rgba(34,197,94,0.12)', color: '#22c55e' }
            : { background: 'rgba(239,83,80,0.12)', color: '#ef5350' }}>
          {kpi.up
            ? <ArrowUpRight style={{ width: 10, height: 10 }} />
            : <ArrowDownRight style={{ width: 10, height: 10 }} />}
          {kpi.delta}
        </span>
      </div>

      {/* Count-up value */}
      <p
        key={mounted ? 'counted' : 'zero'}
        className="text-2xl font-extrabold tracking-tight mb-0.5 tabular-nums"
        style={{ color: 'var(--foreground)', fontVariantNumeric: 'tabular-nums' }}
      >
        {displayed}
      </p>

      <p className="text-xs font-semibold" style={{ color: kpi.accent }}>{kpi.label}</p>
      <p className="text-[11px] mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{kpi.sub}</p>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   Main Dashboard
───────────────────────────────────────────────────────── */
export default function Dashboard() {
  const [mounted, setMounted] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<LeadDetail | null>(null)

  // Single tick: triggers all count-ups after hydration
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80)
    return () => clearTimeout(t)
  }, [])

  const handleLeadClick = (name: string) => {
    setSelectedLead({ ...sampleLeadDetail, name })
    setModalOpen(true)
  }

  return (
    <>
      <div className="space-y-4">

        {/* ── Page header ── */}
        <div className="flex items-center justify-between animate-card-in" style={{ animationDelay: '0ms' }}>
          <div>
            <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>
              Dashboard
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
              Monday, July 14 &middot; Admissions Cycle 2026
            </p>
          </div>
          <div className="flex items-center gap-2">
            <LiveBadge />
            <button className="p-2 rounded-xl transition-colors hover:bg-[var(--muted)]"
              style={{ color: 'var(--muted-foreground)' }}>
              <MoreHorizontal style={{ width: 15, height: 15 }} />
            </button>
          </div>
        </div>

        {/* ── KPI cards ── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {!mounted
            ? kpiData.map((_, i) => <SkeletonKPI key={i} />)
            : kpiData.map((kpi, i) => (
                <KPICard key={kpi.label} kpi={kpi} idx={i} mounted={mounted} />
              ))
          }
        </div>

        {/* ── Cycle countdown with milestone markers ── */}
        <CycleCountdown enrolled={316} goal={500} />

        {/* ── Body: Activity + Programs ── */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">

          {/* Activity feed */}
          <div className="xl:col-span-3 glass-card rounded-2xl overflow-hidden animate-card-in"
            style={{ animationDelay: '260ms' }}>
            <div className="flex items-center justify-between px-5 py-3"
              style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2">
                <Zap style={{ width: 13, height: 13, color: 'var(--kizen-gold)' }} />
                <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                  Recent Activity
                </h2>
              </div>
              <button className="text-xs font-medium hover:underline" style={{ color: 'var(--kizen-gold)' }}>
                View all
              </button>
            </div>

            <ul>
              {activityFeed.map((item, i) => {
                const ss = statusStyle[item.status] ?? { bg: 'var(--muted)', color: 'var(--muted-foreground)' }
                const isHighScore = item.score >= 85
                return (
                  <li
                    key={i}
                    className="flex items-center gap-3 px-5 py-2.5 cursor-pointer group transition-colors hover:bg-[rgba(245,166,35,0.04)] animate-card-in"
                    style={{
                      borderBottom: i < activityFeed.length - 1 ? '1px solid var(--border)' : 'none',
                      animationDelay: `${320 + i * 55}ms`,
                    }}
                    onClick={() => handleLeadClick(item.name)}
                  >
                    {/* Avatar */}
                    <div
                      className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
                      style={{
                        background: 'linear-gradient(135deg, #1C2D4E 0%, #243d6e 100%)',
                        border: '1.5px solid rgba(245,166,35,0.28)',
                        color: 'var(--kizen-gold)',
                      }}
                    >
                      {item.name.split(' ').map((n) => n[0]).join('')}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-semibold transition-colors group-hover:text-[var(--kizen-gold)]"
                          style={{ color: 'var(--foreground)' }}>
                          {item.name}
                        </span>
                        {/* Achievement badge for high-score leads */}
                        {isHighScore && <AchievementBadge label="Top Prospect" />}
                      </div>
                      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                        {item.action} &middot; {item.program}
                      </p>
                    </div>

                    {/* Score ring */}
                    {mounted && <ScoreRing score={item.score} size={34} animate={i < 3} />}

                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ background: ss.bg, color: ss.color }}>
                        {item.status}
                      </span>
                      <span className="text-[10px] tabular-nums" style={{ color: 'var(--muted-foreground)', opacity: 0.55 }}>
                        {item.time}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Top programs */}
          <div className="xl:col-span-2 glass-card rounded-2xl overflow-hidden animate-card-in"
            style={{ animationDelay: '320ms' }}>
            <div className="flex items-center justify-between px-5 py-3"
              style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2">
                <Award style={{ width: 13, height: 13, color: 'var(--kizen-gold)' }} />
                <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Top Programs</h2>
              </div>
              <button className="text-xs font-medium hover:underline" style={{ color: 'var(--kizen-gold)' }}>
                Details
              </button>
            </div>

            <ul>
              {topPrograms.map((prog, i) => {
                const Icon = prog.icon
                return (
                  <li
                    key={prog.name}
                    className="px-5 py-3 transition-colors hover:bg-[rgba(245,166,35,0.04)] animate-card-in"
                    style={{
                      borderBottom: i < topPrograms.length - 1 ? '1px solid var(--border)' : 'none',
                      animationDelay: `${400 + i * 60}ms`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[9px] font-mono w-4 flex-shrink-0"
                          style={{ color: 'var(--muted-foreground)', opacity: 0.4 }}>
                          0{i + 1}
                        </span>
                        <Icon style={{ width: 11, height: 11, color: 'var(--kizen-gold)', flexShrink: 0 }} />
                        <p className="text-xs font-medium truncate" style={{ color: 'var(--foreground)' }}>
                          {prog.name}
                        </p>
                      </div>
                      <span className="text-[11px] font-bold tabular-nums flex-shrink-0 ml-2"
                        style={{ color: 'var(--foreground)' }}>
                        {prog.enrolled}
                        <span className="text-[9px] font-normal ml-0.5" style={{ color: 'var(--muted-foreground)' }}>
                          enrolled
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--muted)' }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: mounted ? `${prog.pct}%` : '0%',
                            background: 'linear-gradient(90deg, #C8871A 0%, #F5A623 60%, #FFC84A 100%)',
                            transition: `width 1.1s cubic-bezier(0.16,1,0.3,1) ${400 + i * 80}ms`,
                          }}
                        />
                      </div>
                      <span className="text-[10px] tabular-nums w-7 text-right"
                        style={{ color: 'var(--muted-foreground)' }}>
                        {prog.pct}%
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} lead={selectedLead} />
    </>
  )
}
