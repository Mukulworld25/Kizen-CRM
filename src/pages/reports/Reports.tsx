import { useState, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { Download, TrendingUp, Users, GraduationCap, IndianRupee, Filter } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts'

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#64748B']

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
      let q = supabase.from('leads').select('*, course:courses(name), counselor:users!leads_assigned_counselor_id_fkey(name)')
      if (dateFrom) q = q.gte('created_at', dateFrom)
      if (dateTo) q = q.lte('created_at', dateTo + 'T23:59:59')
      const { data } = await q
      return data ?? []
    },
  })

  const { data: expenses = [] } = useQuery({
    queryKey: ['report-expenses', dateFrom, dateTo],
    queryFn: async () => {
      let q = supabase.from('institute_expenses').select('*')
      if (dateFrom) q = q.gte('expense_date', dateFrom)
      if (dateTo) q = q.lte('expense_date', dateTo)
      const { data } = await q
      return data ?? []
    },
  })

  // Executive KPI Computations
  const totalLeads = leads.length
  const totalStudents = admissions.length
  const conversionRate = totalLeads > 0 ? ((totalStudents / totalLeads) * 100).toFixed(1) : '0'

  const totalCollectedRevenue = useMemo(() => {
    return fees.reduce((sum, f) => sum + Number(f.amount_paid || 0), 0)
  }, [fees])

  const totalPendingFee = useMemo(() => {
    return fees.reduce((sum, f) => sum + Number(f.pending_balance || 0), 0)
  }, [fees])

  // Revenue by Course Chart Data
  const revenueByCourse = useMemo(() => {
    const map: Record<string, number> = {}
    fees.forEach(f => {
      const name = (f as { course?: { name: string } }).course?.name ?? 'General / Unlinked'
      map[name] = (map[name] || 0) + Number(f.amount_paid || 0)
    })
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [fees])

  // Lead Pipeline Funnel Stages Data
  const leadPipelineData = useMemo(() => {
    const stageMap: Record<string, number> = {
      'new_lead': 0,
      'contacted': 0,
      'follow_up': 0,
      'demo_booked': 0,
      'negotiation': 0,
      'converted': 0,
      'lost': 0
    }
    leads.forEach(l => {
      const st = l.status || 'new_lead'
      stageMap[st] = (stageMap[st] || 0) + 1
    })
    return [
      { stage: 'New Lead', count: stageMap.new_lead },
      { stage: 'Contacted', count: stageMap.contacted },
      { stage: 'Follow Up', count: stageMap.follow_up },
      { stage: 'Demo Scheduled', count: stageMap.demo_booked },
      { stage: 'Negotiation', count: stageMap.negotiation },
      { stage: 'Converted (Admitted)', count: stageMap.converted },
    ]
  }, [leads])

  // Lead Sources Data
  const sourceFunnel = useMemo(() => {
    const map: Record<string, number> = {}
    leads.forEach(l => {
      const src = l.source ? l.source.replace('_', ' ').toUpperCase() : 'OTHER'
      map[src] = (map[src] || 0) + 1
    })
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [leads])

  // Monthly Financial Comparison (Revenue vs Expenses)
  const financialTrend = useMemo(() => {
    const monthMap: Record<string, { revenue: number; expense: number }> = {}
    fees.forEach(f => {
      const month = f.created_at ? f.created_at.slice(0, 7) : 'Current'
      if (!monthMap[month]) monthMap[month] = { revenue: 0, expense: 0 }
      monthMap[month].revenue += Number(f.amount_paid || 0)
    })
    expenses.forEach(e => {
      const month = e.expense_date ? e.expense_date.slice(0, 7) : 'Current'
      if (!monthMap[month]) monthMap[month] = { revenue: 0, expense: 0 }
      monthMap[month].expense += Number(e.amount || 0)
    })
    return Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, val]) => ({ month, Revenue: val.revenue, Expense: val.expense }))
  }, [fees, expenses])

  const exportReport = (name: string, rows: Record<string, unknown>[]) => {
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, name)
    XLSX.writeFile(wb, `kizen-${name}-report.xlsx`)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Executive Reports & Insights" description="Comprehensive data analytics, revenue breakdown, and pipeline performance" />

      {/* Date Filter Bar */}
      <div className="flex flex-wrap gap-4 items-end bg-white rounded-xl border border-border p-4 shadow-sm">
        <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm mr-2">
          <Filter className="w-4 h-4 text-primary" /> Filter Date Range:
        </div>
        <div>
          <Label className="text-xs text-slate-500">From Date</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 text-xs" />
        </div>
        <div>
          <Label className="text-xs text-slate-500">To Date</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 text-xs" />
        </div>
        {(dateFrom || dateTo) && (
          <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-xs text-slate-500">
            Reset Filters
          </Button>
        )}
      </div>

      {/* Executive Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border/50 shadow-sm bg-gradient-to-br from-blue-50/50 to-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Pipeline Leads</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{totalLeads.toLocaleString()}</h3>
              <p className="text-[11px] text-blue-600 font-semibold mt-1">Conversion: {conversionRate}%</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-100/70 text-blue-600">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm bg-gradient-to-br from-emerald-50/50 to-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Revenue Collected</p>
              <h3 className="text-2xl font-black text-emerald-700 mt-1">{formatCurrency(totalCollectedRevenue)}</h3>
              <p className="text-[11px] text-slate-500 font-semibold mt-1">Net Fee Received</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-100/70 text-emerald-600">
              <IndianRupee className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm bg-gradient-to-br from-amber-50/50 to-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Outstanding Balance</p>
              <h3 className="text-2xl font-black text-amber-700 mt-1">{formatCurrency(totalPendingFee)}</h3>
              <p className="text-[11px] text-amber-600 font-semibold mt-1">Pending Installments</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-100/70 text-amber-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm bg-gradient-to-br from-purple-50/50 to-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Enrolled Students</p>
              <h3 className="text-2xl font-black text-purple-700 mt-1">{totalStudents.toLocaleString()}</h3>
              <p className="text-[11px] text-purple-600 font-semibold mt-1">Active Admissions</p>
            </div>
            <div className="p-3 rounded-xl bg-purple-100/70 text-purple-600">
              <GraduationCap className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* CHART 1: LEAD CONVERSION PIPELINE */}
        <ReportCard
          title="Lead Pipeline Funnel Stages"
          subtitle="Distribution of leads across conversion stages"
          onExport={() => exportReport('pipeline-funnel', leadPipelineData)}
          chart={
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={leadPipelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="stage" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          }
        />

        {/* CHART 2: REVENUE BY COURSE */}
        <ReportCard
          title="Revenue Collection by Course"
          subtitle="Fee distribution across academic programs"
          onExport={() => exportReport('revenue-by-course', revenueByCourse)}
          chart={
            revenueByCourse.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={revenueByCourse}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {revenueByCourse.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-60 flex items-center justify-center text-xs text-slate-400">No fee data recorded yet</div>
            )
          }
        />

        {/* CHART 3: FINANCIAL HEALTH (REVENUE VS EXPENSES) */}
        <ReportCard
          title="Monthly Financial Health (Revenue vs Expenses)"
          subtitle="Comparing net collected fees against operational expenses"
          onExport={() => exportReport('financial-health', financialTrend)}
          chart={
            financialTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={financialTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Area type="monotone" dataKey="Revenue" stroke="#10B981" fill="#10B981" fillOpacity={0.2} />
                  <Area type="monotone" dataKey="Expense" stroke="#EF4444" fill="#EF4444" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-60 flex items-center justify-center text-xs text-slate-400">No trend data available for selected period</div>
            )
          }
        />

        {/* CHART 4: LEAD SOURCES ATTRIBUTION */}
        <ReportCard
          title="Lead Acquisition Channels"
          subtitle="Breakdown of leads by source"
          onExport={() => exportReport('lead-sources', sourceFunnel)}
          chart={
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={sourceFunnel} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#8B5CF6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          }
        />
      </div>
    </div>
  )
}

function ReportCard({ title, subtitle, chart, onExport }: { title: string; subtitle?: string; chart: React.ReactNode; onExport: () => void }) {
  return (
    <Card className="border-border/50 shadow-sm hover:shadow-md transition-all duration-200">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-3 bg-slate-50/40">
        <div>
          <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            {title}
          </CardTitle>
          {subtitle && <CardDescription className="text-[11px] text-slate-500 mt-0.5">{subtitle}</CardDescription>}
        </div>
        <Button variant="outline" size="sm" onClick={onExport} className="h-8 text-xs gap-1 text-slate-600 hover:text-slate-900">
          <Download className="h-3.5 w-3.5" /> Export Excel
        </Button>
      </CardHeader>
      <CardContent className="pt-4">{chart}</CardContent>
    </Card>
  )
}