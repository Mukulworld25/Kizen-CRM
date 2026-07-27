'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import {
  Search, ArrowRight, Users, KanbanSquare, BarChart3, Settings,
  FileText, GraduationCap, Clock, X, LayoutDashboard, Trophy,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const commands = [
  { icon: LayoutDashboard, label: 'Dashboard',        desc: 'Overview & KPIs',             category: 'Navigate', id: 'dashboard'    },
  { icon: Users,           label: 'Leads',            desc: 'Browse full lead database',    category: 'Navigate', id: 'leads'        },
  { icon: KanbanSquare,    label: 'Pipeline',         desc: 'Admissions funnel & stages',   category: 'Navigate', id: 'pipeline'     },
  { icon: BarChart3,       label: 'Analytics',        desc: 'Conversion rates & trends',    category: 'Navigate', id: 'analytics'    },
  { icon: GraduationCap,   label: 'Enrolled',         desc: 'View enrolled cohort',         category: 'Navigate', id: 'enrolled'     },
  { icon: FileText,        label: 'Applications',     desc: 'Review pending applications',  category: 'Navigate', id: 'applications' },
  { icon: Trophy,          label: 'Cohorts',          desc: 'Manage intake batches',        category: 'Navigate', id: 'cohorts'      },
  { icon: Settings,        label: 'Settings',         desc: 'Workspace preferences',        category: 'System',   id: 'settings'     },
]

const recentLeads = [
  { name: 'Priya Sharma',  status: 'Applied',   program: 'MBA 2026',         score: 87 },
  { name: 'James Okafor',  status: 'Qualified', program: 'MSc Data Science', score: 84 },
  { name: 'Sofia Nguyen',  status: 'Contacted', program: 'UX Design',        score: 78 },
  { name: 'Raj Patel',     status: 'Qualified', program: 'MBA 2026',         score: 91 },
]

const recentSearches = ['MBA 2026', 'High Intent leads', 'Enrolled this month']

const statusStyle: Record<string, { bg: string; color: string }> = {
  'New Lead':  { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8' },
  Contacted:   { bg: 'rgba(245,166,35,0.13)',  color: '#F5A623' },
  Qualified:   { bg: 'rgba(34,197,94,0.13)',   color: '#22c55e' },
  Applied:     { bg: 'rgba(129,140,248,0.13)', color: '#818cf8' },
  Enrolled:    { bg: 'rgba(56,189,248,0.13)',  color: '#38bdf8' },
}

/* Very lightweight fuzzy: all query chars appear in order */
function fuzzyMatch(text: string, query: string): boolean {
  const t = text.toLowerCase()
  const q = query.toLowerCase()
  let qi = 0
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++
  }
  return qi === q.length
}

/* Highlight matched chars */
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  const q = query.toLowerCase()
  const result: React.ReactNode[] = []
  let qi = 0, last = 0

  for (let i = 0; i < text.length && qi < q.length; i++) {
    if (text[i].toLowerCase() === q[qi]) {
      if (last < i) result.push(text.slice(last, i))
      result.push(
        <span key={i} style={{ color: 'var(--kizen-gold)', fontWeight: 700 }}>
          {text[i]}
        </span>
      )
      last = i + 1
      qi++
    }
  }
  if (last < text.length) result.push(text.slice(last))
  return <>{result}</>
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  onNavigate: (id: string) => void
}

export default function CommandPalette({ open, onClose, onNavigate }: CommandPaletteProps) {
  const [query, setQuery]   = useState('')
  const [active, setActive] = useState(0)
  const inputRef  = useRef<HTMLInputElement>(null)
  const listRef   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 40)
    }
  }, [open])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const filteredCmds = query
    ? commands.filter((c) => fuzzyMatch(c.label, query) || fuzzyMatch(c.desc, query))
    : commands

  const filteredLeads = query
    ? recentLeads.filter((l) => fuzzyMatch(l.name, query) || fuzzyMatch(l.program, query))
    : recentLeads

  /* Flat list for keyboard nav */
  const allItems = [
    ...filteredLeads.map((l) => ({ type: 'lead' as const, data: l })),
    ...filteredCmds.map((c) => ({ type: 'cmd' as const, data: c })),
  ]

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, allItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter' && e.nativeEvent.isComposing === false) {
      e.preventDefault()
      const item = allItems[active]
      if (!item) return
      if (item.type === 'cmd') { onNavigate(item.data.id); onClose() }
      else onClose()
    }
  }, [allItems, active, onNavigate, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[13vh]"
      onClick={onClose}
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="relative w-full mx-4 rounded-2xl overflow-hidden animate-fade-up shadow-navy"
        style={{
          maxWidth: 560,
          background: 'var(--popover)',
          border: '1px solid rgba(245,166,35,0.18)',
          boxShadow: '0 0 0 1px rgba(245,166,35,0.06), 0 24px 80px rgba(0,0,0,0.7)',
          animationDelay: '0ms',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        {/* ── Search bar ── */}
        <div
          className="flex items-center gap-3 px-4 py-3.5"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <Search style={{ width: 15, height: 15, color: 'var(--kizen-gold)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActive(0) }}
            onKeyDown={handleKey}
            placeholder="Search leads, programs, actions..."
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--foreground)' }}
          />
          <div className="flex items-center gap-1.5">
            {query && (
              <button onClick={() => { setQuery(''); setActive(0) }} style={{ color: 'var(--muted-foreground)' }}>
                <X style={{ width: 13, height: 13 }} />
              </button>
            )}
            <kbd
              className="text-[10px] font-mono px-1.5 py-0.5 rounded"
              style={{ border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}
            >
              esc
            </kbd>
          </div>
        </div>

        {/* ── Results ── */}
        <div ref={listRef} className="overflow-y-auto" style={{ maxHeight: 420 }}>

          {/* Recent searches (no query) */}
          {!query && (
            <div className="px-2 pt-2">
              <p className="px-2 py-1 text-[9px] font-bold uppercase tracking-[0.18em]"
                 style={{ color: 'var(--muted-foreground)', opacity: 0.5 }}>
                Recent searches
              </p>
              <div className="flex flex-wrap gap-1.5 px-2 pb-2">
                {recentSearches.map((s) => (
                  <button
                    key={s}
                    onClick={() => setQuery(s)}
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-colors"
                    style={{ background: 'var(--muted)', color: 'var(--muted-foreground)', border: '1px solid var(--border)' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(245,166,35,0.3)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--kizen-gold)' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted-foreground)' }}
                  >
                    <Clock style={{ width: 10, height: 10 }} />
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Leads */}
          {filteredLeads.length > 0 && (
            <div className="px-2 pt-1">
              <p className="px-2 py-1 text-[9px] font-bold uppercase tracking-[0.18em]"
                 style={{ color: 'var(--muted-foreground)', opacity: 0.5 }}>
                {query ? 'Leads' : 'Recent Leads'}
              </p>
              {filteredLeads.map((lead, i) => {
                const flatIdx = i
                const ss = statusStyle[lead.status] ?? { bg: 'var(--muted)', color: 'var(--muted-foreground)' }
                const scoreColor = lead.score >= 85 ? '#22c55e' : lead.score >= 70 ? '#F5A623' : '#64748b'
                return (
                  <button
                    key={lead.name}
                    onClick={onClose}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors"
                    style={active === flatIdx
                      ? { background: 'rgba(245,166,35,0.08)' }
                      : undefined}
                    onMouseEnter={() => setActive(flatIdx)}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
                      style={{ background: 'rgba(245,166,35,0.12)', color: 'var(--kizen-gold)', border: '1px solid rgba(245,166,35,0.2)' }}
                    >
                      {lead.name.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-semibold leading-none mb-0.5" style={{ color: 'var(--foreground)' }}>
                        <Highlight text={lead.name} query={query} />
                      </p>
                      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                        <Highlight text={lead.program} query={query} />
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: ss.bg, color: ss.color }}>
                      {lead.status}
                    </span>
                    <span className="text-xs font-bold tabular-nums w-6 text-right" style={{ color: scoreColor }}>
                      {lead.score}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Commands */}
          {filteredCmds.length > 0 && (
            <div className="px-2 pt-1 pb-2">
              <p className="px-2 py-1 text-[9px] font-bold uppercase tracking-[0.18em]"
                 style={{ color: 'var(--muted-foreground)', opacity: 0.5 }}>
                {query ? 'Actions' : 'Quick Navigation'}
              </p>
              {filteredCmds.map((cmd, i) => {
                const Icon = cmd.icon
                const flatIdx = filteredLeads.length + i
                return (
                  <button
                    key={cmd.id}
                    onClick={() => { onNavigate(cmd.id); onClose() }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors"
                    style={active === flatIdx
                      ? { background: 'rgba(245,166,35,0.08)' }
                      : undefined}
                    onMouseEnter={() => setActive(flatIdx)}
                  >
                    <div
                      className="w-7 h-7 rounded-xl flex-shrink-0 flex items-center justify-center transition-colors"
                      style={active === flatIdx
                        ? { background: 'rgba(245,166,35,0.15)', color: 'var(--kizen-gold)' }
                        : { background: 'var(--muted)', color: 'var(--muted-foreground)' }}
                    >
                      <Icon style={{ width: 13, height: 13 }} />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium leading-none mb-0.5" style={{ color: 'var(--foreground)' }}>
                        <Highlight text={cmd.label} query={query} />
                      </p>
                      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                        <Highlight text={cmd.desc} query={query} />
                      </p>
                    </div>
                    <ArrowRight
                      style={{
                        width: 13, height: 13,
                        color: active === flatIdx ? 'var(--kizen-gold)' : 'transparent',
                        transition: 'color 0.15s',
                      }}
                    />
                  </button>
                )
              })}
            </div>
          )}

          {/* No results */}
          {query && filteredCmds.length === 0 && filteredLeads.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search style={{ width: 30, height: 30, color: 'var(--muted-foreground)', opacity: 0.3, marginBottom: 12 }} />
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                No results for &ldquo;{query}&rdquo;
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)', opacity: 0.5 }}>
                Try a different name, program, or action
              </p>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div
          className="flex items-center gap-4 px-4 py-2.5"
          style={{ borderTop: '1px solid var(--border)', background: 'rgba(245,166,35,0.02)' }}
        >
          {[
            { key: '↑↓', desc: 'navigate' },
            { key: '↵',  desc: 'select'   },
            { key: 'esc',desc: 'close'    },
          ].map(({ key, desc }) => (
            <div key={key} className="flex items-center gap-1.5">
              <kbd
                className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                style={{ border: '1px solid var(--border)', color: 'var(--muted-foreground)', background: 'var(--muted)' }}
              >
                {key}
              </kbd>
              <span className="text-[10px]" style={{ color: 'var(--muted-foreground)', opacity: 0.5 }}>{desc}</span>
            </div>
          ))}
          <div className="ml-auto flex items-center gap-1">
            <span className="text-[10px]" style={{ color: 'var(--muted-foreground)', opacity: 0.35 }}>Powered by</span>
            <span className="text-[10px] font-bold" style={{ color: 'var(--kizen-gold)', opacity: 0.6 }}>KIZEN</span>
          </div>
        </div>
      </div>
    </div>
  )
}
