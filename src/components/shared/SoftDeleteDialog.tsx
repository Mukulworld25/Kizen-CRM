import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/input'
import { AlertTriangle } from 'lucide-react'

interface SoftDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  entityType: string
  entityName: string
  onConfirm: () => void
  loading?: boolean
}

export function SoftDeleteDialog({ open, onOpenChange, title, entityType, entityName, onConfirm, loading }: SoftDeleteDialogProps) {
  const [typed, setTyped] = useState('')
  const confirmed = typed === 'DELETE'
  const handleClose = () => { setTyped(''); onOpenChange(false) }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: 'rgba(239,83,80,0.15)' }}>
              <AlertTriangle className="h-5 w-5" style={{ color: '#ef5350' }} />
            </div>
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription className="mt-1">
                This will soft-delete this {entityType}. It will be hidden from all views but remains recoverable for 30 days.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-2">
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
            Type <span className="font-bold" style={{ color: '#ef5350' }}>DELETE</span> to confirm deletion of:
          </p>
          <p className="text-sm rounded p-2 mb-3 font-mono" style={{ background: 'var(--muted)', color: 'var(--foreground)' }}>“{entityName}”</p>
          <Label htmlFor="delete-confirm">Confirmation</Label>
          <Input
            id="delete-confirm"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Type DELETE to confirm"
            className="mt-1"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button
            variant="destructive"
            disabled={!confirmed || loading}
            onClick={() => {
              if (confirmed) onConfirm()
              setTyped('')
            }}
          >
            {loading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}