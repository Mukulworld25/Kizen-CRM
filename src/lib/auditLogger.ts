import { supabase } from '@/lib/supabase'

export interface AuditLogOptions {
  action: string
  entityType: 'auth' | 'student' | 'lead' | 'fee' | 'expense' | 'meeting' | 'task' | 'batch' | 'course' | 'system' | 'trash'
  entityId?: string | null
  entityName?: string | null
  details?: string | null
  userId?: string | null
  oldData?: Record<string, any> | null
  newData?: Record<string, any> | null
}

/**
 * Enterprise Audit Logger: Writes an immutable audit trail entry to the database.
 * Fail-safe: Any network or database warning is caught silently to prevent interrupting user actions.
 */
export async function logAuditEvent(options: AuditLogOptions): Promise<void> {
  try {
    let resolvedUserId = options.userId
    if (!resolvedUserId) {
      const { data: { session } } = await supabase.auth.getSession()
      resolvedUserId = session?.user?.id || null
    }

    const payloadNewData = {
      ...(options.newData || {}),
      entity_name: options.entityName || options.newData?.entity_name || undefined,
      details: options.details || options.newData?.details || undefined,
    }

    await supabase.from('audit_logs').insert({
      user_id: resolvedUserId,
      action: options.action,
      entity_type: options.entityType,
      entity_id: options.entityId || null,
      old_data: options.oldData || null,
      new_data: payloadNewData,
    })
  } catch (err) {
    console.warn('Audit logging failed silently:', err)
  }
}
