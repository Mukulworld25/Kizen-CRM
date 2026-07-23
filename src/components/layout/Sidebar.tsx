import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, Clock, GraduationCap, IndianRupee,
  BarChart3, Settings, ChevronLeft, ChevronRight,
  Building2, Wallet, BookOpen, Upload, CalendarDays,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useOverdueCount } from '@/hooks/useStudents'
import { roleLabels } from '@/lib/permissions'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import kizenLogo from '@/assets/kizen-logo.jpg'
import sagedoLogo from '@/assets/sagedo-logo.jpeg'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'viewDashboard' as const },
  { path: '/leads', label: 'Leads', icon: Users, permission: 'viewLeads' as const },
  { path: '/followups', label: 'Follow-ups', icon: Clock, permission: 'viewFollowUps' as const, badge: true },
  { path: '/calendar', label: 'Calendar', icon: CalendarDays, permission: 'viewFollowUps' as const },
  { path: '/institutions', label: 'Institutions', icon: Building2, permission: 'viewInstitutions' as const },
  { path: '/students', label: 'Students', icon: GraduationCap, permission: 'viewStudents' as const },
  { path: '/fees', label: 'Fee Management', icon: IndianRupee, permission: 'viewFees' as const },
  { path: '/expenses', label: 'Expenses', icon: Wallet, permission: 'viewExpenses' as const },
  { path: '/faculty', label: 'Faculty', icon: BookOpen, permission: 'viewFacultyDashboard' as const },
  { path: '/reports', label: 'Reports', icon: BarChart3, permission: 'viewReports' as const },
  { path: '/knowledge', label: 'Knowledge Base', icon: BookOpen, permission: 'viewKnowledgeBase' as const },
  { path: '/settings', label: 'Settings', icon: Settings, permission: 'manageUsers' as const },
  { path: '/import', label: 'Import', icon: Upload, permission: 'importData' as const },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  mobile?: boolean
  onNavigate?: () => void
}

export function Sidebar({ collapsed, onToggle, mobile, onNavigate }: SidebarProps) {
  const location = useLocation()
  const { profile, can } = useAuth()
  const { data: overdueCount = 0 } = useOverdueCount()
  const [, setPermTick] = useState(0)

  useEffect(() => {
    const handleUpdate = () => setPermTick(t => t + 1)
    window.addEventListener('kizen_permissions_updated', handleUpdate)
    return () => window.removeEventListener('kizen_permissions_updated', handleUpdate)
  }, [])

  const visibleItems = navItems.filter((item) => can(item.permission))

  return (
    <aside
      className={cn(
        'flex h-full flex-col transition-all duration-300',
        collapsed && !mobile ? 'w-16' : 'w-64'
      )}
      style={{ backgroundColor: 'var(--sidebar)', color: 'var(--sidebar-foreground)' }}
    >
      <div className="flex h-16 items-center justify-between border-b px-4" style={{ borderColor: 'var(--sidebar-border)' }}>
        {(!collapsed || mobile) && (
          <div className="flex items-center gap-2.5">
            <img src={kizenLogo} alt="Kizen Education" className="h-9 w-9 rounded-xl object-cover shadow-sm border border-white/20" />
            <span className="font-semibold text-sm tracking-wide" style={{ color: 'var(--sidebar-foreground)' }}>Kizen Education</span>
          </div>
        )}
        {!mobile && (
          <button type="button" onClick={onToggle} className="rounded-lg p-1.5 hover:bg-white/10 transition-colors">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {visibleItems.map((item) => {
          const Icon = item.icon
          const active = location.pathname.startsWith(item.path)
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                active
                  ? 'shadow-sm'
                  : 'hover:bg-white/10'
              )}
              style={{
                backgroundColor: active ? 'var(--sidebar-primary)' : 'transparent',
                color: active ? 'var(--sidebar-primary-foreground)' : 'var(--sidebar-accent-foreground)',
              }}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {(!collapsed || mobile) && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {item.badge && overdueCount > 0 && (
                    <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">{overdueCount}</Badge>
                  )}
                </>
              )}
            </Link>
          )
        })}
      </nav>

      {profile && (
        <div className="border-t p-4" style={{ borderColor: 'var(--sidebar-border)' }}>
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9" style={{ boxShadow: '0 0 0 2px var(--sidebar-accent)' }}>
              <AvatarFallback className="text-xs font-semibold" style={{ backgroundColor: 'var(--sidebar-primary)', color: 'var(--sidebar-primary-foreground)' }}>
                {profile.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            {(!collapsed || mobile) && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" style={{ color: 'var(--sidebar-foreground)' }}>{profile.name}</p>
                <p className="text-xs" style={{ color: 'var(--sidebar-accent-foreground)', opacity: 0.7 }}>{roleLabels[profile.role]}</p>
              </div>
            )}
          </div>
          {(!collapsed || mobile) && (
            <div className="mt-3 flex items-center justify-center gap-1.5 pt-2 border-t border-white/10 opacity-80">
              <span className="text-[10px] tracking-wide font-medium" style={{ color: 'var(--sidebar-foreground)' }}>Powered by</span>
              <img src={sagedoLogo} alt="SAGE DO" className="h-4 object-contain rounded" />
            </div>
          )}
        </div>
      )}
    </aside>
  )
}
