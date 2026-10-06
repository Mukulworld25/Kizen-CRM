import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useRealtime() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel('kizen-realtime-crm')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        queryClient.invalidateQueries({ queryKey: ['leads'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard-insights'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'follow_ups' }, () => {
        queryClient.invalidateQueries({ queryKey: ['follow-ups'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
        queryClient.invalidateQueries({ queryKey: ['students'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fees' }, () => {
        queryClient.invalidateQueries({ queryKey: ['fees'] })
        queryClient.invalidateQueries({ queryKey: ['students'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard-insights'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fee_payments' }, () => {
        queryClient.invalidateQueries({ queryKey: ['fees'] })
        queryClient.invalidateQueries({ queryKey: ['fee-payments'] })
        queryClient.invalidateQueries({ queryKey: ['installments'] })
        queryClient.invalidateQueries({ queryKey: ['students'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard-insights'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'installments' }, () => {
        queryClient.invalidateQueries({ queryKey: ['installments'] })
        queryClient.invalidateQueries({ queryKey: ['fees'] })
        queryClient.invalidateQueries({ queryKey: ['students'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard-insights'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])
}
