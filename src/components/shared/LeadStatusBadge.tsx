import type { LeadStatus, Priority, LeadTemperature } from '@/types'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const statusConfig: Record<LeadStatus, { label: string; className: string }> = {
  new_lead: { label: 'New Lead', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  contacted: { label: 'Contacted', className: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  follow_up: { label: 'Follow-up', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  demo_booked: { label: 'Demo Booked', className: 'bg-purple-100 text-purple-800 border-purple-200' },
  demo_attended: { label: 'Demo Attended', className: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  negotiation: { label: 'Negotiation', className: 'bg-teal-100 text-teal-800 border-teal-200' },
  registration_pending: { label: 'Registration Pending', className: 'bg-lime-100 text-lime-800 border-lime-200' },
  fee_pending: { label: 'Fee Pending', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  converted: { label: 'Converted', className: 'bg-green-100 text-green-800 border-green-200' },
  lost: { label: 'Lost', className: 'bg-red-100 text-red-800 border-red-200' },
}

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const config = statusConfig[status]
  if (!config) return <Badge variant="outline">{status?.replace(/_/g, ' ')}</Badge>
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

const tempConfig: Record<LeadTemperature, { label: string; className: string }> = {
  hot: { label: 'Hot', className: 'bg-red-100 text-red-800 border-red-200' },
  warm: { label: 'Warm', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  cold: { label: 'Cold', className: 'bg-blue-100 text-blue-800 border-blue-200' },
}

export function TemperatureBadge({ temperature }: { temperature: LeadTemperature | null | undefined }) {
  if (!temperature) return <span className="text-muted-foreground text-xs">—</span>
  const config = tempConfig[temperature]
  return <Badge variant="outline" className={cn('font-normal', config.className)}>{config.label}</Badge>
}

export function getStatusLabel(status: LeadStatus) {
  return statusConfig[status]?.label ?? status?.replace(/_/g, ' ')
}