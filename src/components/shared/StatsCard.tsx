import type { LucideIcon } from 'lucide-react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/table'
import { cn } from '@/lib/utils'

interface StatsCardProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon: LucideIcon
  color?: string
  loading?: boolean
  alert?: boolean
}

export function StatsCard({ title, value, change, changeLabel, icon: Icon, color = 'bg-primary', loading, alert }: StatsCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20 mb-2" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('relative overflow-hidden', alert && 'ring-2 ring-accent ring-offset-2')}>
      <div className={cn('absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-1/2 translate-x-1/2 opacity-10', color)} />
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>{title}</CardTitle>
        <div className={cn('rounded-xl p-2.5 text-white shadow-sm', color)}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{value}</div>
        {change !== undefined && (
          <p className="mt-1.5 flex items-center text-xs text-muted-foreground">
            {change >= 0 ? (
              <TrendingUp className="mr-1 h-3 w-3 text-success" />
            ) : (
              <TrendingDown className="mr-1 h-3 w-3 text-danger" />
            )}
            <span className={change >= 0 ? 'text-success' : 'text-danger'}>{change >= 0 ? '+' : ''}{change}</span>
            <span className="ml-1">{changeLabel ?? 'vs yesterday'}</span>
          </p>
        )}
      </CardContent>
    </Card>
  )
}
