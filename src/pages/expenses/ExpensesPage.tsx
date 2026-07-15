
import { useState } from 'react'
import { Plus, Trash2, IndianRupee, TrendingDown, PiggyBank } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useInstituteExpenses, useCreateInstituteExpense } from '@/hooks/useInstitutions'
import { useSoftDelete } from '@/hooks/useSoftDelete'
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
import type { InstituteExpense, ExpenseCategory } from '@/types'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const categoryLabels: Record<ExpenseCategory, string> = {
  rent: 'Rent', salaries: 'Salaries', electricity: 'Electricity', marketing: 'Marketing', misc: 'Misc',
}

const COLORS = ['#EF4444', '#3B82F6', '#F59E0B', '#10B981', '#8B5CF6']

export default function ExpensesPage() {
  const { can } = useAuth()
  const { data: expenses = [], isLoading } = useInstituteExpenses()
  const createExpense = useCreateInstituteExpense()
  const softDelete = useSoftDelete()

  const [addOpen, setAddOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [category, setCategory] = useState<ExpenseCategory>('misc')
  const [amount, setAmount] = useState('')
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount)
    return acc
  }, {})

  const categoryData = Object.entries(byCategory).map(([k, v]) => ({
    name: categoryLabels[k as ExpenseCategory] ?? k,
    value: v,
  }))

  const columns: Column<InstituteExpense>[] = [
    { key: 'expense_date', header: 'Date', render: (r) => format(new Date(r.expense_date), 'MMM d, yyyy') },
    { key: 'category', header: 'Category', render: (r) => categoryLabels[r.category] ?? r.category },
    { key: 'amount', header: 'Amount', render: (r) => formatCurrency(r.amount) },
    { key: 'notes', header: 'Notes', render: (r) => r.notes ?? '—' },
    { key: 'created_at', header: 'Recorded', render: (r) => format(new Date(r.created_at), 'MMM d, yyyy') },
    ...(can('manageExpenses') ? [{
      key: 'actions' as const,
      header: 'Actions' as const,
      render: (r: InstituteExpense) => (
        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setDeleteId(r.id) }}>
          <Trash2 className="h-4 w-4 text-danger" />
        </Button>
      ),
    }] : []),
  ]

  const handleAdd = async () => {
    if (!amount || !expenseDate) return
    await createExpense.mutateAsync({
      category,
      amount: parseFloat(amount),
      expense_date: expenseDate,
      notes: notes || null,
    })
    setAddOpen(false)
    setAmount('')
    setNotes('')
  }

  return (
    <div>
      <PageHeader title="Institute Expenses" description="Track and manage expenses">
        {can('manageExpenses') && (
          <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add Expense</Button>
        )}
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
          <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as ExpenseCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(categoryLabels) as [ExpenseCategory, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
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
    </div>
  )
}