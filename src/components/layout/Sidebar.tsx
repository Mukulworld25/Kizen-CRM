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
import kizenLogo from '@/assets/kizen-lotus.png'
import sagedoLogo from '@/assets/sagedo_logo_final_circle.png'

import { useFeaturePermissions } from '@/hooks/useFeaturePermissions'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'viewDashboard' as const, featureKey: 'dashboard' },
  { path: '/leads', label: 'Leads', icon: Users, permission: 'viewLeads' as const, featureKey: 'leads' },
  { path: '/followups', label: 'Tasks', icon: Clock, permission: 'viewFollowUps' as const, badge: true, featureKey: 'tasks' },
  { path: '/calendar', label: 'Calendar', icon: CalendarDays, permission: 'viewFollowUps' as const, featureKey: 'calendar' },
  { path: '/institutions', label: 'Institutions', icon: Building2, permission: 'viewInstitutions' as const, featureKey: 'institutions' },
  { path: '/students', label: 'Students', icon: GraduationCap, permission: 'viewStudents' as const, featureKey: 'students' },
  { path: '/batches', label: 'Batches', icon: Users, permission: 'viewStudents' as const, featureKey: 'batches' },
  { path: '/fees', label: 'Fee Management', icon: IndianRupee, permission: 'viewFees' as const, featureKey: 'fees' },
  { path: '/expenses', label: 'Expenses', icon: Wallet, permission: 'viewExpenses' as const, featureKey: 'expenses' },
  { path: '/faculty', label: 'Faculty & Study Materials', icon: BookOpen, permission: 'viewFacultyDashboard' as const, featureKey: 'faculty_timetable' },
  { path: '/reports', label: 'Reports', icon: BarChart3, permission: 'viewReports' as const, featureKey: 'reports' },
  { path: '/knowledge', label: 'Knowledge Base', icon: BookOpen, permission: 'viewKnowledgeBase' as const, featureKey: 'knowledge' },
  { path: '/settings', label: 'Settings', icon: Settings, permission: 'manageUsers' as const, featureKey: 'settings' },
  { path: '/import', label: 'Import', icon: Upload, permission: 'importData' as const, featureKey: 'import' },
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
  const { canViewFeature } = useFeaturePermissions()
  const { data: overdueCount = 0 } = useOverdueCount()
  const [, setPermTick] = useState(0)

  useEffect(() => {
    const handleUpdate = () => setPermTick(t => t + 1)
    window.addEventListener('kizen_permissions_updated', handleUpdate)
    return () => window.removeEventListener('kizen_permissions_updated', handleUpdate)
  }, [])

  const visibleItems = navItems.filter((item) => {
    // Check dynamic DB feature permissions first
    const hasFeature = canViewFeature(item.featureKey) || (item.featureKey === 'faculty_timetable' && canViewFeature('study_materials'))
    if (!hasFeature) return false
    // Special exception for Faculty Time Table and Batches which are read-only for Counselor and Receptionist
    if (item.featureKey === 'batches' || item.featureKey === 'faculty_timetable' || item.featureKey === 'study_materials') {
      return true
    }
    if (item.path === '/settings') {
      return can('manageUsers') || can('manageCourses')
    }
    return can(item.permission)
  })

  const isCollapsed = collapsed && !mobile

  return (
    <aside
      className={cn(
        'flex h-full flex-col transition-all duration-300 overflow-hidden select-none shrink-0',
        isCollapsed ? 'w-16' : 'w-64'
      )}
      style={{ backgroundColor: 'var(--sidebar)', color: 'var(--sidebar-foreground)' }}
    >
      <div 
        className={cn(
          "flex h-16 items-center border-b px-3 transition-all duration-300",
          isCollapsed ? "justify-center" : "justify-between"
        )} 
        style={{ borderColor: 'var(--sidebar-border)' }}
      >
        {isCollapsed ? (
          <button 
            type="button" 
            onClick={onToggle} 
            title="Expand Sidebar"
            className="flex items-center justify-center p-1 rounded-xl hover:bg-white/10 transition-colors"
          >
            <img src={kizenLogo} alt="Kizen Logo" className="h-8 w-8 rounded-lg object-contain shadow-sm border border-white/20" />
            <span className="sr-only">Expand Sidebar</span>
          </button>
        ) : (
          <div className="flex items-center gap-2.5 min-w-0">
            <img src={kizenLogo} alt="Kizen Logo" className="h-9 w-9 rounded-xl object-contain shadow-sm border border-white/20 shrink-0" />
            <span className="font-semibold text-sm tracking-wide truncate" style={{ color: 'var(--sidebar-foreground)' }}>Kizen Education</span>
          </div>
        )}
        {!isCollapsed && !mobile && (
          <button type="button" onClick={onToggle} title="Collapse Sidebar" className="rounded-lg p-1.5 hover:bg-white/10 transition-colors shrink-0">
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className={cn("flex-1 space-y-1 overflow-y-auto min-h-0", isCollapsed ? "p-2" : "p-3")}>
        {visibleItems.map((item) => {
          const Icon = item.icon
          const active = location.pathname.startsWith(item.path)
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              title={isCollapsed ? item.label : undefined}
              className={cn(
                'flex items-center rounded-xl text-sm font-medium transition-all duration-150',
                isCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
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
              {!isCollapsed && (
                <>
                  <span className="flex-1 truncate">{item.label}</span>
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
        <div className={cn("border-t transition-all duration-300", isCollapsed ? "p-2" : "p-4")} style={{ borderColor: 'var(--sidebar-border)' }}>
          <div className={cn("flex items-center", isCollapsed ? "justify-center" : "gap-3")}>
            <Avatar className="h-9 w-9 shrink-0" style={{ boxShadow: '0 0 0 2px var(--sidebar-accent)' }}>
              <AvatarFallback className="text-xs font-semibold" style={{ backgroundColor: 'var(--sidebar-primary)', color: 'var(--sidebar-primary-foreground)' }}>
                {profile.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" style={{ color: 'var(--sidebar-foreground)' }}>{profile.name}</p>
                <p className="text-xs truncate" style={{ color: 'var(--sidebar-accent-foreground)', opacity: 0.7 }}>{roleLabels[profile.role]}</p>
              </div>
            )}
          </div>
          {!isCollapsed ? (
            <div className="mt-3 flex items-center justify-center gap-1.5 pt-2 border-t border-white/10">
              <span className="text-[10px] tracking-wide font-medium" style={{ color: 'var(--sidebar-foreground)', opacity: 0.8 }}>Powered by</span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-900/60 border border-amber-500/30 shadow-sm">
                <img src={sagedoLogo} alt="SAGE DO" className="h-3.5 w-3.5 rounded-full object-cover" />
                <span className="text-[10px] font-black tracking-wider text-amber-400">SAGE DO</span>
              </div>
            </div>
          ) : (
            <div className="mt-2 flex justify-center" title="Powered by SAGE DO">
              <img src={sagedoLogo} alt="SAGE DO" className="h-4 w-4 rounded-full object-cover opacity-80 hover:opacity-100 transition-opacity" />
            </div>
          )}
        </div>
      )}
    </aside>
  )
}
