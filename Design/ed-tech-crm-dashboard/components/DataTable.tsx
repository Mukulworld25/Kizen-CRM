'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Search,
  Download,
  MoreHorizontal,
  Phone,
  Mail,
  GraduationCap,
  BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Modal, { type LeadDetail } from './Modal'

interface Lead {
  id: string
  name: string
  program: string
  status: string
  score: number
  counselor: string
  lastContact: string
  source: string
  location: string
  batch: string
}

const allLeads: Lead[] = [
  { id: '1',  name: 'Priya Sharma',   program: 'MBA 2026',         status: 'Applied',   score: 87, counselor: 'Alex Kim',    lastContact: 'Jul 12', source: 'Referral', location: 'Chandigarh, IN', batch: 'Sep 2026' },
  { id: '2',  name: 'James Okafor',   program: 'MSc Data Science', status: 'Qualified', score: 84, counselor: 'Morgan Lee',  lastContact: 'Jul 13', source: 'LinkedIn', location: 'New York, US',   batch: 'Sep 2026' },
  { id: '3',  name: 'Sofia Nguyen',   program: 'UX Design',        status: 'Contacted', score: 78, counselor: 'Alex Kim',    lastContact: 'Jul 11', source: 'Organic',  location: 'Austin, US',    batch: 'Jan 2027' },
  { id: '4',  name: 'Raj Patel',      program: 'MBA 2026',         status: 'Qualified', score: 91, counselor: 'Jordan Chen', lastContact: 'Jul 14', source: 'Event',    location: 'Mumbai, IN',    batch: 'Sep 2026' },
  { id: '5',  name: 'Amara Diallo',   program: 'Full-Stack Dev',   status: 'Enrolled',  score: 93, counselor: 'Morgan Lee',  lastContact: 'Jul 10', source: 'Referral', location: 'Lagos, NG',     batch: 'Sep 2026' },
  { id: '6',  name: 'Lena Fischer',   program: 'Data Analytics',   status: 'New Lead',  score: 62, counselor: 'Jordan Chen', lastContact: 'Jul 14', source: 'Organic',  location: 'Berlin, DE',    batch: 'Jan 2027' },
  { id: '7',  name: 'Marco Rossi',    program: 'MBA 2026',         status: 'New Lead',  score: 45, counselor: 'Alex Kim',    lastContact: 'Jul 13', source: 'LinkedIn', location: 'Milan, IT',     batch: 'Sep 2026' },
  { id: '8',  name: 'Mei Chen',       program: 'Product Mgmt',     status: 'Qualified', score: 73, counselor: 'Morgan Lee',  lastContact: 'Jul 12', source: 'Event',    location: 'Shanghai, CN',  batch: 'Jan 2027' },
  { id: '9',  name: 'Tariq Ali',      program: 'Full-Stack Dev',   status: 'Applied',   score: 79, counselor: 'Alex Kim',    lastContact: 'Jul 11', source: 'Organic',  location: 'Karachi, PK',   batch: 'Jan 2027' },
  { id: '10', name: 'Nina Kowalski',  program: 'Data Analytics',   status: 'Enrolled',  score: 88, counselor: 'Jordan Chen', lastContact: 'Jul 9',  source: 'Referral', location: 'Warsaw, PL',    batch: 'Sep 2026' },
  { id: '11', name: 'Yuki Tanaka',    program: 'UX Design',        status: 'New Lead',  score: 71, counselor: 'Morgan Lee',  lastContact: 'Jul 14', source: 'LinkedIn', location: 'Tokyo, JP',     batch: 'Jan 2027' },
  { id: '12', name: 'Aisha Hassan',   program: 'MBA 2026',         status: 'Contacted', score: 66, counselor: 'Jordan Chen', lastContact: 'Jul 10', source: 'Cold',     location: 'Nairobi, KE',   batch: 'Sep 2026' },
]

const statusStyle: Record<string, { bg: string; color: string }> = {
  'New Lead':  { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8' },
  Contacted:   { bg: 'rgba(245,166,35,0.13)',  color: '#F5A623' },
  Qualified:   { bg: 'rgba(34,197,94,0.13)',   color: '#22c55e' },
  Applied:     { bg: 'rgba(129,140,248,0.13)', color: '#818cf8' },
  Enrolled:    { bg: 'rgba(56,189,248,0.13)',  color: '#38bdf8' },
}

const statusOrder: Record<string, number> = {
  'New Lead': 0, Contacted: 1, Qualified: 2, Applied: 3, Enrolled: 4,
}

type SortKey = keyof Lead
type SortDir = 'asc' | 'desc' | null

/* ── Score ring (small) ── */
function ScoreRing({ score }: { score: number }) {
  const size = 36
  const r = (size - 5) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 85 ? '#22c55e' : score >= 70 ? '#F5A623' : '#64748b'

  return (
    <svg width={size} height={size} aria-label={`Score: ${score}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={2.5} />
      <circle
        cx={size/2} cy={size/2} r={r}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        className="score-ring"
        style={{ filter: `drop-shadow(0 0 3px ${color}50)` }}
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle"
            fontSize={size * 0.265} fontWeight="700" fill={color}>
        {score}
      </text>
    </svg>
  )
}

/* ── Skeleton row ── */
function SkeletonRow() {
  return (
    <tr style={{ borderBottom: '1px solid var(--border)' }}>
      <td className="px-4 py-3.5"><div className="skeleton w-4 h-4 rounded" /></td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="skeleton w-7 h-7 rounded-full" />
          <div className="skeleton w-28 h-3.5 rounded" />
        </div>
      </td>
      <td className="px-4 py-3.5"><div className="skeleton w-24 h-3.5 rounded" /></td>
      <td className="px-4 py-3.5"><div className="skeleton w-20 h-5 rounded-full" /></td>
      <td className="px-4 py-3.5"><div className="skeleton w-9 h-9 rounded-full" /></td>
      <td className="px-4 py-3.5"><div className="skeleton w-20 h-3.5 rounded" /></td>
      <td className="px-4 py-3.5"><div className="skeleton w-12 h-3.5 rounded" /></td>
      <td className="px-4 py-3.5"><div className="skeleton w-14 h-5 rounded-full" /></td>
      <td className="px-4 py-3.5" />
    </tr>
  )
}

/* ── Empty state ── */
function EmptyState() {
  return (
    <tr>
      <td colSpan={9} className="py-16 text-center">
        <div className="flex flex-col items-center gap-4">
          {/* Academic illustration */}
          <div className="relative w-16 h-16">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                 style={{ background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.15)' }}>
              <GraduationCap style={{ width: 28, height: 28, color: 'var(--kizen-gold)', opacity: 0.5 }} />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg flex items-center justify-center"
                 style={{ background: 'var(--muted)' }}>
              <BookOpen style={{ width: 12, height: 12, color: 'var(--muted-foreground)', opacity: 0.4 }} />
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>No leads found</p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
              Try adjusting your search or status filter
            </p>
          </div>
        </div>
      </td>
    </tr>
  )
}

const statuses = ['All', 'New Lead', 'Contacted', 'Qualified', 'Applied', 'Enrolled']

export default function DataTable() {
  const [search, setSearch]             = useState('')
  const [sortKey, setSortKey]           = useState<SortKey>('score')
  const [sortDir, setSortDir]           = useState<SortDir>('desc')
  const [selected, setSelected]         = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState('All')
  const [modalOpen, setModalOpen]       = useState(false)
  const [selectedLead, setSelectedLead] = useState<LeadDetail | null>(null)
  const [loading, setLoading]           = useState(true)

  /* Simulate skeleton load */
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 900)
    return () => clearTimeout(t)
  }, [])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : sortDir === 'desc' ? null : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const filtered = useMemo(() => {
    let rows = allLeads.filter((l) => {
      const q = search.toLowerCase()
      const matchSearch = !q || l.name.toLowerCase().includes(q) ||
        l.program.toLowerCase().includes(q) || l.location.toLowerCase().includes(q)
      const matchStatus = statusFilter === 'All' || l.status === statusFilter
      return matchSearch && matchStatus
    })
    if (sortDir) {
      rows = [...rows].sort((a, b) => {
        let aVal: string | number = a[sortKey] as string | number
        let bVal: string | number = b[sortKey] as string | number
        if (sortKey === 'status') { aVal = statusOrder[a.status]; bVal = statusOrder[b.status] }
        if (typeof aVal === 'number' && typeof bVal === 'number')
          return sortDir === 'asc' ? aVal - bVal : bVal - aVal
        return sortDir === 'asc'
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal))
      })
    }
    return rows
  }, [search, sortKey, sortDir, statusFilter])

  const toggleSelect = (id: string) => setSelected((prev) => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })
  const toggleAll = () =>
    setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map((l) => l.id)))

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col || !sortDir) return <ChevronsUpDown style={{ width: 11, height: 11, opacity: 0.35 }} />
    return sortDir === 'asc'
      ? <ChevronUp   style={{ width: 11, height: 11, color: 'var(--kizen-gold)' }} />
      : <ChevronDown style={{ width: 11, height: 11, color: 'var(--kizen-gold)' }} />
  }

  const openLead = (lead: Lead) => {
    setSelectedLead({
      name: lead.name,
      program: lead.program,
      status: lead.status,
      email: `${lead.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      phone: '+91 98765 00000',
      location: lead.location,
      appliedDate: `${lead.lastContact}, 2026`,
      score: lead.score,
      tags: [lead.source, lead.batch, lead.status === 'Enrolled' ? 'Top Pick' : 'Active'],
      notes: `Managed by ${lead.counselor}. Last contacted ${lead.lastContact}. Batch: ${lead.batch}.`,
    })
    setModalOpen(true)
  }

  return (
    <>
      <div className="space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>Leads</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
              {filtered.length} of {allLeads.length} leads
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
                   style={{ background: 'rgba(245,166,35,0.10)', border: '1px solid rgba(245,166,35,0.20)' }}>
                <span className="text-xs font-semibold" style={{ color: 'var(--kizen-gold)' }}>
                  {selected.size} selected
                </span>
                <button className="text-xs ml-1 hover:underline" style={{ color: 'var(--kizen-gold)' }}>
                  Actions
                </button>
              </div>
            )}
            <button
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs transition-colors"
              style={{ border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}
            >
              <Download style={{ width: 13, height: 13 }} />
              Export
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: 'var(--muted-foreground)' }} />
            <input
              type="text"
              placeholder="Search leads, programs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-2 text-sm rounded-xl outline-none transition-all"
              style={{
                background: 'var(--muted)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
                width: 240,
              }}
              onFocus={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(245,166,35,0.4)'; (e.currentTarget as HTMLInputElement).style.boxShadow = '0 0 0 3px rgba(245,166,35,0.08)' }}
              onBlur={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLInputElement).style.boxShadow = 'none' }}
            />
          </div>

          {/* Status tabs */}
          <div className="flex items-center gap-0.5 p-1 rounded-xl" style={{ background: 'var(--muted)' }}>
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150"
                style={statusFilter === s
                  ? { background: 'var(--background)', color: 'var(--foreground)', boxShadow: '0 1px 4px rgba(0,0,0,0.25)' }
                  : { color: 'var(--muted-foreground)' }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 10, background: 'var(--card)', backdropFilter: 'blur(12px)' }}>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selected.size === filtered.length && filtered.length > 0}
                      onChange={toggleAll}
                      className="cursor-pointer"
                      aria-label="Select all"
                      style={{ accentColor: 'var(--kizen-gold)' }}
                    />
                  </th>
                  {([
                    { key: 'name',        label: 'Student' },
                    { key: 'program',     label: 'Program'  },
                    { key: 'status',      label: 'Status'   },
                    { key: 'score',       label: 'Score'    },
                    { key: 'counselor',   label: 'Counselor'},
                    { key: 'lastContact', label: 'Last Contact' },
                    { key: 'source',      label: 'Source'   },
                  ] as { key: SortKey; label: string }[]).map(({ key, label }) => (
                    <th
                      key={key}
                      onClick={() => handleSort(key)}
                      className="px-4 py-3 text-left cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider"
                           style={{ color: 'var(--muted-foreground)' }}
                           onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.color = 'var(--foreground)' }}
                           onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.color = 'var(--muted-foreground)' }}>
                        {label}
                        <SortIcon col={key} />
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-3 w-20" />
                </tr>
              </thead>

              <tbody>
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                  : filtered.length === 0
                    ? <EmptyState />
                    : filtered.map((lead, i) => {
                        const ss = statusStyle[lead.status] ?? { bg: 'var(--muted)', color: 'var(--muted-foreground)' }
                        return (
                          <tr
                            key={lead.id}
                            className="cursor-pointer group animate-fade-up"
                            style={{
                              borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                              background: selected.has(lead.id) ? 'rgba(245,166,35,0.04)' : undefined,
                              animationDelay: `${i * 40}ms`,
                            }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(245,166,35,0.04)' }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = selected.has(lead.id) ? 'rgba(245,166,35,0.04)' : '' }}
                            onClick={() => openLead(lead)}
                          >
                            <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selected.has(lead.id)}
                                onChange={() => toggleSelect(lead.id)}
                                className="cursor-pointer"
                                aria-label={`Select ${lead.name}`}
                                style={{ accentColor: 'var(--kizen-gold)' }}
                              />
                            </td>

                            {/* Student */}
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
                                  style={{ background: 'linear-gradient(135deg, #1A2B4B 0%, #2a3f6e 100%)', border: '1px solid rgba(245,166,35,0.20)', color: 'var(--kizen-gold)' }}
                                >
                                  {lead.name.split(' ').map((n) => n[0]).join('')}
                                </div>
                                <div>
                                  <p className="font-semibold text-xs leading-none mb-0.5 group-hover:text-[var(--kizen-gold)] transition-colors"
                                     style={{ color: 'var(--foreground)' }}>
                                    {lead.name}
                                  </p>
                                  <p className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>
                                    {lead.batch}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Program */}
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-1.5">
                                <BookOpen style={{ width: 11, height: 11, color: 'var(--muted-foreground)', opacity: 0.5, flexShrink: 0 }} />
                                <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{lead.program}</span>
                              </div>
                            </td>

                            {/* Status */}
                            <td className="px-4 py-3.5">
                              <span
                                className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                                style={{ background: ss.bg, color: ss.color }}
                              >
                                {lead.status}
                              </span>
                            </td>

                            {/* Score ring */}
                            <td className="px-4 py-3.5">
                              <ScoreRing score={lead.score} />
                            </td>

                            {/* Counselor */}
                            <td className="px-4 py-3.5 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                              {lead.counselor}
                            </td>

                            {/* Last contact */}
                            <td className="px-4 py-3.5 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                              {lead.lastContact}
                            </td>

                            {/* Source */}
                            <td className="px-4 py-3.5">
                              <span
                                className="text-[11px] px-2 py-0.5 rounded-full"
                                style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}
                              >
                                {lead.source}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {[
                                  { icon: Phone, label: 'Call' },
                                  { icon: Mail,  label: 'Email' },
                                  { icon: MoreHorizontal, label: 'More' },
                                ].map(({ icon: Icon, label }) => (
                                  <button
                                    key={label}
                                    aria-label={label}
                                    className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors"
                                    style={{ color: 'var(--muted-foreground)' }}
                                    onMouseEnter={(e) => {
                                      ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(245,166,35,0.15)'
                                      ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--kizen-gold)'
                                    }}
                                    onMouseLeave={(e) => {
                                      ;(e.currentTarget as HTMLButtonElement).style.background = ''
                                      ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--muted-foreground)'
                                    }}
                                  >
                                    <Icon style={{ width: 11, height: 11 }} />
                                  </button>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )
                      })
                }
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderTop: '1px solid var(--border)', background: 'rgba(245,166,35,0.02)' }}
          >
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              Showing{' '}
              <span className="font-semibold" style={{ color: 'var(--foreground)' }}>{filtered.length}</span>
              {' '}leads
            </p>
            <div className="flex items-center gap-1">
              {[1, 2, 3].map((p) => (
                <button
                  key={p}
                  className="w-7 h-7 rounded-lg text-xs font-medium transition-all"
                  style={p === 1
                    ? { background: 'var(--kizen-gold)', color: '#0F1A2E' }
                    : { color: 'var(--muted-foreground)' }}
                  onMouseEnter={(e) => { if (p !== 1) (e.currentTarget as HTMLButtonElement).style.background = 'var(--muted)' }}
                  onMouseLeave={(e) => { if (p !== 1) (e.currentTarget as HTMLButtonElement).style.background = '' }}
                >
                  {p}
                </button>
              ))}
              <span className="text-xs px-1" style={{ color: 'var(--muted-foreground)' }}>…</span>
              <button
                className="w-7 h-7 rounded-lg text-xs font-medium transition-all"
                style={{ color: 'var(--muted-foreground)' }}
              >
                8
              </button>
            </div>
          </div>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} lead={selectedLead} />
    </>
  )
}
