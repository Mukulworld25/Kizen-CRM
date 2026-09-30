import { useState, useEffect, type ReactNode } from 'react'
import { GripVertical } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useFilterBarConfig, useUpdateFilterBarConfig } from '@/hooks/useFilterBarConfig'
import { cn } from '@/lib/utils'

export interface FilterItem {
  key: string
  label?: string
  component: ReactNode
}

interface CustomizableFilterBarProps {
  tableKey: string
  items: FilterItem[]
  defaultOrder: string[]
  className?: string
}

export function CustomizableFilterBar({
  tableKey,
  items,
  defaultOrder,
  className,
}: CustomizableFilterBarProps) {
  const { isOwner } = useAuth()
  const { data: savedOrder = defaultOrder } = useFilterBarConfig(tableKey, defaultOrder)
  const updateConfig = useUpdateFilterBarConfig(tableKey)

  const [order, setOrder] = useState<string[]>(defaultOrder)
  const [draggedKey, setDraggedKey] = useState<string | null>(null)
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)

  // Sync state whenever savedOrder loads or changes
  useEffect(() => {
    if (savedOrder && savedOrder.length > 0) {
      setOrder(savedOrder)
    }
  }, [savedOrder])

  // Map of items by key
  const itemMap = new Map<string, FilterItem>()
  for (const item of items) {
    itemMap.set(item.key, item)
  }

  // Ensure all current items are accounted for
  const orderedItems: FilterItem[] = []
  for (const key of order) {
    const it = itemMap.get(key)
    if (it) orderedItems.push(it)
  }
  // Append any missing items from items
  for (const item of items) {
    if (!order.includes(item.key)) {
      orderedItems.push(item)
    }
  }

  const handleDragStart = (e: React.DragEvent, key: string) => {
    if (!isOwner) return
    e.dataTransfer.setData('text/plain', key)
    e.dataTransfer.effectAllowed = 'move'
    setDraggedKey(key)
  }

  const handleDragOver = (e: React.DragEvent, key: string) => {
    if (!isOwner) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverKey !== key) {
      setDragOverKey(key)
    }
  }

  const handleDragLeave = () => {
    setDragOverKey(null)
  }

  const handleDrop = (e: React.DragEvent, targetKey: string) => {
    if (!isOwner) return
    e.preventDefault()
    setDragOverKey(null)

    const sourceKey = draggedKey || e.dataTransfer.getData('text/plain')
    if (!sourceKey || sourceKey === targetKey) {
      setDraggedKey(null)
      return
    }

    const currentKeys = orderedItems.map((i) => i.key)
    const oldIndex = currentKeys.indexOf(sourceKey)
    const newIndex = currentKeys.indexOf(targetKey)

    if (oldIndex !== -1 && newIndex !== -1) {
      const nextOrder = [...currentKeys]
      const [moved] = nextOrder.splice(oldIndex, 1)
      nextOrder.splice(newIndex, 0, moved)

      setOrder(nextOrder)
      updateConfig.mutate(nextOrder)
    }

    setDraggedKey(null)
  }

  return (
    <div
      className={cn(
        'mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border p-3 shadow-sm transition-all',
        className
      )}
      style={{ background: 'var(--card)' }}
    >
      {orderedItems.map((item) => {
        const isDragging = draggedKey === item.key
        const isOver = dragOverKey === item.key

        if (!isOwner) {
          // Read-only presentation for non-owner roles
          return (
            <div key={item.key} className="flex items-center">
              {item.component}
            </div>
          )
        }

        // Owner view: Interactive drag handle + polished pill wrapper
        return (
          <div
            key={item.key}
            onDragOver={(e) => handleDragOver(e, item.key)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, item.key)}
            className={cn(
              'group relative flex items-center rounded-xl border transition-all duration-150',
              'border-border/60 bg-muted/20 hover:border-primary/40 hover:bg-muted/40 shadow-xs',
              isDragging && 'opacity-40 scale-95 border-dashed border-primary',
              isOver && !isDragging && 'ring-2 ring-primary/40 border-primary bg-primary/5'
            )}
          >
            <div
              draggable
              onDragStart={(e) => handleDragStart(e, item.key)}
              onDragEnd={() => {
                setDraggedKey(null)
                setDragOverKey(null)
              }}
              className="flex h-9 items-center justify-center pl-2 pr-1 text-muted-foreground/60 hover:text-foreground cursor-grab active:cursor-grabbing transition-colors select-none"
              title="Click and drag to reorder filter"
              aria-label={`Reorder ${item.key} filter`}
            >
              <GripVertical className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 pr-1">{item.component}</div>
          </div>
        )
      })}
    </div>
  )
}
