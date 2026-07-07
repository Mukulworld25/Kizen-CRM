import type { LeadStatus } from '@/types'
import { LEAD_STATUSES } from '@/types'
import { getStatusLabel } from '@/components/shared/LeadStatusBadge'
import { cn } from '@/lib/utils'
import { ConfirmDialog } from '@/components/shared/PageHeader'
import { useState } from 'react'

const statusColors: Record<LeadStatus, string> = {
  new: 'bg-blue-500',
  contacted: 'bg-cyan-500',
  follow_up_required: 'bg-orange-500',
  demo_scheduled: 'bg-purple-500',
  demo_attended: 'bg-indigo-500',
  interested: 'bg-teal-500',
  negotiation: 'bg-yellow-500',
  application_started: 'bg-lime-500',
  admitted: 'bg-green-500',
  lost: 'bg-red-500',
  not_interested: 'bg-gray-400',
  future_prospect: 'bg-pink-500',
}

interface LeadStatusPipelineProps {
  currentStatus: LeadStatus
  onStatusChange?: (status: LeadStatus) => void
  readonly?: boolean
}

export function LeadStatusPipeline({ currentStatus, onStatusChange, readonly }: LeadStatusPipelineProps) {
  const [pendingStatus, setPendingStatus] = useState<LeadStatus | null>(null)
  const currentIdx = LEAD_STATUSES.indexOf(currentStatus)

  return (
    <>
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max gap-1">
          {LEAD_STATUSES.map((status, idx) => {
            const isActive = status === currentStatus
            const isPast = idx < currentIdx
            return (
              <button
                key={status}
                type="button"
                disabled={readonly || !onStatusChange}
                onClick={() => !readonly && onStatusChange && setPendingStatus(status)}
                className={cn(
                  'flex flex-col items-center gap-1 px-2 py-1 rounded transition-opacity',
                  !readonly && onStatusChange && 'hover:opacity-80 cursor-pointer',
                  readonly && 'cursor-default'
                )}
              >
                <div
                  className={cn(
                    'h-2 w-full min-w-[48px] rounded-full',
                    isActive ? statusColors[status] : isPast ? 'bg-slate-300' : 'bg-slate-100'
                  )}
                />
                <span className={cn('text-[10px] whitespace-nowrap', isActive ? 'font-semibold text-slate-900' : 'text-slate-400')}>
                  {getStatusLabel(status).split(' ')[0]}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingStatus}
        onOpenChange={() => setPendingStatus(null)}
        title="Change lead status?"
        description={`Move this lead to "${pendingStatus ? getStatusLabel(pendingStatus) : ''}"?`}
        onConfirm={() => {
          if (pendingStatus && onStatusChange) onStatusChange(pendingStatus)
          setPendingStatus(null)
        }}
      />
    </>
  )
}
