import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

export function useFilterBarConfig(tableKey: string, defaultOrder: string[]) {
  return useQuery<string[]>({
    queryKey: ['filter_bar_config', tableKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('filter_bar_config')
        .select('filter_order')
        .eq('table_key', tableKey)
        .maybeSingle()

      if (error) {
        console.warn('Failed to load filter bar config:', error.message)
        return defaultOrder
      }

      if (data && Array.isArray(data.filter_order) && data.filter_order.length > 0) {
        const savedOrder = data.filter_order as string[]
        // Preserve saved order, then append any items in defaultOrder not in savedOrder
        const combined = [...savedOrder]
        for (const key of defaultOrder) {
          if (!combined.includes(key)) {
            combined.push(key)
          }
        }
        return combined
      }

      return defaultOrder
    },
    staleTime: 1000 * 60 * 5,
  })
}

export function useUpdateFilterBarConfig(tableKey: string) {
  const queryClient = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async (filterOrder: string[]) => {
      const { error } = await supabase
        .from('filter_bar_config')
        .upsert(
          {
            table_key: tableKey,
            filter_order: filterOrder,
            updated_by: profile?.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'table_key' }
        )
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filter_bar_config', tableKey] })
      toast.success('Filter order saved')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save filter order')
    },
  })
}
