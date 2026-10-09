import * as React from 'react'
import { cn } from '@/lib/utils'

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-slate-200', className)} {...props} />
}

export function Table({ className, containerClassName, ...props }: React.HTMLAttributes<HTMLTableElement> & { containerClassName?: string }) {
  return (
    <div className={cn('relative w-full overflow-auto min-h-[520px] max-h-[calc(100vh-210px)]', containerClassName)}>
      <table className={cn('w-full caption-bottom text-sm border-separate border-spacing-0', className)} {...props} />
    </div>
  )
}

export function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('sticky top-0 z-20 bg-slate-50/95 dark:bg-[#162338]/95 backdrop-blur-md [&_tr]:border-b', className)} {...props} />
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('border-b transition-colors hover:bg-[var(--muted)] data-[state=selected]:bg-[var(--muted)]', className)} style={{ borderColor: 'var(--border)' }} {...props} />
}

export function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'h-10 px-4 text-left align-middle font-semibold text-xs text-slate-700 dark:text-slate-200 sticky top-0 z-20 bg-slate-50 dark:bg-[#162338] border-b border-border shadow-[0_1px_2px_rgba(0,0,0,0.05)]',
        className
      )}
      {...props}
    />
  )
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('py-2.5 px-4 align-middle border-b border-border/40 text-sm', className)} {...props} />
}
