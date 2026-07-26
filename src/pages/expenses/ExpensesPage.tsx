import { useState } from 'react'
import { Plus, Trash2, IndianRupee, TrendingDown, PiggyBank, Edit, Settings2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useInstituteExpenses, useCreateInstituteExpense, useUpdateInstituteExpense } from '@/hooks/useInstitutions'
import { useSoftDelete } from '@/hooks/useSoftDelete'
import { supabase } from '@/lib/supabase'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatsCard } from '@/components/shared/StatsCard'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { SoftDeleteDialog } from '@/components/shared/SoftDeleteDialog'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import type { InstituteExpense, ExpenseCategory, ExpenseCategoryItem } from '@/types'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#EF4444', '#3B82F6', '#F59E0B', '#10B981', '#8B5CF6']

export default function ExpensesPage() {
  const { profile, can } = useAuth()
  const queryClient = useQueryClient()
  const { data: expenses = [], isLoading } = useInstituteExpenses()
  const createExpense = useCreateInstituteExpense()
  const updateExpense = useUpdateInstituteExpense()
  const softDelete = useSoftDelete()

  const [addOpen, setAddOpen] = useState(false)
  const [editExpenseId, setEditExpenseId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [category, setCategory] = useState<ExpenseCategory>('misc')
  const [amount, setAmount] = useState('')
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')

  // Fetch categories from DB
  const { data: dbCategories = [] } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('expense_categories').select('*').order('name')
      if (error) throw error
      return (data ?? []) as ExpenseCategoryItem[]
    },
    enabled: !!profile,
  })

  // Build category options from DB + legacy fallback
  const categoryOptions = dbCategories.length > 0
    ? dbCategories.map(c => ({ value: c.name.toLowerCase().replace(/\s+/g, '_'), label: c.name }))
    : [
        { value: 'rent', label: 'Rent' },
        { value: 'salaries', label: 'Salaries' },
        { value: 'electricity', label: 'Electricity' },
        { value: 'marketing', label: 'Marketing' },
        { value: 'misc', label: 'Miscellaneous' },
      ]

  // Category management state
  const [catManageOpen, setCatManageOpen] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [editingCatName, setEditingCatName] = useState('')

  const addCategory = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from('expense_categories').insert({ name })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] })
      toast.success('Category added')
      setNewCatName('')
    },
    onError: (err) => toast.error(err.message),
  })

  const updateCategory = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('expense_categories').update({ name }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] })
      toast.success('Category updated')
      setEditingCatId(null)
    },
    onError: (err) => toast.error(err.message),
  })

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('expense_categories').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] })
      toast.success('Category deleted')
    },
    onError: (err) => toast.error(err.message),
  })

  // Build label map from DB categories
  const catLabelMap: Record<string, string> = {}
  dbCategories.forEach(c => { catLabelMap[c.name.toLowerCase().replace(/\s+/g, '_')] = c.name })
  const getCatLabel = (key: string) => catLabelMap[key] ?? key.charAt(0).toUpperCase() + key.slice(1)

  const handleEditClick = (e: InstituteExpense) => {
    setEditExpenseId(e.id)
    setCategory(e.category)
    setAmount(e.amount.toString())
    setExpenseDate(new Date(e.expense_date).toISOString().split('T')[0])
    setNotes(e.notes ?? '')
    setAddOpen(true)
  }

  const handleAddOpen = () => {
    setEditExpenseId(null)
    setCategory('misc')
    setAmount('')
    setExpenseDate(new Date().toISOString().split('T')[0])
    setNotes('')
    setAddOpen(true)
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount)
    return acc
  }, {})

  const categoryData = Object.entries(byCategory).map(([k, v]) => ({
    name: getCatLabel(k),
    value: v,
  }))

  const columns: Column<InstituteExpense>[] = [
    { key: 'expense_date', header: 'Date', render: (r) => format(new Date(r.expense_date), 'MMM d, yyyy') },
    { key: 'category', header: 'Category', render: (r) => getCatLabel(r.category) },
    { key: 'amount', header: 'Amount', render: (r) => formatCurrency(r.amount) },
    { key: 'notes', header: 'Notes', render: (r) => r.notes ?? '—' },
    { key: 'created_at', header: 'Recorded', render: (r) => format(new Date(r.created_at), 'MMM d, yyyy') },
    ...(can('manageExpenses') ? [{
      key: 'actions' as const,
      header: 'Actions' as const,
      render: (r: InstituteExpense) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEditClick(r) }}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setDeleteId(r.id) }}>
            <Trash2 className="h-4 w-4 text-danger" />
          </Button>
        </div>
      ),
    }] : []),
  ]

  const handleAdd = async () => {
    if (!amount || !expenseDate) return
    if (editExpenseId) {
      await updateExpense.mutateAsync({
        id: editExpenseId,
        category,
        amount: parseFloat(amount),
        expense_date: expenseDate,
        notes: notes || null,
      })
    } else {
      await createExpense.mutateAsync({
        category,
        amount: parseFloat(amount),
        expense_date: expenseDate,
        notes: notes || null,
      })
    }
    setAddOpen(false)
    setAmount('')
    setNotes('')
  }

  return (
    <div>
      <PageHeader title="Institute Expenses" description="Track and manage expenses">
        <div className="flex gap-2">
          {can('manageExpenses') && (
            <Button variant="outline" onClick={() => setCatManageOpen(true)}>
              <Settings2 className="h-4 w-4" /> Manage Categories
            </Button>
          )}
          {can('manageExpenses') && (
            <Button onClick={handleAddOpen}><Plus className="h-4 w-4" /> Add Expense</Button>
          )}
        </div>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <StatsCard title="Total Expenses" value={formatCurrency(totalExpenses)} icon={IndianRupee} color="bg-danger" loading={isLoading} />
        <StatsCard title="This Month" value={formatCurrency(
          expenses.filter(e => e.expense_date?.startsWith(new Date().toISOString().slice(0, 7))).reduce((s, e) => s + Number(e.amount), 0)
        )} icon={TrendingDown} color="bg-accent" loading={isLoading} />
        <StatsCard title="Categories" value={categoryData.length} icon={PiggyBank} color="bg-primary-light" loading={isLoading} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Expense Breakdown by Category</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Category Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                  {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">All Expenses</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            columns={columns as any[]}
            data={expenses}
            loading={isLoading}
            searchable
            rowKey={(r) => r.id}
            emptyTitle="No expenses recorded"
            emptyDescription="Add your first expense to start tracking."
          />
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editExpenseId ? 'Edit Expense' : 'Add Expense'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as ExpenseCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount (₹)</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SoftDeleteDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Expense?"
        entityType="expense"
        entityName={expenses.find((e) => e.id === deleteId) ? `${expenses.find((e) => e.id === deleteId)!.category} — ₹${expenses.find((e) => e.id === deleteId)!.amount}` : ''}
        onConfirm={() => {
          if (deleteId) softDelete.mutate({ table: 'institute_expenses', id: deleteId }, { onSuccess: () => setDeleteId(null) })
        }}
        loading={softDelete.isPending}
      />

      {/* Manage Categories Dialog */}
      <Dialog open={catManageOpen} onOpenChange={setCatManageOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Manage Expense Categories</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Add new category */}
            <div className="flex gap-2">
              <Input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="New category name..."
                onKeyDown={(e) => { if (e.key === 'Enter' && newCatName.trim()) addCategory.mutate(newCatName.trim()) }}
              />
              <Button onClick={() => { if (newCatName.trim()) addCategory.mutate(newCatName.trim()) }} disabled={!newCatName.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {/* Category list */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {dbCategories.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No categories yet. Add one above.</p>
              ) : (
                dbCategories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-2.5">
                    {editingCatId === cat.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={editingCatName}
                          onChange={(e) => setEditingCatName(e.target.value)}
                          className="h-8 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') updateCategory.mutate({ id: cat.id, name: editingCatName })
                            if (e.key === 'Escape') setEditingCatId(null)
                          }}
                        />
                        <Button size="sm" variant="ghost" onClick={() => updateCategory.mutate({ id: cat.id, name: editingCatName })}>
                          Save
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm font-medium">{cat.name}</span>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => { setEditingCatId(cat.id); setEditingCatName(cat.name) }}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteCategory.mutate(cat.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-danger" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatManageOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}