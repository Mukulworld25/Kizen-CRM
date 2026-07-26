import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { canAccessRoute, getDefaultRoute } from '@/lib/permissions'
import type { Permission } from '@/lib/permissions'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, profile, loading } = useAuth()
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

  if (!canAccessRoute(profile.role, location.pathname, profile.is_owner)) {
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
