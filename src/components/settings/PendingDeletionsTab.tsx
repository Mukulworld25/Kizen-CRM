import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input, Label } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { CheckCircle2, XCircle, ShieldAlert } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

export interface DeletionRequestRow {
  id: string
  table_name: string
  record_id: string
  requested_by: string
  record_label: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  requested_at: string
  reviewed_by: string | null
  reviewed_at: string | null
  review_note: string | null
  requester?: {
    name: string
    email: string
  }
}

export function PendingDeletionsTab() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<DeletionRequestRow | null>(null)
  const [rejectNote, setRejectNote] = useState('')

  const { data: requests = [], isLoading } = useQuery<DeletionRequestRow[]>({
    queryKey: ['deletion_requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deletion_requests')
        .select('*, requester:users!requested_by(name, email)')
        .eq('status', 'pending')
        .order('requested_at', { ascending: false })
      if (error) throw error
      return (data || []) as DeletionRequestRow[]
    },
  })

  const approveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase.rpc('approve_deletion', {
        p_request_id: requestId,
        p_reviewer_id: profile?.id,
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Deletion request approved and executed', { icon: '✅' })
      queryClient.invalidateQueries({ queryKey: ['deletion_requests'] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['fees'] })
      queryClient.invalidateQueries({ queryKey: ['batches'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to approve deletion')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: async ({ requestId, note }: { requestId: string; note: string }) => {
      const { error } = await supabase.rpc('reject_deletion', {
        p_request_id: requestId,
        p_reviewer_id: profile?.id,
        p_note: note,
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Deletion request rejected', { icon: '❌' })
      queryClient.invalidateQueries({ queryKey: ['deletion_requests'] })
      setRejectModalOpen(false)
      setSelectedRequest(null)
      setRejectNote('')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to reject deletion')
    },
  })

  const handleApprove = (req: DeletionRequestRow) => {
    approveMutation.mutate(req.id)
  }

  const handleOpenReject = (req: DeletionRequestRow) => {
    setSelectedRequest(req)
    setRejectNote('')
    setRejectModalOpen(true)
  }

  const handleConfirmReject = () => {
    if (!selectedRequest) return
    rejectMutation.mutate({
      requestId: selectedRequest.id,
      note: rejectNote.trim() || 'Rejected by owner',
    })
  }

  return (
    <Card className="shadow-sm border border-slate-200">
      <CardHeader className="border-b pb-4 bg-slate-50/60 rounded-t-xl">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-600" />
              Staff Deletion Requests Queue
            </CardTitle>
            <CardDescription className="mt-1 text-xs text-slate-500">
              Review and approve or reject entity deletion requests submitted by staff members across Leads, Fees, and Batches.
            </CardDescription>
          </div>
          <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 font-semibold px-2.5 py-1">
            {requests.length} Pending Approval
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold text-xs">Entity Type</TableHead>
              <TableHead className="font-semibold text-xs">Target Record</TableHead>
              <TableHead className="font-semibold text-xs">Reason Provided</TableHead>
              <TableHead className="font-semibold text-xs">Requested By</TableHead>
              <TableHead className="font-semibold text-xs">Requested At</TableHead>
              <TableHead className="font-semibold text-xs text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-500">
                  Loading pending deletion requests...
                </TableCell>
              </TableRow>
            ) : requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                    <p className="text-sm font-medium text-slate-700">No pending deletion requests</p>
                    <p className="text-xs text-slate-400">All deletion requests have been processed.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Badge variant="outline" className="capitalize text-xs font-semibold text-slate-700 bg-slate-100">
                      {r.table_name}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-slate-900 text-xs max-w-xs truncate" title={r.record_label}>
                    {r.record_label}
                  </TableCell>
                  <TableCell className="text-slate-600 text-xs max-w-xs truncate" title={r.reason}>
                    {r.reason || '—'}
                  </TableCell>
                  <TableCell className="text-xs text-slate-700">
                    <span className="font-semibold">{r.requester?.name || 'Staff'}</span>
                    {r.requester?.email && (
                      <span className="block text-[11px] text-slate-400">{r.requester.email}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                    {r.requested_at ? format(new Date(r.requested_at), 'dd MMM yyyy, hh:mm a') : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1"
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                        onClick={() => handleApprove(r)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2.5 text-xs text-rose-700 border-rose-200 hover:bg-rose-50 font-medium gap-1"
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                        onClick={() => handleOpenReject(r)}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Reject Modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-rose-600 flex items-center gap-2">
              <XCircle className="h-5 w-5" /> Reject Deletion Request
            </DialogTitle>
            <DialogDescription className="text-xs">
              Provide a note or reason for rejecting the deletion of{' '}
              <span className="font-semibold text-slate-900">{selectedRequest?.record_label}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="reject-note" className="text-xs font-semibold text-slate-700">
              Rejection Note / Feedback
            </Label>
            <Input
              id="reject-note"
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="e.g. Lead is still active, fee record needed for audit..."
              className="mt-1 text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={rejectMutation.isPending}
              onClick={handleConfirmReject}
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
