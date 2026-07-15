import { cn } from '@/lib/utils'

interface FieldValueProps {
  value: string | number | null | undefined
  className?: string
  placeholder?: string
  mono?: boolean
}

export function FieldValue({ value, className, placeholder = 'No data', mono = false }: FieldValueProps) {
  const isEmpty = value === null || value === undefined || value === ''
  return (
    <span
      className={cn(
        isEmpty ? 'text-muted-foreground/50 italic text-sm' : 'text-slate-800',
        mono && !isEmpty && 'font-mono',
        className,
      )}
    >
      {isEmpty ? placeholder : value}
    </span>
  )
}

export function FieldLabel({ label }: { label: string }) {
  return <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
}

export function FieldRow({ label, value, className, mono }: { label: string; value: string | number | null | undefined; className?: string; mono?: boolean }) {
  return (
    <div className={cn('rounded-lg bg-slate-50/80 p-3', className)}>
      <FieldLabel label={label} />
      <p className="font-medium">
        <FieldValue value={value} mono={mono} />
      </p>
    </div>
  )
}