import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FieldRow } from '@/components/shared/FieldValue'
import { LeadStatusBadge, PriorityBadge, TemperatureBadge } from '@/components/shared/LeadStatusBadge'
import { Building2, IndianRupee, History, UserCheck, Layers } from 'lucide-react'
import type { Lead, Institution, InstituteExpense } from '@/types'

export interface Lead360Data {
  lead: Lead | null
  institution: Institution | null
  expenses: InstituteExpense[]
  auditLogs: any[]
}

export function LeadDetailView({ leadId }: { leadId: string }) {
  const [data, setData] = useState<Lead360Data>({
    lead: null,
    institution: null,
    expenses: [],
    auditLogs: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load360Data() {
      if (!leadId) return
      setLoading(true)

      try {
        // 1. Fetch Lead
        const { data: lead } = await supabase
          .from('leads')
          .select('*, course:courses(name), counselor:users!assigned_counselor_id(name)')
          .eq('id', leadId)
          .single()

        // 2. Fetch Linked Institution
        const { data: institution } = await supabase
          .from('institutions')
          .select('*')
          .eq('lead_id', leadId)
          .maybeSingle()

        // 3. Fetch Linked Expenses
        const { data: expenses } = await supabase
          .from('institute_expenses')
          .select('*')
          .eq('lead_id', leadId)
          .order('expense_date', { ascending: false })

        // 4. Fetch Audit Trail (Log history)
        const { data: auditLogs } = await supabase
          .from('audit_logs')
          .select('*, user:users(name)')
          .eq('entity_id', leadId)
          .order('created_at', { ascending: false })

        setData({
          lead: lead as any,
          institution: institution as any,
          expenses: expenses || [],
          auditLogs: auditLogs || [],
        })
      } catch (err) {
        console.error('Error loading 360 lead view:', err)
      } finally {
        setLoading(false)
      }
    }

    load360Data()
  }, [leadId])

  if (loading) {
    return <div className="p-6 text-center text-sm text-muted-foreground">Loading 360 View...</div>
  }

  const { lead, institution, expenses, auditLogs } = data

  if (!lead) {
    return <div className="p-6 text-center text-sm text-muted-foreground">Lead not found.</div>
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary text-primary-foreground">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">{lead.full_name}</h2>
              {(lead as any).display_id && (
                <span className="text-xs font-mono bg-background text-muted-foreground border border-border px-2 py-0.5 rounded-md">
                  Ref: {(lead as any).display_id}
                </span>
              )}
              <LeadStatusBadge status={lead.status} />
              <PriorityBadge priority={lead.priority} />
              {lead.temperature && <TemperatureBadge temperature={lead.temperature} />}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              360° Relational Entity View & Single Source of Truth
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Section 1: Lead Core Info */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-base flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-primary" />
              Core Lead Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 pt-4 text-sm">
            <FieldRow label="Mobile" value={lead.mobile} />
            <FieldRow label="Email" value={lead.email} />
            <FieldRow label="City" value={lead.city} />
            <FieldRow label="Course" value={lead.course?.name} />
            <FieldRow label="Source" value={lead.source?.replace('_', ' ')} />
            <FieldRow label="Counselor" value={lead.counselor?.name} />
            <FieldRow label="Budget" value={lead.budget ? `₹${lead.budget.toLocaleString()}` : null} mono />
            <FieldRow label="School/College" value={lead.school_college} />
            {lead.notes && <div className="sm:col-span-2"><FieldRow label="Notes" value={lead.notes} /></div>}
          </CardContent>
        </Card>

        {/* Section 2: Linked Institution */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Linked Institution
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 text-sm">
            {institution ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <FieldRow label="Institution Name" value={institution.name} />
                <FieldRow label="Type" value={institution.type} />
                <FieldRow label="Contact Person" value={institution.contact_person} />
                <FieldRow label="Contact Phone" value={institution.contact_phone} />
                <FieldRow label="Contact Email" value={institution.contact_email} />
                <FieldRow label="MOU Status" value={institution.mou_status} />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No institution linked directly to this lead.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Section 3: Linked Finance & Expenses */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b border-border/50">
          <CardTitle className="text-base flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-primary" />
            Linked Finance & Expense Records
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Expense Date</TableHead>
                <TableHead className="text-xs">Category</TableHead>
                <TableHead className="text-xs">Vendor</TableHead>
                <TableHead className="text-xs text-right">Amount</TableHead>
                <TableHead className="text-xs">Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground">
                    No finance or expense records linked to this lead.
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((exp) => (
                  <TableRow key={exp.id} className="text-xs">
                    <TableCell>{new Date(exp.expense_date).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium capitalize">{exp.category}</TableCell>
                    <TableCell>{exp.vendor || '—'}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">₹{exp.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-muted-foreground">{exp.notes || '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Section 4: Audit & Activity Trail */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b border-border/50">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Relational Audit & Lifecycle Trail
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Action</TableHead>
                <TableHead className="text-xs">Entity</TableHead>
                <TableHead className="text-xs">User</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-xs text-muted-foreground">
                    Lead created on {new Date(lead.created_at).toLocaleString()}.
                  </TableCell>
                </TableRow>
              ) : (
                auditLogs.map((log) => (
                  <TableRow key={log.id} className="text-xs">
                    <TableCell className="text-muted-foreground">{new Date(log.created_at).toLocaleString()}</TableCell>
                    <TableCell className="font-semibold">{log.action}</TableCell>
                    <TableCell><Badge variant="outline">{log.entity_type || 'lead'}</Badge></TableCell>
                    <TableCell>{log.user?.name || 'System / Batch Intake'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
