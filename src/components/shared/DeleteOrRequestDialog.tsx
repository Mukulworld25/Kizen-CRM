import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { AlertTriangle, Send } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface DeleteOrRequestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tableName: string
  recordId: string | null | undefined
  recordLabel: string
  onDirectDelete?: () => Promise<void> | void
  loading?: boolean
  entityType?: string
}

export function DeleteOrRequestDialog({
  open,
  onOpenChange,
  tableName,
  recordId,
  recordLabel,
  onDirectDelete,
  loading = false,
  entityType = 'record',
}: DeleteOrRequestDialogProps) {
  const { profile, isOwner } = useAuth()
  const [typed, setTyped] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const confirmed = typed === 'DELETE'

  const handleClose = () => {
    setTyped('')
    setReason('')
    onOpenChange(false)
  }

  const handleOwnerDelete = async () => {
    if (onDirectDelete) {
      await onDirectDelete()
    }
    handleClose()
  }

  const handleStaffRequest = async () => {
    if (!recordId || !profile?.id) return
    setSubmitting(true)
    try {
      const { error } = await supabase.rpc('request_deletion', {
        p_table_name: tableName,
        p_record_id: recordId,
        p_requested_by: profile.id,
        p_record_label: recordLabel || `ID: ${recordId}`,
        p_reason: reason.trim() || 'Deletion requested by staff member',
      })
      if (error) throw error
      toast.success('Deletion request submitted for owner approval', { icon: '⏳' })
      handleClose()
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit deletion request')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full shrink-0"
              style={{ background: isOwner ? 'rgba(239,83,80,0.15)' : 'rgba(245,158,11,0.15)' }}
            >
              <AlertTriangle className="h-5 w-5" style={{ color: isOwner ? '#ef5350' : '#d97706' }} />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                {isOwner ? `Delete ${entityType}?` : `Request ${entityType} Deletion`}
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs">
                {isOwner
                  ? `This action will remove or soft-delete this ${entityType}.`
                  : `As a staff member, your request will be queued for owner approval before removal.`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-2 space-y-3">
          <div className="rounded-lg p-2.5 bg-slate-50 border border-slate-200">
            <p className="text-xs text-slate-500 font-medium">Target {entityType}:</p>
            <p className="text-sm font-semibold text-slate-900 truncate mt-0.5">{recordLabel || recordId}</p>
          </div>

          {isOwner ? (
            <div>
              <p className="text-xs font-medium mb-1 text-slate-700">
                Type <span className="font-bold text-rose-600">DELETE</span> to confirm:
              </p>
              <Input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="mt-1 font-mono text-sm"
              />
            </div>
          ) : (
            <div>
              <Label htmlFor="del-reason" className="text-xs font-semibold text-slate-700">
                Reason for Deletion
              </Label>
              <Input
                id="del-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Duplicate entry, student cancelled, wrong course..."
                className="mt-1 text-sm"
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={handleClose} disabled={loading || submitting}>
            Cancel
          </Button>
          {isOwner ? (
            <Button
              variant="destructive"
              size="sm"
              disabled={!confirmed || loading}
              onClick={handleOwnerDelete}
            >
              {loading ? 'Deleting...' : 'Delete'}
            </Button>
          ) : (
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white font-medium gap-1.5"
              disabled={submitting}
              onClick={handleStaffRequest}
            >
              <Send className="h-3.5 w-3.5" />
              {submitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
