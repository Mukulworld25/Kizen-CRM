import { useState } from 'react'
import * as XLSX from 'xlsx'
import { Download } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'

const COLORS = ['#1E3A8A', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

export default function Reports() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const { data: admissions = [] } = useQuery({
    queryKey: ['report-admissions', dateFrom, dateTo],
    queryFn: async () => {
      let q = supabase.from('students').select('*, course:courses(name)').order('admission_date')
      if (dateFrom) q = q.gte('admission_date', dateFrom)
      if (dateTo) q = q.lte('admission_date', dateTo)
      const { data } = await q
      return data ?? []
    },
  })

  const { data: fees = [] } = useQuery({
    queryKey: ['report-fees', dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await supabase.from('fees').select('*, course:courses(name), student:students(full_name)')
      return data ?? []
    },
  })

  const { data: leads = [] } = useQuery({
    queryKey: ['report-leads', dateFrom, dateTo],
    queryFn: async () => {
      let q = supabase.from('leads').select('*')
      if (dateFrom) q = q.gte('created_at', dateFrom)
      if (dateTo) q = q.lte('created_at', dateTo + 'T23:59:59')
      const { data } = await q
      return data ?? []
    },
  })

  const { data: batches = [] } = useQuery({
    queryKey: ['report-batches'],
    queryFn: async () => {
      const { data } = await supabase.from('batches').select('*, course:courses(name)')
      return data ?? []
    },
  })

  const revenueByCourse = Object.entries(
    fees.reduce<Record<string, number>>((acc, f) => {
      const name = (f as { course?: { name: string } }).course?.name ?? 'Unknown'
      acc[name] = (acc[name] ?? 0) + Number(f.amount_paid)
      return acc
    }, {})
  ).map(([name, value]) => ({ name, value }))

  const admissionsByMonth = Object.entries(
    admissions.reduce<Record<string, number>>((acc, s) => {
      const month = (s as { admission_date: string }).admission_date?.slice(0, 7) ?? 'Unknown'
      acc[month] = (acc[month] ?? 0) + 1
      return acc
    }, {})
  ).map(([name, count]) => ({ name, count }))

  const sourceFunnel = Object.entries(
    leads.reduce<Record<string, number>>((acc, l) => {
      const src = (l as { source: string }).source ?? 'other'
      acc[src] = (acc[src] ?? 0) + 1
      return acc
    }, {})
  ).map(([name, value]) => ({ name, value }))

  const exportReport = (name: string, rows: Record<string, unknown>[]) => {
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, name)
    XLSX.writeFile(wb, `kizen-${name}.xlsx`)
  }

  return (
    <div>
      <PageHeader title="Reports" description="Owner-only analytics and exports" />

      <div className="mb-6 flex flex-wrap gap-4 items-end bg-white rounded-xl border border-border p-4 shadow-sm">
        <div>
          <Label>From</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div>
          <Label>To</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ReportCard
          title="Admissions by Month"
          onExport={() => exportReport('admissions', admissionsByMonth)}
          chart={
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={admissionsByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#1E3A8A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          }
        />

        <ReportCard
          title="Revenue by Course"
          onExport={() => exportReport('revenue', revenueByCourse)}
          chart={
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={revenueByCourse} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                  {revenueByCourse.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          }
        />

        <ReportCard
          title="Lead Sources Performance"
          onExport={() => exportReport('sources', sourceFunnel)}
          chart={
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={sourceFunnel} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#10B981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          }
        />

        <ReportCard
          title="Batch Occupancy"
          onExport={() => exportReport('batches', batches.map((b) => ({
            batch: (b as { batch_name: string }).batch_name,
            enrolled: (b as { enrolled_count: number }).enrolled_count,
            total: (b as { total_seats: number }).total_seats,
          })))}
          chart={
            <div className="space-y-2">
              {batches.slice(0, 5).map((b) => {
                const batch = b as { id: string; batch_name: string; enrolled_count: number; total_seats: number }
                const pct = Math.round((batch.enrolled_count / batch.total_seats) * 100)
                return (
                  <div key={batch.id}>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-700">{batch.batch_name}</span>
                      <span className="text-muted-foreground">{batch.enrolled_count}/{batch.total_seats}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100 mt-1">
                      <div
                        className="h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: pct > 90 ? '#EF4444' : pct > 70 ? '#F59E0B' : '#10B981' }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          }
        />

        <ReportCard
          title="Outstanding Fees"
          onExport={() => exportReport('outstanding', fees.filter((f) => Number((f as { pending_balance: number }).pending_balance) > 0).map((f) => ({
            student: (f as { student?: { full_name: string } }).student?.full_name,
            balance: (f as { pending_balance: number }).pending_balance,
          })))}
          chart={
            <div className="text-sm space-y-2 max-h-48 overflow-y-auto">
              {fees.filter((f) => Number((f as { pending_balance: number }).pending_balance) > 0).slice(0, 8).map((f) => (
                <div key={(f as { id: string }).id} className="flex justify-between border-b border-border/50 pb-1.5">
                  <span className="text-slate-700">{(f as { student?: { full_name: string } }).student?.full_name}</span>
                  <span className="font-medium text-danger">{formatCurrency(Number((f as { pending_balance: number }).pending_balance))}</span>
                </div>
              ))}
            </div>
          }
        />
      </div>
    </div>
  )
}

function ReportCard({ title, chart, onExport }: { title: string; chart: React.ReactNode; onExport: () => void }) {
  return (
    <Card className="hover:shadow-md transition-shadow duration-150">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary" />
          {title}
        </CardTitle>
        <Button variant="outline" size="sm" onClick={onExport}>
          <Download className="h-4 w-4" /> Excel
        </Button>
      </CardHeader>
      <CardContent className="pt-4">{chart}</CardContent>
    </Card>
  )
}