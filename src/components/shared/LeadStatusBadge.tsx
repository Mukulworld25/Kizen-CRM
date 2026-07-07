import type { LeadStatus, Priority } from '@/types'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const statusConfig: Record<LeadStatus, { label: string; className: string }> = {
  new: { label: 'New', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  contacted: { label: 'Contacted', className: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  follow_up_required: { label: 'Follow-up Required', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  demo_scheduled: { label: 'Demo Scheduled', className: 'bg-purple-100 text-purple-800 border-purple-200' },
  demo_attended: { label: 'Demo Attended', className: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  interested: { label: 'Interested', className: 'bg-teal-100 text-teal-800 border-teal-200' },
  negotiation: { label: 'Negotiation', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  application_started: { label: 'Application Started', className: 'bg-lime-100 text-lime-800 border-lime-200' },
  admitted: { label: 'Admitted', className: 'bg-green-100 text-green-800 border-green-200' },
  lost: { label: 'Lost', className: 'bg-red-100 text-red-800 border-red-200' },
  not_interested: { label: 'Not Interested', className: 'bg-gray-100 text-gray-800 border-gray-200' },
  future_prospect: { label: 'Future Prospect', className: 'bg-pink-100 text-pink-800 border-pink-200' },
}

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const config = statusConfig[status]
  return (
    <Badge variant="outline" className={cn('font-normal', config.className)}>
      {config.label}
    </Badge>
  )
}

const priorityConfig: Record<Priority, { label: string; className: string }> = {
  high: { label: 'High', className: 'bg-red-100 text-red-800' },
  medium: { label: 'Medium', className: 'bg-yellow-100 text-yellow-800' },
  low: { label: 'Low', className: 'bg-green-100 text-green-800' },
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const config = priorityConfig[priority]
  return <Badge variant="outline" className={cn('font-normal', config.className)}>{config.label}</Badge>
}

export function getStatusLabel(status: LeadStatus) {
  return statusConfig[status].label
}
