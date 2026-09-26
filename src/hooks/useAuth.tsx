import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { hasPermission, isUserHod, type Permission } from '@/lib/permissions'
import { DEFAULT_FACULTY_FEATURES, DEFAULT_COUNSELOR_FEATURES, DEFAULT_RECEPTION_FEATURES, type FeaturePermissionRow } from '@/hooks/useFeaturePermissions'
import type { User } from '@/types'

interface AuthContextValue {
  session: Session | null
  profile: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  can: (permission: Permission) => boolean
  canViewFeature: (featureKey: string) => boolean
  canEditFeature: (featureKey: string) => boolean
  isOwner: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (authId: string): Promise<User | null> => {
    try {
      let { data } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', authId)
        .maybeSingle()

      if (!data) {
        // Fallback: match by current session user email if auth_id isn't linked yet
        const { data: userData } = await supabase.auth.getUser()
        const userEmail = userData?.user?.email
        if (userEmail) {
          const { data: byEmail } = await supabase
            .from('users')
            .select('*')
            .ilike('email', userEmail)
            .maybeSingle()

          if (byEmail) {
            // Auto-link auth_id so future queries hit index directly
            await supabase.from('users').update({ auth_id: authId }).eq('id', byEmail.id)
            data = { ...byEmail, auth_id: authId }
          }
        }
      }

      if (!data || !data.is_active) {
        setProfile(null)
        return null
      }

      const userObj = data as User
      setProfile(userObj)
      return userObj
    } catch (err) {
      console.error('fetchProfile error:', err)
      setProfile(null)
      return null
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (session?.user?.id) await fetchProfile(session.user.id)
  }, [session, fetchProfile])

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return
      setSession(s)
      if (s?.user?.id) {
        fetchProfile(s.user.id).finally(() => {
          if (mounted) setLoading(false)
        })
      } else {
        setLoading(false)
      }
    }).catch(() => {
      if (mounted) setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return
      setSession(s)
      if (s?.user?.id) {
        fetchProfile(s.user.id).finally(() => {
          if (mounted) setLoading(false)
        })
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      if (data.user?.id) {
        setSession(data.session)
        const u = await fetchProfile(data.user.id)
        if (u?.id) {
          try {
            await supabase.from('audit_logs').insert({
              user_id: u.id,
              action: 'user_login',
              entity_type: 'auth',
              new_data: { email: u.email, role: u.role, login_at: new Date().toISOString() }
            })
          } catch {}
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }

  const [featurePermissions, setFeaturePermissions] = useState<FeaturePermissionRow[]>([])

  const fetchFeaturePermissions = useCallback(async () => {
    try {
      const { data } = await supabase.from('feature_permissions').select('*')
      if (data) setFeaturePermissions(data)
    } catch (e) {
      console.error('Error fetching feature permissions in AuthProvider:', e)
    }
  }, [])

  useEffect(() => {
    fetchFeaturePermissions()

    const handlePermUpdate = () => {
      fetchFeaturePermissions()
    }
    window.addEventListener('kizen_permissions_updated', handlePermUpdate)
    return () => {
      window.removeEventListener('kizen_permissions_updated', handlePermUpdate)
    }
  }, [fetchFeaturePermissions])

  const isOwner = profile?.is_owner ?? false

  const canViewFeature = useCallback((featureKey: string): boolean => {
    if (isOwner) return true

    const userRole = profile?.role
    const userId = profile?.id

    if (userId) {
      const userPerm = featurePermissions.find(
        (p) => p.feature_key === featureKey && p.user_id === userId
      )
      if (userPerm !== undefined) return userPerm.can_view
    }

    if (userRole) {
      const rolePerm = featurePermissions.find(
        (p) => p.feature_key === featureKey && p.role === userRole && !p.user_id
      )
      if (rolePerm !== undefined) return rolePerm.can_view
    }

    if (userRole === 'faculty' || userRole === 'hod') {
      return DEFAULT_FACULTY_FEATURES.includes(featureKey)
    }
    if (userRole === 'counselor') {
      return DEFAULT_COUNSELOR_FEATURES.includes(featureKey)
    }
    if (userRole === 'reception') {
      return DEFAULT_RECEPTION_FEATURES.includes(featureKey)
    }

    return true
  }, [isOwner, profile, featurePermissions])

  const canEditFeature = useCallback((featureKey: string): boolean => {
    if (isOwner) return true

    const userRole = profile?.role
    const userId = profile?.id

    if (userId) {
      const userPerm = featurePermissions.find(
        (p) => p.feature_key === featureKey && p.user_id === userId
      )
      if (userPerm !== undefined) return userPerm.can_edit
    }

    if (userRole) {
      const rolePerm = featurePermissions.find(
        (p) => p.feature_key === featureKey && p.role === userRole && !p.user_id
      )
      if (rolePerm !== undefined) return rolePerm.can_edit
    }

    return canViewFeature(featureKey)
  }, [isOwner, profile, featurePermissions, canViewFeature])

  const can = useCallback((permission: Permission): boolean => {
    if (isOwner) return true

    if (isUserHod(profile) && (permission === 'manageCourses' || permission === 'manageBatches' || permission === 'assignFaculty')) {
      return true
    }
    if (profile?.role === 'hod' && (permission === 'manageCourses' || permission === 'manageBatches' || permission === 'assignFaculty')) {
      return true
    }

    // Connect to database feature_permissions matrix
    const permissionFeatureMap: Partial<Record<Permission, { feature: string; edit?: boolean }>> = {
      viewDashboard: { feature: 'dashboard' },
      viewLeads: { feature: 'leads' },
      editLeads: { feature: 'leads', edit: true },
      deleteLeads: { feature: 'leads', edit: true },
      addLeads: { feature: 'leads', edit: true },
      exportData: { feature: 'leads' },
      viewFollowUps: { feature: 'tasks' },
      viewStudents: { feature: 'students' },
      editStudents: { feature: 'students', edit: true },
      markAttendance: { feature: 'students', edit: true },
      viewFees: { feature: 'fees' },
      recordPayments: { feature: 'fees', edit: true },
      generateInvoices: { feature: 'fees', edit: true },
      viewReports: { feature: 'reports' },
      viewRevenue: { feature: 'reports' },
      manageCourses: { feature: 'batches', edit: true },
      manageBatches: { feature: 'batches', edit: true },
      assignFaculty: { feature: 'batches', edit: true },
      assignCounselor: { feature: 'leads', edit: true },
      viewInstitutions: { feature: 'institutions' },
      editInstitutions: { feature: 'institutions', edit: true },
      viewExpenses: { feature: 'expenses' },
      manageExpenses: { feature: 'expenses', edit: true },
      viewFacultyDashboard: { feature: 'faculty_timetable' },
      importData: { feature: 'import', edit: true },
      viewCalendar: { feature: 'calendar' },
    }

    const mapping = permissionFeatureMap[permission]
    if (mapping) {
      if (!canViewFeature(mapping.feature)) return false
      if (mapping.edit && !canEditFeature(mapping.feature)) return false
    }

    return hasPermission(profile?.role, permission, isOwner, profile)
  }, [isOwner, profile, canViewFeature, canEditFeature])

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, signOut, refreshProfile, can, canViewFeature, canEditFeature, isOwner }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
