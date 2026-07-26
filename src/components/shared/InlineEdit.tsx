import { useState, useEffect, useRef } from 'react'
import { Pencil, Check, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FieldLabel, FieldValue } from '@/components/shared/FieldValue'

export interface InlineEditOption {
  value: string
  label: string
}

interface InlineEditProps {
  label: string
  value: string | number | null | undefined
  onSave: ((newValue: string | number | null) => Promise<void> | void) | undefined
  type?: 'text' | 'number' | 'date' | 'select' | 'textarea'
  options?: InlineEditOption[]
  placeholder?: string
  mono?: boolean
  className?: string
  disabled?: boolean
}

export function InlineEdit({
  label,
  value,
  onSave,
  type = 'text',
  options = [],
  placeholder = 'Click to edit...',
  mono = false,
  className,
  disabled = false,
}: InlineEditProps) {
  // If onSave is provided, the parent has granted permission to edit
  const canEdit = !disabled && onSave !== undefined

  const [isEditing, setIsEditing] = useState(false)
  const [draftValue, setDraftValue] = useState<string>(value !== null && value !== undefined ? String(value) : '')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(null)

  useEffect(() => {
    setDraftValue(value !== null && value !== undefined ? String(value) : '')
  }, [value])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isEditing])

  const handleSave = async () => {
    if (!onSave) return
    try {
      setSaving(true)
      let finalVal: string | number | null = draftValue.trim()
      if (finalVal === '') {
        finalVal = null
      } else if (type === 'number') {
        const num = Number(finalVal)
        finalVal = isNaN(num) ? null : num
      }
      await onSave(finalVal)
      setIsEditing(false)
    } catch {
      // Error handling managed by parent toast/mutation
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setDraftValue(value !== null && value !== undefined ? String(value) : '')
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && type !== 'textarea') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }

  const displayValue = () => {
    if (type === 'select' && options.length > 0) {
      const match = options.find((o) => o.value === String(value))
      return match ? match.label : value
    }
    return value
  }

  if (!canEdit) {
    return (
      <div className={cn('rounded-lg bg-slate-50/80 p-3', className)}>
        <FieldLabel label={label} />
        <p className="font-medium text-sm">
          <FieldValue value={displayValue()} mono={mono} />
        </p>
      </div>
    )
  }

  if (isEditing) {
    return (
      <div className={cn('rounded-lg border border-primary/50 bg-white p-2.5 shadow-sm transition-all', className)}>
        <FieldLabel label={label} />
        <div className="mt-1 flex items-center gap-1.5">
          {type === 'select' ? (
            <select
              ref={inputRef as React.RefObject<HTMLSelectElement>}
              value={draftValue}
              onChange={(e) => setDraftValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={saving}
              className="flex-1 rounded border border-input bg-background px-2 py-1 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">-- Select --</option>
              {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : type === 'textarea' ? (
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={draftValue}
              onChange={(e) => setDraftValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={saving}
              rows={2}
              className="flex-1 rounded border border-input bg-background px-2 py-1 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type={type}
              value={draftValue}
              onChange={(e) => setDraftValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={saving}
              placeholder={placeholder}
              className={cn(
                'flex-1 rounded border border-input bg-background px-2 py-1 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary',
                mono && 'font-mono'
              )}
            />
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex h-7 w-7 items-center justify-center rounded bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
            title="Save"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={saving}
            className="flex h-7 w-7 items-center justify-center rounded border border-border bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            title="Cancel"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={cn(
        'group relative rounded-lg bg-slate-50/80 p-3 hover:bg-primary/5 hover:border-primary/30 border border-transparent transition-all cursor-pointer',
        className
      )}
      title="Click to edit"
    >
      <div className="flex items-center justify-between">
        <FieldLabel label={label} />
        <Pencil className="h-3 w-3 text-muted-foreground/0 group-hover:text-primary transition-opacity" />
      </div>
      <p className="font-medium text-sm">
        <FieldValue value={displayValue()} mono={mono} />
      </p>
    </div>
  )
}