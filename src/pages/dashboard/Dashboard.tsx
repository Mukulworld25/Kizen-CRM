import { useAuth } from '@/hooks/useAuth'
import { useDashboardStats, useFollowUps } from '@/hooks/useStudents'
import { StatsCard } from '@/components/shared/StatsCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { LeadStatusBadge } from '@/components/shared/LeadStatusBadge'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import {
  Users, TrendingUp, GraduationCap, IndianRupee,
  AlertTriangle, Clock, Target, BarChart3,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
} from 'recharts'

const COLORS = ['#1E3A8A', '#F59E0B', '#10B981', '#3B5CB8', '#FBBF24', '#34D399', '#8B5CF6', '#EC4899']

export default function Dashboard() {
  const { isOwner, profile } = useAuth()
  const { data: stats, isLoading } = useDashboardStats()
  const { data: todayFollowUps = [] } = useFollowUps('today')

  if (profile?.role === 'counselor') {
    return <CounselorDashboard stats={stats} isLoading={isLoading} />
  }

  if (profile?.role === 'accounts') {
    return <AccountsDashboard stats={stats} isLoading={isLoading} />
  }

  if (profile?.role === 'reception') {
    return <ReceptionDashboard stats={stats} isLoading={isLoading} />
  }

  const leadsDelta = (stats?.leadsToday ?? 0) - (stats?.leadsYesterday ?? 0)

  return (
    <div>
      <PageHeader title="Dashboard" description="Real-time overview of your institute">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-slate-100 rounded-lg px-3 py-1.5">
            <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
            Live
          </div>
        </div>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-6">
        <StatsCard title="Leads Today" value={stats?.leadsToday ?? 0} change={leadsDelta} icon={Users} loading={isLoading} />
        <StatsCard title="Leads This Week" value={stats?.leadsWeek ?? 0} icon={TrendingUp} color="bg-primary-light" loading={isLoading} />
        <StatsCard title="Admissions This Month" value={stats?.admissionsMonth ?? 0} icon={GraduationCap} color="bg-success" loading={isLoading} />
        {isOwner && (
          <>
            <StatsCard title="Revenue Collected" value={formatCurrency(stats?.revenue ?? 0)} icon={IndianRupee} color="bg-success" loading={isLoading} />
            <StatsCard title="Pending Fees" value={formatCurrency(stats?.pending ?? 0)} icon={AlertTriangle} color="bg-accent" loading={isLoading} alert={(stats?.pending ?? 0) > 50000} />
          </>
        )}
        <StatsCard
          title="Follow-ups Due"
          value={stats?.followUpsDue ?? 0}
          icon={Clock}
          color="bg-accent"
          loading={isLoading}
          alert={(stats?.followUpsOverdue ?? 0) > 0}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        <Card>
          <CardHeader className="border-b border-border/50 pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              Lead Sources
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats?.sourceBreakdown ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="value" fill="#1E3A8A" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-border/50 pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-success" />
              Admissions (30 days)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={buildDailyAdmissions((stats?.recentAdmissions ?? []) as Array<{ created_at: string }>)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                <Line type="monotone" dataKey="count" stroke="#10B981" strokeWidth={2.5} dot={{ fill: '#10B981', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader className="border-b border-border/50 pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-accent" />
              Course Enrollments
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={buildCourseEnrollments((stats?.recentAdmissions ?? []) as unknown as Array<{ course?: { name: string } }>)}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                >
                  {buildCourseEnrollments((stats?.recentAdmissions ?? []) as unknown as Array<{ course?: { name: string } }>).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="border-b border-border/50 pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              Today's Follow-ups
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {todayFollowUps.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                  <Clock className="h-6 w-6 text-success" />
                </div>
                <p className="text-sm font-medium text-slate-700">All caught up!</p>
                <p className="text-xs text-muted-foreground mt-1">No follow-ups scheduled for today.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-primary/80 font-medium">Lead</TableHead>
                    <TableHead className="text-primary/80 font-medium">Type</TableHead>
                    <TableHead className="text-primary/80 font-medium">Counselor</TableHead>
                    <TableHead className="text-primary/80 font-medium">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayFollowUps.slice(0, 5).map((fu) => (
                    <TableRow key={fu.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell className="font-medium">{fu.lead?.full_name}</TableCell>
                      <TableCell>
                        <Badge variant={fu.type === 'call' ? 'default' : fu.type === 'demo' ? 'success' : 'warning'} className="capitalize">
                          {fu.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{(fu.assignee as { name: string } | undefined)?.name ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{format(new Date(fu.scheduled_at), 'h:mm a')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function CounselorDashboard({ stats, isLoading }: { stats: ReturnType<typeof useDashboardStats>['data']; isLoading: boolean }) {
  return (
    <div>
      <PageHeader title="My Dashboard" description="Your personal pipeline overview" />
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <StatsCard title="My Leads Today" value={stats?.leadsToday ?? 0} icon={Users} loading={isLoading} />
        <StatsCard title="Follow-ups Due" value={stats?.followUpsDue ?? 0} icon={Clock} color="bg-accent" loading={isLoading} />
        <StatsCard title="Admissions This Month" value={stats?.admissionsMonth ?? 0} icon={Target} color="bg-success" loading={isLoading} />
      </div>
      <Card>
        <CardHeader className="border-b border-border/50 pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            My Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {['new', 'contacted', 'interested', 'admitted'].map((status) => (
              <div key={status} className="rounded-xl border border-border bg-slate-50/50 p-4 text-center hover:shadow-sm transition-shadow">
                <LeadStatusBadge status={status as never} />
                <p className="mt-3 text-2xl font-bold text-slate-800">—</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function AccountsDashboard({ stats, isLoading }: { stats: ReturnType<typeof useDashboardStats>['data']; isLoading: boolean }) {
  return (
    <div>
      <PageHeader title="Finance Dashboard" description="Revenue, fees, and payment overview" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatsCard title="Revenue Collected" value={formatCurrency(stats?.revenue ?? 0)} icon={IndianRupee} color="bg-success" loading={isLoading} />
        <StatsCard title="Pending Fees" value={formatCurrency(stats?.pending ?? 0)} icon={AlertTriangle} color="bg-accent" loading={isLoading} alert={(stats?.pending ?? 0) > 0} />
        <StatsCard title="Admissions This Month" value={stats?.admissionsMonth ?? 0} icon={GraduationCap} color="bg-primary-light" loading={isLoading} />
        <StatsCard title="Follow-ups Due" value={stats?.followUpsDue ?? 0} icon={Clock} color="bg-accent" loading={isLoading} />
      </div>
      <Card>
        <CardHeader className="border-b border-border/50 pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-success" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-border bg-slate-50/50 p-4 text-center hover:shadow-sm transition-shadow cursor-pointer">
              <IndianRupee className="h-8 w-8 mx-auto text-success mb-2" />
              <p className="font-medium text-sm">Record Payment</p>
              <p className="text-xs text-muted-foreground mt-1">Go to Fees → select student → Record Payment</p>
            </div>
            <div className="rounded-xl border border-border bg-slate-50/50 p-4 text-center hover:shadow-sm transition-shadow cursor-pointer">
              <AlertTriangle className="h-8 w-8 mx-auto text-accent mb-2" />
              <p className="font-medium text-sm">View Overdue</p>
              <p className="text-xs text-muted-foreground mt-1">Go to Fees → Overdue tab → follow up</p>
            </div>
            <div className="rounded-xl border border-border bg-slate-50/50 p-4 text-center hover:shadow-sm transition-shadow cursor-pointer">
              <BarChart3 className="h-8 w-8 mx-auto text-primary mb-2" />
              <p className="font-medium text-sm">Generate Report</p>
              <p className="text-xs text-muted-foreground mt-1">Go to Reports → Export to Excel</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ReceptionDashboard({ stats, isLoading }: { stats: ReturnType<typeof useDashboardStats>['data']; isLoading: boolean }) {
  return (
    <div>
      <PageHeader title="Front Desk Dashboard" description="Walk-in leads and today's activity" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
        <StatsCard title="Leads Today" value={stats?.leadsToday ?? 0} icon={Users} loading={isLoading} />
        <StatsCard title="Leads This Week" value={stats?.leadsWeek ?? 0} icon={TrendingUp} color="bg-primary-light" loading={isLoading} />
        <StatsCard title="Follow-ups Due" value={stats?.followUpsDue ?? 0} icon={Clock} color="bg-accent" loading={isLoading} />
      </div>
      <Card>
        <CardHeader className="border-b border-border/50 pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-border bg-slate-50/50 p-4 text-center hover:shadow-sm transition-shadow cursor-pointer">
              <Users className="h-8 w-8 mx-auto text-primary mb-2" />
              <p className="font-medium text-sm">Add New Lead</p>
              <p className="text-xs text-muted-foreground mt-1">Go to Leads → Add Lead → fill details</p>
            </div>
            <div className="rounded-xl border border-border bg-slate-50/50 p-4 text-center hover:shadow-sm transition-shadow cursor-pointer">
              <Clock className="h-8 w-8 mx-auto text-accent mb-2" />
              <p className="font-medium text-sm">Schedule Follow-up</p>
              <p className="text-xs text-muted-foreground mt-1">Go to Follow-ups → Schedule → set date/time</p>
            </div>
            <div className="rounded-xl border border-border bg-slate-50/50 p-4 text-center hover:shadow-sm transition-shadow cursor-pointer">
              <GraduationCap className="h-8 w-8 mx-auto text-success mb-2" />
              <p className="font-medium text-sm">View Courses</p>
              <p className="text-xs text-muted-foreground mt-1">Go to Leads → course catalog for walk-ins</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function buildDailyAdmissions(students: Array<{ created_at: string }>) {
  const map: Record<string, number> = {}
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    map[d.toISOString().split('T')[0]] = 0
  }
  for (const s of students) {
    const day = s.created_at.split('T')[0]
    if (map[day] !== undefined) map[day]++
  }
  return Object.entries(map).map(([date, count]) => ({
    date: format(new Date(date), 'MMM d'),
    count,
  }))
}

function buildCourseEnrollments(students: Array<{ course?: { name: string } }>) {
  const map: Record<string, number> = {}
  for (const s of students) {
    const name = s.course?.name ?? 'Unknown'
    map[name] = (map[name] ?? 0) + 1
  }
  return Object.entries(map).map(([name, value]) => ({ name, value }))
}
