'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  LayoutDashboard,
  Users,
  KanbanSquare,
  BarChart3,
  Settings,
  GraduationCap,
  Bell,
  ChevronLeft,
  ChevronRight,
  FileText,
  Calendar,
  MessageSquare,
  BookOpen,
  Trophy,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navGroups = [
  {
    label: 'Overview',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard',  id: 'dashboard', badge: null },
      { icon: BarChart3,       label: 'Analytics',  id: 'analytics', badge: null },
    ],
  },
  {
    label: 'Admissions',
    items: [
      { icon: Users,         label: 'Leads',        id: 'leads',        badge: '128' },
      { icon: KanbanSquare,  label: 'Pipeline',     id: 'pipeline',     badge: '12'  },
      { icon: GraduationCap, label: 'Enrolled',     id: 'enrolled',     badge: null  },
      { icon: FileText,      label: 'Applications', id: 'applications', badge: '6'   },
      { icon: Trophy,        label: 'Cohorts',      id: 'cohorts',      badge: null  },
    ],
  },
  {
    label: 'Communication',
    items: [
      { icon: MessageSquare, label: 'Messages',      id: 'messages',      badge: '3' },
      { icon: Calendar,      label: 'Schedule',      id: 'schedule',      badge: null },
      { icon: Bell,          label: 'Notifications', id: 'notifications', badge: '5' },
    ],
  },
  {
    label: 'Learning',
    items: [
      { icon: BookOpen, label: 'Programs', id: 'programs', badge: null },
    ],
  },
]

interface SidebarProps {
  activeView: string
  onNavigate: (id: string) => void
}

export default function Sidebar({ activeView, onNavigate }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'relative flex flex-col h-full border-r transition-all duration-300 ease-in-out flex-shrink-0',
        'bg-[var(--sidebar)] border-[var(--sidebar-border)]',
        collapsed ? 'w-[60px]' : 'w-[228px]'
      )}
    >
      {/* ── Logo ── */}
      <div
        className={cn(
          'flex items-center border-b border-[var(--sidebar-border)] py-4',
          collapsed ? 'justify-center px-2' : 'px-4 gap-2'
        )}
      >
        {collapsed ? (
          /* Lotus icon only — cropped from logo */
          <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0 glow-gold-sm">
            <Image
              src="/kizen-logo.jpg"
              alt="Kizen"
              width={32}
              height={32}
              className="object-cover object-left scale-[2.1] translate-x-[2px]"
              priority
            />
          </div>
        ) : (
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Small lotus mark */}
            <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0 glow-gold-sm">
              <Image
                src="/kizen-logo.jpg"
                alt=""
                aria-hidden
                width={32}
                height={32}
                className="object-cover object-left scale-[2.1] translate-x-[2px]"
                priority
              />
            </div>
            <div className="leading-none">
              <p className="text-sm font-bold tracking-tight" style={{ color: 'var(--kizen-gold)' }}>
                KIZEN
              </p>
              <p className="text-[9px] font-semibold tracking-[0.18em] uppercase" style={{ color: 'var(--muted-foreground)' }}>
                Admissions CRM
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="px-4 mb-1.5 text-[9px] font-bold tracking-[0.2em] uppercase"
                 style={{ color: 'var(--muted-foreground)', opacity: 0.55 }}>
                {group.label}
              </p>
            )}
            <ul className="space-y-px px-2">
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = activeView === item.id
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => onNavigate(item.id)}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm transition-all duration-150 group relative',
                        isActive
                          ? 'font-semibold'
                          : 'hover:bg-[var(--sidebar-accent)]'
                      )}
                      style={isActive ? {
                        background: 'rgba(245,166,35,0.12)',
                        color: 'var(--kizen-gold)',
                      } : { color: 'var(--muted-foreground)' }}
                    >
                      <Icon
                        className="flex-shrink-0 transition-colors"
                        style={{ width: 15, height: 15,
                          color: isActive ? 'var(--kizen-gold)' : undefined }}
                      />
                      {!collapsed && (
                        <span className="flex-1 text-left leading-none text-[13px]">{item.label}</span>
                      )}
                      {!collapsed && item.badge && (
                        <span
                          className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: 'rgba(245,166,35,0.15)', color: 'var(--kizen-gold)' }}
                        >
                          {item.badge}
                        </span>
                      )}
                      {isActive && (
                        <span
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full"
                          style={{ background: 'var(--kizen-gold)' }}
                        />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── Bottom ── */}
      <div className="border-t border-[var(--sidebar-border)] p-2 space-y-1">
        <button
          onClick={() => onNavigate('settings')}
          title={collapsed ? 'Settings' : undefined}
          className={cn(
            'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm transition-all duration-150',
            activeView === 'settings'
              ? 'font-semibold'
              : 'hover:bg-[var(--sidebar-accent)]'
          )}
          style={activeView === 'settings'
            ? { background: 'rgba(245,166,35,0.12)', color: 'var(--kizen-gold)' }
            : { color: 'var(--muted-foreground)' }}
        >
          <Settings style={{ width: 15, height: 15, flexShrink: 0 }} />
          {!collapsed && <span className="text-[13px]">Settings</span>}
        </button>

        {/* User */}
        <div className={cn('flex items-center gap-2.5 px-2.5 py-2 rounded-xl', collapsed && 'justify-center')}>
          <div
            className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold"
            style={{ background: 'linear-gradient(135deg, var(--kizen-gold) 0%, #C8851A 100%)', color: '#0F1A2E' }}
          >
            AK
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-xs font-semibold truncate" style={{ color: 'var(--foreground)' }}>Alex Kim</span>
              <span className="text-[10px] truncate" style={{ color: 'var(--muted-foreground)' }}>Admissions Lead</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Collapse toggle ── */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-[72px] w-6 h-6 rounded-full flex items-center justify-center shadow-sm transition-colors z-10"
        style={{
          background: 'var(--sidebar)',
          border: '1px solid var(--sidebar-border)',
        }}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed
          ? <ChevronRight style={{ width: 12, height: 12, color: 'var(--muted-foreground)' }} />
          : <ChevronLeft  style={{ width: 12, height: 12, color: 'var(--muted-foreground)' }} />
        }
      </button>
    </aside>
  )
}
