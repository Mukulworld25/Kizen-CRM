import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { canAccessRoute, getDefaultRoute } from '@/lib/permissions'
import type { Permission } from '@/lib/permissions'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, profile, loading, canViewFeature } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#060B18]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-amber-400 border-t-transparent shadow-md" />
          <p className="text-xs font-bold text-amber-300 tracking-wider animate-pulse">Loading CRM...</p>
        </div>
      </div>
    )
  }

  if (!session || !profile) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // 1. Check feature permission from DB (Role Access Matrix in Settings)
  const routeToFeature: Record<string, string> = {
    '/dashboard': 'dashboard',
    '/leads': 'leads',
    '/followups': 'tasks',
    '/calendar': 'calendar',
    '/students': 'students',
    '/batches': 'batches',
    '/fees': 'fees',
    '/expenses': 'expenses',
    '/faculty': 'faculty_timetable',
    '/institutions': 'institutions',
    '/reports': 'reports',
    '/import': 'import',
  }
  const base = '/' + location.pathname.split('/').filter(Boolean)[0]
  const featureKey = routeToFeature[base]
  if (featureKey && !profile.is_owner && profile.role !== 'owner') {
    if (!canViewFeature(featureKey)) {
      return <Navigate to={getDefaultRoute(profile.role)} replace />
    }
  }

  if (!canAccessRoute(profile.role, location.pathname, profile.is_owner, profile)) {
    return <Navigate to={getDefaultRoute(profile.role)} replace />
  }

  return <>{children}</>
}

export function RoleGuard({
  permission,
  children,
  fallback = null,
}: {
  permission: Permission
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const { can } = useAuth()
  if (!can(permission)) return <>{fallback}</>
  return <>{children}</>
}
