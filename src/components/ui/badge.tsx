import * as React from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
        {
          'border-transparent bg-primary text-white': variant === 'default',
          'border-transparent bg-slate-100 text-slate-700': variant === 'secondary',
          'border-transparent bg-danger text-white': variant === 'destructive',
          'border-border text-slate-600': variant === 'outline',
          'border-transparent bg-success text-white': variant === 'success',
          'border-transparent bg-accent text-white': variant === 'warning',
        },
        className
      )}
      {...props}
    />
  )
}
