import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export type EntityTable = 'leads' | 'students' | 'institutions' | 'institute_expenses'

export interface DeletedRecord {
  id: string
  table: EntityTable
  name: string
  deleted_at: string
}

export function useSoftDelete() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async ({ table, id }: { table: EntityTable; id: string }) => {
      const now = new Date().toISOString()
      const { error } = await supabase
        .from(table)
        .update({ is_deleted: true, deleted_at: now })
        .eq('id', id)
      if (error) throw error

      try { await supabase.from('audit_logs').insert({
        user_id: profile?.id,
        action: 'soft_delete',
        entity_type: table,
        entity_id: id,
        new_data: { is_deleted: true, deleted_at: now },
      }) } catch (_) {}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash'] })
      toast.success('Record moved to trash')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Delete failed'),
  })
}

export function usePermanentDelete() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async ({ table, id }: { table: EntityTable; id: string }) => {
      try { await supabase.from('audit_logs').insert({
        user_id: profile?.id,
        action: 'permanent_delete',
        entity_type: table,
        entity_id: id,
      }) } catch (_) {}

      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash'] })
      toast.success('Permanently deleted')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Permanent delete failed'),
  })
}

export function useRestore() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async ({ table, id }: { table: EntityTable; id: string }) => {
      const { error } = await supabase
        .from(table)
        .update({ is_deleted: false, deleted_at: null })
        .eq('id', id)
      if (error) throw error

      try { await supabase.from('audit_logs').insert({
        user_id: profile?.id,
        action: 'restore',
        entity_type: table,
        entity_id: id,
      }) } catch (_) {}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash'] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['students'] })
      queryClient.invalidateQueries({ queryKey: ['institutions'] })
      queryClient.invalidateQueries({ queryKey: ['institute-expenses'] })
      toast.success('Record restored')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Restore failed'),
  })
}

export function useTrash() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['trash', profile?.id],
    queryFn: async () => {
      const results: DeletedRecord[] = []

      const [leadsRes, studentsRes, institutionsRes, expensesRes] = await Promise.all([
        supabase.from('leads').select('id, full_name, deleted_at').eq('is_deleted', true),
        supabase.from('students').select('id, full_name, deleted_at').eq('is_deleted', true),
        supabase.from('institutions').select('id, name, deleted_at').eq('is_deleted', true),
        supabase.from('institute_expenses').select('id, category, amount, deleted_at').eq('is_deleted', true),
      ])

      for (const row of leadsRes.data ?? []) {
        results.push({ id: row.id, table: 'leads' as EntityTable, name: row.full_name ?? 'Unknown Lead', deleted_at: row.deleted_at })
      }
      for (const row of studentsRes.data ?? []) {
        results.push({ id: row.id, table: 'students' as EntityTable, name: row.full_name ?? 'Unknown Student', deleted_at: row.deleted_at })
      }
      for (const row of institutionsRes.data ?? []) {
        results.push({ id: row.id, table: 'institutions' as EntityTable, name: row.name ?? 'Unknown Institution', deleted_at: row.deleted_at })
      }
      for (const row of expensesRes.data ?? []) {
        results.push({ id: row.id, table: 'institute_expenses' as EntityTable, name: `${row.category ?? 'expense'} — ₹${row.amount ?? 0}`, deleted_at: row.deleted_at })
      }

      return results.sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime())
    },
    enabled: !!profile,
  })
}