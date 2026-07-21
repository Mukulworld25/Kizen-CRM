import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useGlobalSearch } from '@/hooks/useStudents'

export function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const { data: results = [] } = useGlobalSearch(query)
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        document.getElementById('global-search')?.focus()
        setOpen(true)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleSelect = (item: { id: string; type: 'lead' | 'student' }) => {
    navigate(item.type === 'lead' ? `/leads/${item.id}` : `/students/${item.id}`)
    setQuery('')
    setOpen(false)
  }

  return (
    <div className="relative w-full max-w-md">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        id="global-search"
        placeholder="Search leads & students by name/ID... (Ctrl+K)"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        className="pl-9 bg-slate-50"
      />
      {open && query.length >= 2 && (
        <div className="absolute top-full z-50 mt-1 w-full rounded-xl border border-border bg-card shadow-lg">
          {results.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">No results found</p>
          ) : (
            results.map((item) => (
              <button
                key={`${item.type}-${item.id}`}
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-primary/5 transition-colors"
                onMouseDown={() => handleSelect(item)}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{item.full_name}</span>
                  {(item as any).display_id && (
                    <span className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded border border-border">
                      {(item as any).display_id}
                    </span>
                  )}
                </div>
                <Badge variant="secondary" className="capitalize text-[10px]">{item.type}</Badge>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
