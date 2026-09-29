import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Hash } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useGlobalSearch } from '@/hooks/useStudents'

export function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [searchByIdOnly, setSearchByIdOnly] = useState(false)
  const [open, setOpen] = useState(false)
  const { data: results = [] } = useGlobalSearch(query, searchByIdOnly)
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
      <div className="relative flex items-center">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          id="global-search"
          placeholder={searchByIdOnly ? "Search strictly by ID (KZ- or STU-)..." : "Search leads & students by name/ID... (Ctrl+K)"}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          className={`pl-9 ${searchByIdOnly ? 'pr-28 border-primary/50 ring-1 ring-primary/20' : 'pr-24'} bg-slate-50`}
        />
        <button
          type="button"
          onClick={() => {
            setSearchByIdOnly((prev) => !prev)
            document.getElementById('global-search')?.focus()
            setOpen(true)
          }}
          className={`absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all ${
            searchByIdOnly
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'bg-muted text-muted-foreground hover:bg-slate-200'
          }`}
          title="Toggle search strictly by Lead/Student ID"
        >
          <Hash className="w-3 h-3" />
          <span>{searchByIdOnly ? 'ID Mode' : 'By ID'}</span>
        </button>
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute top-full z-50 mt-1 w-full rounded-xl border border-border bg-card shadow-lg overflow-hidden">
          {searchByIdOnly && (
            <div className="px-3 py-1.5 bg-primary/5 border-b border-border text-[11px] font-medium text-primary flex items-center justify-between">
              <span>Searching strictly by Display ID (KZ- / STU-)</span>
              <span className="text-[10px] text-muted-foreground">{results.length} results</span>
            </div>
          )}
          {results.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">No records matching &quot;{query}&quot; found</p>
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
                    <span className="text-[10px] font-mono font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">
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
