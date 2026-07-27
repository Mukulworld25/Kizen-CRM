'use client'

import { useEffect } from 'react'
import {
  X, GraduationCap, Mail, Phone, Calendar, MapPin, Tag,
  ArrowUpRight, BookOpen, MessageSquare, Star,
} from 'lucide-react'

export interface LeadDetail {
  name: string
  program: string
  status: string
  email: string
  phone: string
  location: string
  appliedDate: string
  score: number
  tags: string[]
  notes: string
}

interface ModalProps {
  open: boolean
  onClose: () => void
  lead?: LeadDetail | null
}

const statusStyle: Record<string, { bg: string; color: string }> = {
  'New Lead':  { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8' },
  Contacted:   { bg: 'rgba(245,166,35,0.13)',  color: '#F5A623' },
  Qualified:   { bg: 'rgba(34,197,94,0.13)',   color: '#22c55e' },
  Applied:     { bg: 'rgba(129,140,248,0.13)', color: '#818cf8' },
  Enrolled:    { bg: 'rgba(56,189,248,0.13)',  color: '#38bdf8' },
  Rejected:    { bg: 'rgba(239,83,80,0.13)',   color: '#ef5350' },
}

/* ── Large score ring ── */
function BigScoreRing({ score }: { score: number }) {
  const size = 88
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color  = score >= 85 ? '#22c55e' : score >= 70 ? '#F5A623' : '#64748b'
  const grade  = score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : 'D'

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width={size} height={size} aria-label={`Qualification score: ${score} out of 100`}>
        {/* Track */}
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6}
        />
        {/* Fill */}
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className="score-ring transition-all duration-700"
          style={{ filter: `drop-shadow(0 0 6px ${color}60)` }}
        />
        {/* Score number */}
        <text x="50%" y="44%" dominantBaseline="central" textAnchor="middle"
              fontSize="22" fontWeight="800" fill={color}>
          {score}
        </text>
        {/* Grade */}
        <text x="50%" y="66%" dominantBaseline="central" textAnchor="middle"
              fontSize="11" fontWeight="600" fill={color} opacity="0.65">
          Grade {grade}
        </text>
      </svg>
      <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
        Qualification
      </p>
    </div>
  )
}

/* ── Timeline ── */
const timeline = [
  { label: 'Lead created',  date: 'Jul 01', done: true  },
  { label: 'Contacted',     date: 'Jul 04', done: true  },
  { label: 'Qualified',     date: 'Jul 08', done: true  },
  { label: 'Application',   date: 'Jul 12', done: true  },
  { label: 'Enrolled',      date: '—',      done: false },
]

export default function Modal({ open, onClose, lead }: ModalProps) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  if (!open || !lead) return null

  const initials = lead.name.split(' ').map((n) => n[0]).join('').slice(0, 2)
  const ss = statusStyle[lead.status] ?? { bg: 'var(--muted)', color: 'var(--muted-foreground)' }

  return (
    /* ── Overlay ── */
    <div
      className="fixed inset-0 z-50 flex items-center justify-end"
      onClick={onClose}
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
    >
      {/* ── Drawer panel (slides in from right) ── */}
      <div
        className="relative h-full overflow-y-auto animate-slide-in-right"
        style={{
          width: 'min(480px, 95vw)',
          background: 'var(--popover)',
          borderLeft: '1px solid var(--border)',
          boxShadow: '-24px 0 80px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Lead detail: ${lead.name}`}
      >

        {/* ── Header ── */}
        <div
          className="flex items-start gap-4 p-6"
          style={{
            borderBottom: '1px solid var(--border)',
            background: 'linear-gradient(135deg, rgba(26,43,75,0.7) 0%, rgba(15,26,46,0.5) 100%)',
          }}
        >
          {/* Avatar */}
          <div
            className="w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center text-xl font-extrabold glow-gold-sm"
            style={{
              background: 'linear-gradient(135deg, rgba(245,166,35,0.25) 0%, rgba(200,133,26,0.15) 100%)',
              border: '1px solid rgba(245,166,35,0.35)',
              color: 'var(--kizen-gold)',
            }}
          >
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <h2 className="text-base font-bold truncate" style={{ color: 'var(--foreground)' }}>
                {lead.name}
              </h2>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: ss.bg, color: ss.color }}
              >
                {lead.status}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mb-3">
              <GraduationCap style={{ width: 13, height: 13, color: 'var(--kizen-gold)', opacity: 0.7 }} />
              <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{lead.program}</span>
            </div>
            {/* Quick actions */}
            <div className="flex items-center gap-1.5">
              {[
                { icon: Phone,        label: 'Call',    color: '#22c55e' },
                { icon: Mail,         label: 'Email',   color: '#38bdf8' },
                { icon: MessageSquare,label: 'Message', color: '#818cf8' },
                { icon: Star,         label: 'Star',    color: '#F5A623' },
              ].map(({ icon: Icon, label, color }) => (
                <button
                  key={label}
                  aria-label={label}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-medium transition-all"
                  style={{ background: `${color}15`, color, border: `1px solid ${color}25` }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = `${color}28` }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = `${color}15` }}
                >
                  <Icon style={{ width: 13, height: 13 }} />
                </button>
              ))}
            </div>
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
            style={{ color: 'var(--muted-foreground)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--muted)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--foreground)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = ''; (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted-foreground)' }}
            aria-label="Close"
          >
            <X style={{ width: 15, height: 15 }} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="p-6 space-y-6">

          {/* Score + contact info */}
          <div className="flex items-start gap-6">
            <BigScoreRing score={lead.score} />
            <div className="flex-1 grid grid-cols-1 gap-2.5">
              {[
                { icon: Mail,    label: 'Email',    value: lead.email },
                { icon: Phone,   label: 'Phone',    value: lead.phone },
                { icon: MapPin,  label: 'Location', value: lead.location },
                { icon: Calendar,label: 'Applied',  value: lead.appliedDate },
              ].map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl"
                  style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
                >
                  <Icon style={{ width: 13, height: 13, color: 'var(--muted-foreground)', flexShrink: 0 }} />
                  <div className="min-w-0">
                    <p className="text-[9px] font-semibold uppercase tracking-widest mb-0.5"
                       style={{ color: 'var(--muted-foreground)', opacity: 0.6 }}>
                      {label}
                    </p>
                    <p className="text-xs font-medium truncate" style={{ color: 'var(--foreground)' }}>{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Journey timeline */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5"
               style={{ color: 'var(--muted-foreground)' }}>
              <BookOpen style={{ width: 11, height: 11 }} /> Admissions Journey
            </p>
            <div className="flex items-center gap-0 relative">
              {/* connector line */}
              <div className="absolute top-3 left-3 right-3 h-px" style={{ background: 'var(--border)', zIndex: 0 }} />
              {timeline.map((step, i) => (
                <div key={step.label} className="flex-1 flex flex-col items-center gap-1.5 relative z-10">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all"
                    style={step.done
                      ? { background: 'var(--kizen-gold)', color: '#0F1A2E', boxShadow: '0 0 10px rgba(245,166,35,0.4)' }
                      : { background: 'var(--muted)', color: 'var(--muted-foreground)', border: '1px solid var(--border)' }
                    }
                  >
                    {i + 1}
                  </div>
                  <p className="text-[9px] font-medium text-center leading-none"
                     style={{ color: step.done ? 'var(--foreground)' : 'var(--muted-foreground)', opacity: step.done ? 1 : 0.5 }}>
                    {step.label}
                  </p>
                  <p className="text-[9px] tabular-nums" style={{ color: 'var(--muted-foreground)', opacity: 0.5 }}>
                    {step.date}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5 flex items-center gap-1.5"
               style={{ color: 'var(--muted-foreground)' }}>
              <Tag style={{ width: 11, height: 11 }} /> Tags
            </p>
            <div className="flex flex-wrap gap-1.5">
              {lead.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] px-2.5 py-1 rounded-full transition-all cursor-default"
                  style={{ background: 'var(--muted)', color: 'var(--muted-foreground)', border: '1px solid var(--border)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLSpanElement).style.background = 'rgba(245,166,35,0.12)'; (e.currentTarget as HTMLSpanElement).style.color = 'var(--kizen-gold)'; (e.currentTarget as HTMLSpanElement).style.borderColor = 'rgba(245,166,35,0.25)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLSpanElement).style.background = 'var(--muted)'; (e.currentTarget as HTMLSpanElement).style.color = 'var(--muted-foreground)'; (e.currentTarget as HTMLSpanElement).style.borderColor = 'var(--border)' }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Notes */}
          {lead.notes && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2"
                 style={{ color: 'var(--muted-foreground)' }}>
                Notes
              </p>
              <p
                className="text-xs leading-relaxed p-3.5 rounded-xl"
                style={{ color: 'var(--foreground)', opacity: 0.8, background: 'var(--muted)', border: '1px solid var(--border)' }}
              >
                {lead.notes}
              </p>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div
          className="flex items-center gap-2 px-6 py-4"
          style={{
            borderTop: '1px solid var(--border)',
            background: 'rgba(245,166,35,0.03)',
            position: 'sticky',
            bottom: 0,
          }}
        >
          <button
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: 'var(--kizen-gold)', color: '#0F1A2E', boxShadow: '0 4px 18px rgba(245,166,35,0.30)' }}
          >
            <ArrowUpRight style={{ width: 14, height: 14 }} />
            Open Full Profile
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm transition-all"
            style={{ border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--muted)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--foreground)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = ''; (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted-foreground)' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
