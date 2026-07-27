'use client'

import { useState, useCallback } from 'react'
import { GraduationCap, MoreHorizontal, Plus, Phone, Mail, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import Modal, { type LeadDetail } from './Modal'

type Stage = 'New Lead' | 'Contacted' | 'Qualified' | 'Applied' | 'Enrolled'

interface Lead {
  id: string
  name: string
  program: string
  score: number
  stage: Stage
  time: string
  tags: string[]
  batch: string
}

const initialLeads: Lead[] = [
  { id: '1',  name: 'Lena Fischer',   program: 'Data Analytics',   score: 62, stage: 'New Lead',  time: '3h ago',  tags: ['Organic'],     batch: 'Sep 2026' },
  { id: '2',  name: 'Marco Rossi',    program: 'MBA 2026',         score: 45, stage: 'New Lead',  time: '5h ago',  tags: ['LinkedIn'],    batch: 'Sep 2026' },
  { id: '3',  name: 'Yuki Tanaka',    program: 'UX Design',        score: 71, stage: 'New Lead',  time: '1d ago',  tags: ['Referral'],    batch: 'Jan 2027' },
  { id: '4',  name: 'Sofia Nguyen',   program: 'UX Design',        score: 78, stage: 'Contacted', time: '31m ago', tags: ['High Intent'], batch: 'Sep 2026' },
  { id: '5',  name: 'Chris Müller',   program: 'Full-Stack Dev',   score: 55, stage: 'Contacted', time: '2h ago',  tags: ['Event'],       batch: 'Jan 2027' },
  { id: '6',  name: 'Aisha Hassan',   program: 'MBA 2026',         score: 66, stage: 'Contacted', time: '1d ago',  tags: ['Cold'],        batch: 'Sep 2026' },
  { id: '7',  name: 'James Okafor',   program: 'MSc Data Science', score: 84, stage: 'Qualified', time: '14m ago', tags: ['High Intent'], batch: 'Sep 2026' },
  { id: '8',  name: 'Raj Patel',      program: 'MBA 2026',         score: 91, stage: 'Qualified', time: '1h ago',  tags: ['Scholarship'], batch: 'Sep 2026' },
  { id: '9',  name: 'Mei Chen',       program: 'Product Mgmt',     score: 73, stage: 'Qualified', time: '6h ago',  tags: ['Referral'],    batch: 'Jan 2027' },
  { id: '10', name: 'Priya Sharma',   program: 'MBA 2026',         score: 87, stage: 'Applied',   time: '2m ago',  tags: ['Scholarship'], batch: 'Sep 2026' },
  { id: '11', name: 'Tariq Ali',      program: 'Full-Stack Dev',   score: 79, stage: 'Applied',   time: '4h ago',  tags: ['Organic'],     batch: 'Jan 2027' },
  { id: '12', name: 'Amara Diallo',   program: 'Full-Stack Dev',   score: 93, stage: 'Enrolled',  time: '2h ago',  tags: ['Top Pick'],    batch: 'Sep 2026' },
  { id: '13', name: 'Nina Kowalski',  program: 'Data Analytics',   score: 88, stage: 'Enrolled',  time: '1d ago',  tags: ['Top Pick'],    batch: 'Sep 2026' },
]

const stages: {
  id: Stage
  label: string
  accentColor: string
  headerBg: string
  countBg: string
  countColor: string
}[] = [
  { id: 'New Lead',  label: 'New Lead',  accentColor: '#64748b', headerBg: 'rgba(100,116,139,0.08)', countBg: 'rgba(100,116,139,0.15)', countColor: '#94a3b8' },
  { id: 'Contacted', label: 'Contacted', accentColor: '#F5A623', headerBg: 'rgba(245,166,35,0.07)',  countBg: 'rgba(245,166,35,0.15)',  countColor: '#F5A623' },
  { id: 'Qualified', label: 'Qualified', accentColor: '#22c55e', headerBg: 'rgba(34,197,94,0.07)',   countBg: 'rgba(34,197,94,0.15)',   countColor: '#22c55e' },
  { id: 'Applied',   label: 'Applied',   accentColor: '#818cf8', headerBg: 'rgba(129,140,248,0.07)', countBg: 'rgba(129,140,248,0.15)', countColor: '#818cf8' },
  { id: 'Enrolled',  label: 'Enrolled',  accentColor: '#38bdf8', headerBg: 'rgba(56,189,248,0.07)',  countBg: 'rgba(56,189,248,0.15)',  countColor: '#38bdf8' },
]

const sampleDetail: LeadDetail = {
  name: 'Priya Sharma',
  program: 'MBA 2026',
  status: 'Applied',
  email: 'priya.sharma@email.com',
  phone: '+91 98765 43210',
  location: 'Chandigarh, India',
  appliedDate: 'Jul 12, 2026',
  score: 87,
  tags: ['High Intent', 'Scholarship Interest', 'Referral'],
  notes: 'Strong academic background with 4 years consulting experience. Interested in fintech elective.',
}

/* ── Score ring ── */
function ScoreRing({ score, size = 38 }: { score: number; size?: number }) {
  const r = (size - 5) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 85 ? '#22c55e' : score >= 70 ? '#F5A623' : '#64748b'

  return (
    <svg width={size} height={size} aria-label={`Score: ${score}`} className="flex-shrink-0">
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
            fontSize={size * 0.27} fontWeight="700" fill={color}>
        {score}
      </text>
    </svg>
  )
}

/* ── Confetti ── */
async function fireConfetti() {
  const confetti = (await import('canvas-confetti')).default
  confetti({
    particleCount: 120,
    spread: 80,
    origin: { y: 0.55 },
    colors: ['#F5A623', '#FFD580', '#1A2B4B', '#ffffff', '#22c55e'],
    shapes: ['circle', 'square'],
    scalar: 0.95,
    gravity: 0.9,
  })
  setTimeout(() =>
    confetti({
      particleCount: 60,
      spread: 100,
      origin: { x: 0.1, y: 0.5 },
      colors: ['#F5A623', '#FFD580', '#ffffff'],
      scalar: 0.7,
    }), 200
  )
  setTimeout(() =>
    confetti({
      particleCount: 60,
      spread: 100,
      origin: { x: 0.9, y: 0.5 },
      colors: ['#F5A623', '#FFD580', '#ffffff'],
      scalar: 0.7,
    }), 350
  )
}

/* ── Empty state ── */
function EmptyColumn({ color }: { color: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 rounded-xl gap-2"
         style={{ border: `2px dashed ${color}30` }}>
      <GraduationCap style={{ width: 20, height: 20, color, opacity: 0.3 }} />
      <p className="text-xs text-center px-2" style={{ color: 'var(--muted-foreground)', opacity: 0.5 }}>
        Drop leads here
      </p>
    </div>
  )
}

/* ── Main ── */
export default function LeadPipeline() {
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<Stage | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<LeadDetail | null>(null)

  const handleDragStart = useCallback((id: string) => setDragging(id), [])
  const handleDragOver = useCallback((e: React.DragEvent, stage: Stage) => {
    e.preventDefault()
    setDragOver(stage)
  }, [])
  const handleDrop = useCallback(async (e: React.DragEvent, stage: Stage) => {
    e.preventDefault()
    if (dragging) {
      const prevStage = leads.find((l) => l.id === dragging)?.stage
      setLeads((prev) => prev.map((l) => l.id === dragging ? { ...l, stage } : l))
      if (stage === 'Enrolled' && prevStage !== 'Enrolled') {
        await fireConfetti()
      }
    }
    setDragging(null)
    setDragOver(null)
  }, [dragging, leads])
  const handleDragEnd = useCallback(() => { setDragging(null); setDragOver(null) }, [])

  const openLead = (lead: Lead) => {
    setSelectedLead({
      ...sampleDetail,
      name: lead.name,
      program: lead.program,
      status: lead.stage,
      score: lead.score,
      tags: lead.tags,
    })
    setModalOpen(true)
  }

  return (
    <>
      <div className="space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>
              Lead Pipeline
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
              {leads.length} leads &middot; drag to move between stages &middot; drop to Enrolled fires confetti
            </p>
          </div>
          <button
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
            style={{ background: 'var(--kizen-gold)', color: '#0F1A2E', boxShadow: '0 4px 18px rgba(245,166,35,0.35)' }}
          >
            <Plus style={{ width: 14, height: 14 }} />
            Add Lead
          </button>
        </div>

        {/* Board */}
        <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 560 }}>
          {stages.map((stage) => {
            const stageLeads = leads.filter((l) => l.stage === stage.id)
            const isOver = dragOver === stage.id

            return (
              <div
                key={stage.id}
                className="flex-shrink-0 w-[240px] flex flex-col"
                onDragOver={(e) => handleDragOver(e, stage.id)}
                onDrop={(e) => handleDrop(e, stage.id)}
                onDragLeave={() => setDragOver(null)}
              >
                {/* Column header */}
                <div
                  className="rounded-2xl p-3 mb-2 transition-all duration-200"
                  style={{
                    background: isOver ? `${stage.accentColor}14` : stage.headerBg,
                    border: `1px solid ${stage.accentColor}${isOver ? '50' : '20'}`,
                    borderTop: `2px solid ${stage.accentColor}`,
                    transform: isOver ? 'scale(1.01)' : undefined,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: stage.accentColor }} />
                      <span className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>
                        {stage.label}
                      </span>
                    </div>
                    <span
                      className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: stage.countBg, color: stage.countColor }}
                    >
                      {stageLeads.length}
                    </span>
                  </div>
                </div>

                {/* Cards */}
                <div
                  className="flex-1 space-y-2 rounded-2xl p-1.5 transition-all duration-200 min-h-[60px]"
                  style={isOver
                    ? { background: `${stage.accentColor}08`, border: `1px solid ${stage.accentColor}25` }
                    : undefined}
                >
                  {stageLeads.length === 0
                    ? <EmptyColumn color={stage.accentColor} />
                    : stageLeads.map((lead) => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={() => handleDragStart(lead.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => openLead(lead)}
                        className={cn(
                          'glass-card rounded-xl p-3 cursor-grab active:cursor-grabbing select-none transition-all duration-150 group',
                          dragging === lead.id && 'opacity-40 scale-[0.97]'
                        )}
                        style={{ willChange: 'transform' }}
                        onMouseEnter={(e) => {
                          if (dragging) return
                          ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'
                          ;(e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 24px ${stage.accentColor}18`
                        }}
                        onMouseLeave={(e) => {
                          ;(e.currentTarget as HTMLDivElement).style.transform = ''
                          ;(e.currentTarget as HTMLDivElement).style.boxShadow = ''
                        }}
                      >
                        {/* Card header */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold"
                              style={{
                                background: `linear-gradient(135deg, ${stage.accentColor}40 0%, ${stage.accentColor}20 100%)`,
                                border: `1px solid ${stage.accentColor}40`,
                                color: stage.accentColor,
                              }}
                            >
                              {lead.name.split(' ').map((n) => n[0]).join('')}
                            </div>
                            <p
                              className="text-xs font-semibold leading-none truncate group-hover:text-[var(--kizen-gold)] transition-colors"
                              style={{ color: 'var(--foreground)' }}
                            >
                              {lead.name}
                            </p>
                          </div>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                            style={{ color: 'var(--muted-foreground)' }}
                          >
                            <MoreHorizontal style={{ width: 13, height: 13 }} />
                          </button>
                        </div>

                        {/* Program + batch */}
                        <div className="flex items-center gap-1.5 mb-2">
                          <BookOpen style={{ width: 11, height: 11, color: 'var(--muted-foreground)', opacity: 0.5, flexShrink: 0 }} />
                          <span className="text-[11px] truncate" style={{ color: 'var(--muted-foreground)' }}>
                            {lead.program}
                          </span>
                        </div>

                        {/* Batch tag */}
                        <div className="flex items-center gap-1 mb-2.5">
                          <GraduationCap style={{ width: 10, height: 10, color: stage.accentColor, opacity: 0.7 }} />
                          <span className="text-[10px] font-medium" style={{ color: stage.accentColor, opacity: 0.8 }}>
                            Batch {lead.batch}
                          </span>
                        </div>

                        {/* Tags */}
                        {lead.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2.5">
                            {lead.tags.map((t) => (
                              <span
                                key={t}
                                className="text-[10px] px-1.5 py-0.5 rounded-full"
                                style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={(e) => e.stopPropagation()}
                              className="w-5 h-5 rounded-lg flex items-center justify-center transition-colors"
                              style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = `${stage.accentColor}25`; (e.currentTarget as HTMLButtonElement).style.color = stage.accentColor }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--muted)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted-foreground)' }}
                            >
                              <Phone style={{ width: 9, height: 9 }} />
                            </button>
                            <button
                              onClick={(e) => e.stopPropagation()}
                              className="w-5 h-5 rounded-lg flex items-center justify-center transition-colors"
                              style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = `${stage.accentColor}25`; (e.currentTarget as HTMLButtonElement).style.color = stage.accentColor }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--muted)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted-foreground)' }}
                            >
                              <Mail style={{ width: 9, height: 9 }} />
                            </button>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px]" style={{ color: 'var(--muted-foreground)', opacity: 0.5 }}>{lead.time}</span>
                            <ScoreRing score={lead.score} size={34} />
                          </div>
                        </div>
                      </div>
                    ))
                  }

                  {/* Add stub */}
                  <button
                    className="w-full flex items-center justify-center gap-1 py-1.5 rounded-xl text-[11px] transition-colors mt-1"
                    style={{ border: `1px dashed ${stage.accentColor}25`, color: 'var(--muted-foreground)', opacity: 0.5 }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = `${stage.accentColor}60`; (e.currentTarget as HTMLButtonElement).style.color = stage.accentColor; (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = `${stage.accentColor}25`; (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted-foreground)'; (e.currentTarget as HTMLButtonElement).style.opacity = '0.5' }}
                  >
                    <Plus style={{ width: 11, height: 11 }} /> Add
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} lead={selectedLead} />
    </>
  )
}
