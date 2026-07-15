import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Search, Plus, Building2, Users } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

interface SearchResult {
  id: string
  label: string
  sublabel: string
  type: 'lead' | 'student' | 'institution' | 'action'
  path: string
}

const ACTIONS: SearchResult[] = [
  { id: 'add-lead', label: 'Add Lead', sublabel: 'Create a new lead', type: 'action', path: '/leads?action=add' },
  { id: 'add-expense', label: 'Add Expense', sublabel: 'Record a new expense', type: 'action', path: '/expenses?action=add' },
  { id: 'add-institution', label: 'Add Institution', sublabel: 'Create a new institution', type: 'action', path: '/institutions?action=add' },
  { id: 'add-followup', label: 'Schedule Follow-up', sublabel: 'Create a follow-up reminder', type: 'action', path: '/followups?action=add' },
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>(ACTIONS)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const doSearch = useCallback(async (q: string) => {
    setQuery(q)
    if (!q || q.length < 2) {
      setResults(ACTIONS)
      return
    }

    const [leadsRes, studentsRes, instRes] = await Promise.all([
      supabase.from('leads').select('id, full_name, mobile').ilike('full_name', `%${q}%`).limit(5),
      supabase.from('students').select('id, full_name, student_id').ilike('full_name', `%${q}%`).limit(5),
      supabase.from('institutions').select('id, name, city').ilike('name', `%${q}%`).limit(5),
    ])

    const items: SearchResult[] = [
      ...(leadsRes.data ?? []).map(l => ({ id: l.id, label: l.full_name, sublabel: l.mobile ?? '', type: 'lead' as const, path: `/leads/${l.id}` })),
      ...(studentsRes.data ?? []).map(s => ({ id: s.id, label: s.full_name, sublabel: s.student_id ?? '', type: 'student' as const, path: `/students/${s.id}` })),
      ...(instRes.data ?? []).map(i => ({ id: i.id, label: i.name, sublabel: i.city ?? '', type: 'institution' as const, path: `/institutions/${i.id}` })),
      ...ACTIONS.filter(a => a.label.toLowerCase().includes(q.toLowerCase())),
    ]

    setResults(items)
    setSelectedIdx(0)
  }, [])

  const handleSelect = (item: SearchResult) => {
    setOpen(false)
    setQuery('')
    navigate(item.path)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, results.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && results[selectedIdx]) { handleSelect(results[selectedIdx]) }
  }

  const iconMap = { lead: Users, student: Users, institution: Building2, action: Plus }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="top-[15%] max-w-lg p-0 overflow-hidden">
        <div className="flex items-center border-b border-border px-4">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            className="border-0 shadow-none focus-visible:ring-0 text-base"
            placeholder="Search leads, students, institutions or type a command..."
            value={query}
            onChange={(e) => doSearch(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">No results found</p>
          ) : (
            results.map((item, i) => {
              const Icon = iconMap[item.type]
              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer transition-colors ${i === selectedIdx ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIdx(i)}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.sublabel}</p>
                  </div>
                  <span className="text-[10px] uppercase text-muted-foreground">{item.type}</span>
                </div>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}