import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { hasPermission, type Permission } from '@/lib/permissions'
import type { User } from '@/types'

interface AuthContextValue {
  session: Session | null
  profile: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  can: (permission: Permission) => boolean
  isOwner: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (authId: string): Promise<User | null> => {
    let { data } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', authId)
      .maybeSingle()

    if (!data) {
      // Fallback: match by current session user email if auth_id isn't linked yet
      const userEmail = (await supabase.auth.getUser()).data.user?.email
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

    if (!data) {
      setProfile(null)
      return null
    }

    if (!data.is_active) {
      await supabase.auth.signOut()
      setProfile(null)
      return null
    }

    const userObj = data as User
    setProfile(userObj)
    return userObj
  }, [])

  const refreshProfile = useCallback(async () => {
    if (session?.user?.id) await fetchProfile(session.user.id)
  }, [session, fetchProfile])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      if (s?.user?.id) {
        fetchProfile(s.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (s?.user?.id) {
        fetchProfile(s.user.id).finally(() => setLoading(false))
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
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

  const isOwner = profile?.is_owner ?? false

  const can = (permission: Permission) =>
    hasPermission(profile?.role, permission, isOwner)

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, signOut, refreshProfile, can, isOwner }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
