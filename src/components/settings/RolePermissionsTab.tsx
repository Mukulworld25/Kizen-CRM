import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { ShieldCheck, Check, RotateCcw, Lock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { getDynamicRolePermissions, saveDynamicRolePermissions, roleLabels, type Permission } from '@/lib/permissions'
import type { UserRole } from '@/types'

const TARGET_ROLES: UserRole[] = ['counselor', 'reception', 'faculty', 'accounts', 'bdm']

interface PermissionItem {
  key: Permission
  label: string
  category: string
  description: string
}

const PERMISSION_CONFIG: PermissionItem[] = [
  { key: 'viewDashboard', label: 'Dashboard & Metrics', category: 'General', description: 'View system dashboard analytics and KPIs' },
  { key: 'viewLeads', label: 'View Leads', category: 'Leads', description: 'Access leads list and detail pages' },
  { key: 'addLeads', label: 'Add & Import Leads', category: 'Leads', description: 'Create new leads or import csv data' },
  { key: 'editLeads', label: 'Edit Leads', category: 'Leads', description: 'Modify lead details, stage, and contact info' },
  { key: 'assignCounselor', label: 'Reassign Counselor', category: 'Leads', description: 'Reassign leads to other counselors' },
  { key: 'exportData', label: 'Export Excel Data', category: 'General', description: 'Permission to export system data to Excel files' },
  { key: 'viewFollowUps', label: 'Calendar & Follow-ups', category: 'Follow-ups', description: 'Access follow-up task list and event calendar' },
  { key: 'viewStudents', label: 'Student Admissions', category: 'Students', description: 'View admitted student profiles and documents' },
  { key: 'viewFees', label: 'Fee Management', category: 'Finance', description: 'View student fee structures and payment plans' },
  { key: 'recordPayments', label: 'Record Fee Payments', category: 'Finance', description: 'Collect and record fee payments' },
  { key: 'viewRevenue', label: 'Revenue Reports', category: 'Finance', description: 'Access financial revenue and collection metrics' },
  { key: 'viewReports', label: 'Analytics Reports', category: 'Finance', description: 'Generate and download financial reports' },
  { key: 'viewInstitutions', label: 'Institutions & Faculty', category: 'Academic', description: 'View institutions, courses, and active batches' },
  { key: 'importData', label: 'Bulk Data Intake', category: 'System', description: 'Access bulk data import pipeline' },
]

export function RolePermissionsTab() {
  const [rolePermissions, setRolePermissions] = useState<Record<UserRole, Permission[]>>({} as Record<UserRole, Permission[]>)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    loadPermissions()
  }, [])

  const loadPermissions = () => {
    const initial: Partial<Record<UserRole, Permission[]>> = {}
    TARGET_ROLES.forEach(r => {
      initial[r] = getDynamicRolePermissions(r)
    })
    setRolePermissions(initial as Record<UserRole, Permission[]>)
    setHasChanges(false)
  }

  const togglePermission = (role: UserRole, key: Permission) => {
    const current = rolePermissions[role] || []
    const updated = current.includes(key)
      ? current.filter(p => p !== key)
      : [...current, key]

    setRolePermissions(prev => ({
      ...prev,
      [role]: updated
    }))
    setHasChanges(true)
  }

  const handleSaveAll = () => {
    TARGET_ROLES.forEach(role => {
      saveDynamicRolePermissions(role, rolePermissions[role] || [])
    })
    setHasChanges(false)
    toast.success('Role access permissions saved and updated in real-time!', {
      icon: '🛡️',
      duration: 4000
    })
  }

  return (
    <div className="space-y-6">
      <Card className="border-amber-500/30 bg-slate-900/60 backdrop-blur-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2 text-amber-400">
              <ShieldCheck className="w-6 h-6 text-amber-400" />
              Owner Role Access Control & Permission Matrix
            </CardTitle>
            <CardDescription className="text-slate-400 mt-1">
              Dynamically enable or restrict module access for Counselors, Reception, and Faculty in real-time.
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            {hasChanges && (
              <Button variant="outline" size="sm" onClick={loadPermissions} className="border-slate-700 text-slate-300">
                <RotateCcw className="w-4 h-4 mr-1" />
                Discard
              </Button>
            )}
            <Button
              onClick={handleSaveAll}
              disabled={!hasChanges}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-lg shadow-amber-500/20"
            >
              <Check className="w-4 h-4 mr-2" />
              Save Role Permissions
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <Table>
              <TableHeader className="bg-slate-950/80">
                <TableRow>
                  <TableHead className="w-[300px] text-amber-400 font-bold">Module / Capability</TableHead>

                  {TARGET_ROLES.map(role => (
                    <TableHead key={role} className="text-center font-bold text-slate-200">
                      <div className="flex flex-col items-center gap-1">
                        <span>{roleLabels[role]}</span>
                        <Badge variant="outline" className="text-[10px] bg-slate-900 border-amber-500/30 text-amber-400 uppercase">
                          {role}
                        </Badge>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {PERMISSION_CONFIG.map((perm) => (
                  <TableRow key={perm.key} className="hover:bg-slate-800/40 border-b border-slate-800/60">
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span className="text-slate-100 font-semibold">{perm.label}</span>
                        <span className="text-xs text-slate-400">{perm.description}</span>
                      </div>
                    </TableCell>

                    {TARGET_ROLES.map(role => {
                      const isEnabled = (rolePermissions[role] || []).includes(perm.key)
                      return (
                        <TableCell key={`${role}-${perm.key}`} className="text-center">
                          <div className="flex justify-center items-center">
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={() => togglePermission(role, perm.key)}
                              className="data-[state=checked]:bg-amber-500"
                            />
                          </div>
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 p-3 bg-amber-950/20 border border-amber-500/20 rounded-lg flex items-center gap-3 text-xs text-amber-300">
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Owner Privilege Notice:</strong> As Owner, you maintain 100% full administrative access to all modules at all times. Toggles above control what employee staff (Counselor, Reception, Faculty, etc.) can view or edit when logged into their accounts.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
