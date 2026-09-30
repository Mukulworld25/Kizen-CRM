import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

export function useColumnOverrides(tableKey?: string) {
  return useQuery<Record<string, string>>({
    queryKey: ['column_label_overrides', tableKey],
    queryFn: async () => {
      if (!tableKey) return {}
      const { data, error } = await supabase
        .from('column_label_overrides')
        .select('column_key, custom_label')
        .eq('table_key', tableKey)

      if (error) {
        console.warn('Failed to load column label overrides:', error.message)
        return {}
      }

      const map: Record<string, string> = {}
      for (const row of data || []) {
        if (row.column_key && row.custom_label) {
          map[row.column_key] = row.custom_label
        }
      }
      return map
    },
    enabled: !!tableKey,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  })
}

export function useUpdateColumnOverride(tableKey?: string) {
  const queryClient = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async ({ columnKey, customLabel }: { columnKey: string; customLabel: string }) => {
      if (!tableKey) return
      const trimmed = customLabel.trim()

      if (!trimmed) {
        // If blank, reset to default by removing the override row
        const { error } = await supabase
          .from('column_label_overrides')
          .delete()
          .eq('table_key', tableKey)
          .eq('column_key', columnKey)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('column_label_overrides')
          .upsert(
            {
              table_key: tableKey,
              column_key: columnKey,
              custom_label: trimmed,
              updated_by: profile?.id,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'table_key,column_key' }
          )
        if (error) throw error
      }
    },
    onSuccess: () => {
      if (tableKey) {
        queryClient.invalidateQueries({ queryKey: ['column_label_overrides', tableKey] })
      }
      toast.success('Header label updated')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update header label')
    },
  })
}
