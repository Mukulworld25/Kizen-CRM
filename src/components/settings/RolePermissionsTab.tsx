import { useState } from 'react'
import toast from 'react-hot-toast'
import { ShieldCheck, Lock, Check, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useFeaturePermissions, DEFAULT_FACULTY_FEATURES, DEFAULT_COUNSELOR_FEATURES, DEFAULT_RECEPTION_FEATURES } from '@/hooks/useFeaturePermissions'
import { roleLabels } from '@/lib/permissions'
import type { UserRole } from '@/types'

const TARGET_ROLES: UserRole[] = ['faculty', 'counselor', 'reception', 'accounts', 'bdm']

interface TabFeatureConfig {
  key: string
  label: string
  category: string
  description: string
}

const TAB_FEATURES: TabFeatureConfig[] = [
  { key: 'dashboard', label: 'Dashboard & Metrics', category: 'General', description: 'Access main KPI analytics dashboard' },
  { key: 'leads', label: 'Leads Directory', category: 'Leads', description: 'Access leads list and detail pages' },
  { key: 'tasks', label: 'Tasks & Follow-ups', category: 'Follow-ups', description: 'Access tasks list and follow-up activities' },
  { key: 'calendar', label: 'Calendar Schedule', category: 'Follow-ups', description: 'Interactive schedule calendar for reminders, meetings & tasks' },
  { key: 'students', label: 'Student Directory', category: 'Academic', description: 'View admitted student profiles and documents' },
  { key: 'batches', label: 'Batches & Timings', category: 'Academic', description: 'View active student batches and course timings' },
  { key: 'fees', label: 'Fee Management', category: 'Finance', description: 'View student fee structures and payment plans' },
  { key: 'expenses', label: 'Expense Recording', category: 'Finance', description: 'Record and monitor institute operational expenses' },
  { key: 'study_materials', label: 'Faculty & Study Material Upload', category: 'Faculty', description: 'Faculty HOD portal for managing student classes, notes & study materials' },
  { key: 'institutions', label: 'Institutions & Colleges', category: 'Academic', description: 'View partner schools, colleges, and institution data' },
  { key: 'reports', label: 'Analytics Reports', category: 'Finance', description: 'Generate and download financial and admission reports' },
  { key: 'import', label: 'Bulk Data Import', category: 'System', description: 'Access Excel bulk data intake pipeline' },
]

export function RolePermissionsTab() {
  const { dbPermissions, togglePermission, isUpdating, isLoading } = useFeaturePermissions()
  const [updatingKey, setUpdatingKey] = useState<string | null>(null)

  const isFeatureEnabledForRole = (role: UserRole, featureKey: string): boolean => {
    const rolePerm = dbPermissions.find(
      (p) => p.feature_key === featureKey && p.role === role && !p.user_id
    )
    if (rolePerm !== undefined) return rolePerm.can_view

    // Defaults
    if (role === 'faculty' || role === 'hod') return DEFAULT_FACULTY_FEATURES.includes(featureKey)
    if (role === 'counselor') return DEFAULT_COUNSELOR_FEATURES.includes(featureKey)
    if (role === 'reception') return DEFAULT_RECEPTION_FEATURES.includes(featureKey)
    return false
  }

  const handleToggle = async (role: UserRole, featureKey: string, currentStatus: boolean) => {
    setUpdatingKey(`${role}-${featureKey}`)
    try {
      await togglePermission({
        feature_key: featureKey,
        role: role,
        user_id: null,
        can_view: !currentStatus,
        can_edit: !currentStatus,
      })
      toast.success(`Updated ${featureKey} tab access for ${roleLabels[role]}!`, { icon: '🛡️' })
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update feature_permissions table')
    } finally {
      setUpdatingKey(null)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-amber-500/30 bg-slate-900/60 backdrop-blur-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2 text-amber-400">
              <ShieldCheck className="w-6 h-6 text-amber-400" />
              Role-Based Tab Visibility & Feature Permissions
            </CardTitle>
            <CardDescription className="text-slate-400 mt-1">
              Read and write tab access directly to the Supabase <code className="text-amber-300 font-mono text-xs">feature_permissions</code> table.
            </CardDescription>
          </div>
          <Badge variant="outline" className="border-amber-500/40 text-amber-400 bg-amber-950/30 px-3 py-1">
            Live Database Connected
          </Badge>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mr-2 text-amber-400" />
              Loading permissions matrix...
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <Table>
                <TableHeader className="bg-slate-950/80">
                  <TableRow>
                    <TableHead className="w-[320px] text-amber-400 font-bold">Tab / Module Feature</TableHead>
                    {TARGET_ROLES.map((role) => (
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
                  {TAB_FEATURES.map((feature) => (
                    <TableRow key={feature.key} className="hover:bg-slate-800/40 border-b border-slate-800/60">
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span className="text-slate-100 font-semibold flex items-center gap-1.5">
                            {feature.label}
                          </span>
                          <span className="text-xs text-slate-400">{feature.description}</span>
                        </div>
                      </TableCell>

                      {TARGET_ROLES.map((role) => {
                        const isEnabled = isFeatureEnabledForRole(role, feature.key)
                        const keyId = `${role}-${feature.key}`
                        const isThisUpdating = isUpdating && updatingKey === keyId

                        return (
                          <TableCell key={keyId} className="text-center">
                            <div className="flex justify-center items-center">
                              {isThisUpdating ? (
                                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                              ) : (
                                <Switch
                                  checked={isEnabled}
                                  onCheckedChange={() => handleToggle(role, feature.key, isEnabled)}
                                  className="data-[state=checked]:bg-amber-500"
                                />
                              )}
                            </div>
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="mt-4 p-3 bg-amber-950/20 border border-amber-500/20 rounded-lg flex items-center gap-3 text-xs text-amber-300">
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Owner Role Privilege:</strong> As Owner, you maintain 100% full access to all tabs, all data, and no filters at all times. Toggles above directly modify the <code className="text-amber-200">feature_permissions</code> table in Supabase.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
