import { useState } from 'react'
import { Filter, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export interface FilterField {
  key: string
  label: string
  type: 'text' | 'select' | 'number' | 'date'
  options?: { label: string; value: string }[]
}

export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'greater_than'
  | 'less_than'
  | 'is_empty'
  | 'is_not_empty'

export interface DynamicFilterRule {
  id: string
  fieldKey: string
  fieldLabel: string
  operator: FilterOperator
  value: string
}

interface DynamicFilterBuilderProps {
  fields: FilterField[]
  rules: DynamicFilterRule[]
  onChange: (rules: DynamicFilterRule[]) => void
  className?: string
}

const OPERATOR_LABELS: Record<FilterOperator, string> = {
  equals: 'equals',
  not_equals: 'is not',
  contains: 'contains',
  greater_than: 'greater than / after',
  less_than: 'less than / before',
  is_empty: 'is empty',
  is_not_empty: 'is not empty',
}

function getOperatorsForType(type: FilterField['type']): { value: FilterOperator; label: string }[] {
  switch (type) {
    case 'select':
      return [
        { value: 'equals', label: 'Is' },
        { value: 'not_equals', label: 'Is not' },
        { value: 'is_empty', label: 'Is empty' },
        { value: 'is_not_empty', label: 'Is not empty' },
      ]
    case 'number':
      return [
        { value: 'equals', label: 'Equals (=)' },
        { value: 'greater_than', label: 'Greater than (>)' },
        { value: 'less_than', label: 'Less than (<)' },
        { value: 'is_empty', label: 'Is empty' },
        { value: 'is_not_empty', label: 'Is not empty' },
      ]
    case 'date':
      return [
        { value: 'equals', label: 'On date' },
        { value: 'greater_than', label: 'After date (>)' },
        { value: 'less_than', label: 'Before date (<)' },
        { value: 'is_empty', label: 'Is empty' },
        { value: 'is_not_empty', label: 'Is not empty' },
      ]
    case 'text':
    default:
      return [
        { value: 'contains', label: 'Contains' },
        { value: 'equals', label: 'Equals exactly' },
        { value: 'is_empty', label: 'Is empty' },
        { value: 'is_not_empty', label: 'Is not empty' },
      ]
  }
}

export function DynamicFilterBuilder({ fields, rules, onChange, className = '' }: DynamicFilterBuilderProps) {
  const [open, setOpen] = useState(false)
  const [selectedFieldKey, setSelectedFieldKey] = useState<string>(fields[0]?.key ?? '')
  const currentField = fields.find((f) => f.key === selectedFieldKey) ?? fields[0]
  const operators = getOperatorsForType(currentField?.type ?? 'text')

  const [selectedOperator, setSelectedOperator] = useState<FilterOperator>(operators[0]?.value ?? 'contains')
  const [value, setValue] = useState('')

  const handleFieldChange = (key: string) => {
    setSelectedFieldKey(key)
    const field = fields.find((f) => f.key === key)
    const ops = getOperatorsForType(field?.type ?? 'text')
    setSelectedOperator(ops[0]?.value ?? 'contains')
    setValue('')
  }

  const handleApply = () => {
    if (!currentField) return
    const requiresValue = selectedOperator !== 'is_empty' && selectedOperator !== 'is_not_empty'
    if (requiresValue && !value.trim()) return

    const newRule: DynamicFilterRule = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      fieldKey: currentField.key,
      fieldLabel: currentField.label,
      operator: selectedOperator,
      value: value.trim(),
    }

    onChange([...rules, newRule])
    setValue('')
    setOpen(false)
  }

  const handleRemove = (id: string) => {
    onChange(rules.filter((r) => r.id !== id))
  }

  const handleClearAll = () => {
    onChange([])
  }

  const getPillValue = (rule: DynamicFilterRule) => {
    const field = fields.find((f) => f.key === rule.fieldKey)
    if (field?.options) {
      const opt = field.options.find((o) => o.value === rule.value)
      if (opt) return opt.label
    }
    return rule.value
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-10 px-3 text-xs gap-1.5 border-dashed border-primary/40 hover:border-primary text-slate-700 dark:text-slate-200"
            >
              <Plus className="h-3.5 w-3.5 text-primary" />
              <span>Add Filter</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4 space-y-3 shadow-xl rounded-xl" align="start">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-800 dark:text-slate-100 pb-1 border-b">
              <Filter className="h-3.5 w-3.5 text-primary" />
              <span>Dynamic Filter Builder</span>
            </div>

            {/* Step 1: Column */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">1. Select Column</label>
              <Select value={selectedFieldKey} onValueChange={handleFieldChange}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Pick column" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {fields.map((f) => (
                    <SelectItem key={f.key} value={f.key} className="text-xs">
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Step 2: Condition */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">2. Condition</label>
              <Select value={selectedOperator} onValueChange={(v) => setSelectedOperator(v as FilterOperator)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Condition" />
                </SelectTrigger>
                <SelectContent>
                  {operators.map((op) => (
                    <SelectItem key={op.value} value={op.value} className="text-xs">
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Step 3: Value */}
            {selectedOperator !== 'is_empty' && selectedOperator !== 'is_not_empty' && (
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">3. Value</label>
                {currentField?.type === 'select' && currentField.options ? (
                  <Select value={value} onValueChange={setValue}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select option" />
                    </SelectTrigger>
                    <SelectContent className="max-h-48">
                      {currentField.options.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : currentField?.type === 'date' ? (
                  <Input
                    type="date"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="h-8 text-xs"
                  />
                ) : currentField?.type === 'number' ? (
                  <Input
                    type="number"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="Enter number..."
                    className="h-8 text-xs"
                  />
                ) : (
                  <Input
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={`Enter ${currentField?.label.toLowerCase()}...`}
                    className="h-8 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleApply()
                      }
                    }}
                  />
                )}
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2 border-t">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="h-7 text-xs">
                Cancel
              </Button>
              <Button size="sm" onClick={handleApply} className="h-7 text-xs bg-primary text-primary-foreground font-semibold">
                Apply Filter
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Removable Pills */}
        {rules.map((rule) => (
          <Badge
            key={rule.id}
            variant="secondary"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-normal rounded-lg bg-primary/10 text-primary border border-primary/20 animate-fade-in"
          >
            <span className="font-semibold text-slate-800 dark:text-slate-100">{rule.fieldLabel}</span>
            <span className="text-muted-foreground text-[10px]">{OPERATOR_LABELS[rule.operator]}</span>
            {rule.operator !== 'is_empty' && rule.operator !== 'is_not_empty' && (
              <span className="font-medium bg-background px-1.5 py-0.5 rounded text-[11px] shadow-2xs">
                {getPillValue(rule)}
              </span>
            )}
            <button
              type="button"
              onClick={() => handleRemove(rule.id)}
              className="ml-0.5 text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
              title="Remove filter"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}

        {rules.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-red-600"
          >
            Clear All
          </Button>
        )}
      </div>
    </div>
  )
}
