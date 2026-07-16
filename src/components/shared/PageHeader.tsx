import { Button } from '@/components/ui/button'

interface PageHeaderProps {
  title: string
  description?: string
  children?: React.ReactNode
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/5">
        <span className="text-2xl">📋</span>
      </div>
      <h3 className="text-lg font-semibold text-primary">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  loading,
  destructive,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onConfirm: () => void
  loading?: boolean
  destructive?: boolean
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl p-6 shadow-lg" style={{ background: 'var(--popover)', color: 'var(--popover-foreground)' }}>
        <h3 className="text-lg font-semibold text-primary">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant={destructive ? 'destructive' : 'default'} onClick={onConfirm} disabled={loading}>
            {loading ? 'Processing...' : 'Confirm'}
          </Button>
        </div>
      </div>
    </div>
  )
}
