import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export interface FeaturePermissionRow {
  id?: string
  feature_key: string
  role?: string | null
  user_id?: string | null
  can_view: boolean
  can_edit: boolean
  granted_by?: string | null
  granted_at?: string
}

export const DEFAULT_FACULTY_FEATURES = ['students', 'tasks', 'calendar', 'study_materials', 'dashboard']
export const DEFAULT_COUNSELOR_FEATURES = ['dashboard', 'leads', 'tasks', 'calendar', 'students', 'fees']
export const DEFAULT_RECEPTION_FEATURES = ['dashboard', 'leads', 'tasks', 'calendar', 'students']

export function useFeaturePermissions() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const isOwner = profile?.is_owner || profile?.role === 'owner'

  const { data: dbPermissions = [], isLoading } = useQuery<FeaturePermissionRow[]>({
    queryKey: ['feature_permissions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('feature_permissions').select('*')
      if (error) {
        console.error('Error fetching feature_permissions:', error.message)
        return []
      }
      return data || []
    },
  })

  // Check if a specific feature is accessible to current user
  const canViewFeature = (featureKey: string): boolean => {
    if (isOwner) return true // Owner role: full access to all tabs, all data, no filters

    const userRole = profile?.role
    const userId = profile?.id

    // 1. Check user-specific DB permission
    if (userId) {
      const userPerm = dbPermissions.find(
        (p) => p.feature_key === featureKey && p.user_id === userId
      )
      if (userPerm !== undefined) return userPerm.can_view
    }

    // 2. Check role-specific DB permission
    if (userRole) {
      const rolePerm = dbPermissions.find(
        (p) => p.feature_key === featureKey && p.role === userRole && !p.user_id
      )
      if (rolePerm !== undefined) return rolePerm.can_view
    }

    // 3. Defaults based on role
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
  }

  // Toggle permission mutation in Supabase feature_permissions table
  const togglePermissionMutation = useMutation({
    mutationFn: async (payload: {
      feature_key: string
      role?: string | null
      user_id?: string | null
      can_view: boolean
      can_edit: boolean
    }) => {
      // Find existing entry if any
      let matchQuery = supabase
        .from('feature_permissions')
        .select('id')
        .eq('feature_key', payload.feature_key)

      if (payload.user_id) {
        matchQuery = matchQuery.eq('user_id', payload.user_id)
      } else if (payload.role) {
        matchQuery = matchQuery.eq('role', payload.role).is('user_id', null)
      }

      const { data: existing } = await matchQuery.maybeSingle()

      if (existing?.id) {
        // Update
        const { error } = await supabase
          .from('feature_permissions')
          .update({
            can_view: payload.can_view,
            can_edit: payload.can_edit,
            granted_by: profile?.id || null,
            granted_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
        if (error) throw error
      } else {
        // Insert
        const { error } = await supabase.from('feature_permissions').insert({
          feature_key: payload.feature_key,
          role: payload.role || null,
          user_id: payload.user_id || null,
          can_view: payload.can_view,
          can_edit: payload.can_edit,
          granted_by: profile?.id || null,
          granted_at: new Date().toISOString(),
        })
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature_permissions'] })
    },
  })

  return {
    dbPermissions,
    isLoading,
    isOwner,
    canViewFeature,
    togglePermission: togglePermissionMutation.mutateAsync,
    isUpdating: togglePermissionMutation.isPending,
  }
}
