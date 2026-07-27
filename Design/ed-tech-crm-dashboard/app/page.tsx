'use client'

import { useState, useEffect, useCallback } from 'react'
import Sidebar from '@/components/Sidebar'
import Dashboard from '@/components/Dashboard'
import LeadPipeline from '@/components/LeadPipeline'
import DataTable from '@/components/DataTable'
import CommandPalette from '@/components/CommandPalette'
import DarkModeToggle from '@/components/DarkModeToggle'
import { Search, Bell, HelpCircle } from 'lucide-react'

type View = 'dashboard' | 'pipeline' | 'leads' | 'analytics' | 'enrolled' | 'applications' | 'messages' | 'schedule' | 'notifications' | 'settings'

const viewLabels: Record<View, string> = {
  dashboard: 'Dashboard',
  pipeline: 'Lead Pipeline',
  leads: 'Leads',
  analytics: 'Analytics',
  enrolled: 'Enrolled Students',
  applications: 'Applications',
  messages: 'Messages',
  schedule: 'Schedule',
  notifications: 'Notifications',
  settings: 'Settings',
}

function PlaceholderView({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-5 text-center">
      <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center">
        <svg viewBox="0 0 80 80" className="w-10 h-10" fill="none">
          <rect x="10" y="20" width="60" height="8" rx="4" fill="currentColor" className="text-muted-foreground/20" />
          <rect x="10" y="34" width="45" height="8" rx="4" fill="currentColor" className="text-muted-foreground/15" />
          <rect x="10" y="48" width="55" height="8" rx="4" fill="currentColor" className="text-muted-foreground/10" />
        </svg>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-xs">
          This section is coming soon. Use the sidebar to navigate to Dashboard, Pipeline, or Leads.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}

export default function Page() {
  const [view, setView] = useState<View>('dashboard')
  const [cmdOpen, setCmdOpen] = useState(false)

  const openCmd = useCallback(() => setCmdOpen(true), [])
  const closeCmd = useCallback(() => setCmdOpen(false), [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const navigate = (id: string) => setView(id as View)

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar activeView={view} onNavigate={navigate} />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex-shrink-0 flex items-center gap-3 px-6 py-3.5 border-b border-border bg-background/80 backdrop-blur-sm z-10">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm min-w-0">
            <span className="text-muted-foreground/50 hidden sm:block">Kizen</span>
            <span className="text-muted-foreground/30 hidden sm:block">/</span>
            <span className="font-medium text-foreground truncate">{viewLabels[view]}</span>
          </div>

          {/* Search trigger */}
          <button
            onClick={openCmd}
            className="flex-1 max-w-xs flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-muted border border-border text-sm text-muted-foreground hover:bg-muted/80 hover:border-primary/30 transition-all duration-150 group"
            aria-label="Open command palette"
          >
            <Search className="w-3.5 h-3.5 group-hover:text-primary transition-colors flex-shrink-0" />
            <span className="flex-1 text-left text-xs">Search everything...</span>
            <div className="hidden sm:flex items-center gap-0.5 flex-shrink-0">
              <kbd className="text-[10px] font-mono border border-border rounded px-1 py-0.5">⌘</kbd>
              <kbd className="text-[10px] font-mono border border-border rounded px-1 py-0.5">K</kbd>
            </div>
          </button>

          <div className="ml-auto flex items-center gap-1.5">
            <DarkModeToggle />

            <button
              className="flex items-center justify-center w-8 h-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors relative"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
            </button>

            <button
              className="flex items-center justify-center w-8 h-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Help"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/80 to-violet-500/80 flex items-center justify-center text-[11px] font-bold text-white ml-1 ring-2 ring-primary/20 cursor-pointer hover:ring-primary/40 transition-all">
              AK
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {view === 'dashboard' && <Dashboard />}
          {view === 'pipeline' && <LeadPipeline />}
          {view === 'leads' && <DataTable />}
          {view !== 'dashboard' && view !== 'pipeline' && view !== 'leads' && (
            <PlaceholderView title={viewLabels[view]} />
          )}
        </main>
      </div>

      {/* Command Palette */}
      <CommandPalette open={cmdOpen} onClose={closeCmd} onNavigate={navigate} />
    </div>
  )
}
