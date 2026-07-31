import { useState } from 'react'
import toast from 'react-hot-toast'
import { ShieldCheck, Lock, Loader2, User, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useFeaturePermissions, DEFAULT_FACULTY_FEATURES, DEFAULT_COUNSELOR_FEATURES, DEFAULT_RECEPTION_FEATURES } from '@/hooks/useFeaturePermissions'
import { useUsers } from '@/hooks/useStudents'
import { roleLabels } from '@/lib/permissions'
import type { UserRole, User as UserType } from '@/types'

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
  { key: 'faculty_timetable', label: 'Faculty Time Table', category: 'Faculty', description: 'Weekly class timetable grid and schedules' },
  { key: 'fees', label: 'Fee Management', category: 'Finance', description: 'View student fee structures and payment plans' },
  { key: 'expenses', label: 'Expense Recording', category: 'Finance', description: 'Record and monitor institute operational expenses' },
  { key: 'study_materials', label: 'Faculty Study Materials', category: 'Faculty', description: 'Faculty study material repository and class notes' },
  { key: 'institutions', label: 'Institutions & Colleges', category: 'Academic', description: 'View partner schools, colleges, and institution data' },
  { key: 'reports', label: 'Analytics Reports', category: 'Finance', description: 'Generate and download financial and admission reports' },
  { key: 'import', label: 'Bulk Data Import', category: 'System', description: 'Access Excel bulk data intake pipeline' },
]

export function RolePermissionsTab() {
  const { dbPermissions, togglePermission, isUpdating, isLoading } = useFeaturePermissions()
  const { data: users = [] } = useUsers()
  const [updatingKey, setUpdatingKey] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string>('')

  // Helper to get permission row for role
  const getRolePermission = (role: UserRole, featureKey: string) => {
    return dbPermissions.find((p) => p.feature_key === featureKey && p.role === role && !p.user_id)
  }

  // Helper to check default view access
  const getDefaultViewAccess = (role: UserRole, featureKey: string) => {
    if (role === 'faculty' || role === 'hod') return DEFAULT_FACULTY_FEATURES.includes(featureKey)
    if (role === 'counselor') return DEFAULT_COUNSELOR_FEATURES.includes(featureKey)
    if (role === 'reception') return DEFAULT_RECEPTION_FEATURES.includes(featureKey)
    return false
  }

  // Helper to get user permission row
  const getUserPermission = (userId: string, featureKey: string) => {
    return dbPermissions.find((p) => p.feature_key === featureKey && p.user_id === userId)
  }

  const handleToggleRolePermission = async (
    role: UserRole,
    featureKey: string,
    field: 'can_view' | 'can_edit',
    currentValue: boolean
  ) => {
    const keyId = `role-${role}-${featureKey}-${field}`
    setUpdatingKey(keyId)
    const existing = getRolePermission(role, featureKey)
    const canView = field === 'can_view' ? !currentValue : (existing ? existing.can_view : getDefaultViewAccess(role, featureKey))
    const canEdit = field === 'can_edit' ? !currentValue : (existing ? existing.can_edit : false)

    try {
      await togglePermission({
        feature_key: featureKey,
        role: role,
        user_id: null,
        can_view: canView,
        can_edit: canEdit,
      })
      toast.success(`Updated ${field} for ${featureKey} (${roleLabels[role]})`, { icon: '🛡️' })
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update feature permissions')
    } finally {
      setUpdatingKey(null)
    }
  }

  const handleToggleUserPermission = async (
    userId: string,
    featureKey: string,
    field: 'can_view' | 'can_edit',
    currentValue: boolean
  ) => {
    if (!userId) return
    const keyId = `user-${userId}-${featureKey}-${field}`
    setUpdatingKey(keyId)
    const existing = getUserPermission(userId, featureKey)
    const targetUser = users.find(u => u.id === userId)
    const defaultView = targetUser ? getDefaultViewAccess(targetUser.role, featureKey) : false

    const canView = field === 'can_view' ? !currentValue : (existing ? existing.can_view : defaultView)
    const canEdit = field === 'can_edit' ? !currentValue : (existing ? existing.can_edit : false)

    try {
      await togglePermission({
        feature_key: featureKey,
        role: targetUser?.role || null,
        user_id: userId,
        can_view: canView,
        can_edit: canEdit,
      })
      toast.success(`Updated user override for ${featureKey}`, { icon: '👤' })
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update user permission override')
    } finally {
      setUpdatingKey(null)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-amber-200 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-900">
              <ShieldCheck className="w-6 h-6 text-amber-600" />
              Feature & Tab Access Controls (Roles & User Overrides)
            </CardTitle>
            <CardDescription className="text-slate-600 mt-1">
              Grant or revoke <code className="text-amber-700 font-mono text-xs bg-amber-50 px-1 py-0.5 rounded border border-amber-200">can_view</code> and <code className="text-amber-700 font-mono text-xs bg-amber-50 px-1 py-0.5 rounded border border-amber-200">can_edit</code> permissions per feature_key for roles or specific staff members.
            </CardDescription>
          </div>
          <Badge variant="outline" className="border-amber-300 text-amber-800 bg-amber-50 font-semibold px-3 py-1">
            Live Database Connected
          </Badge>
        </CardHeader>

        <CardContent className="pt-4">
          <Tabs defaultValue="role_matrix">
            <TabsList className="mb-4 bg-slate-100 p-1">
              <TabsTrigger value="role_matrix" className="font-bold flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-600" /> Role-Based Permissions
              </TabsTrigger>
              <TabsTrigger value="user_overrides" className="font-bold flex items-center gap-1.5">
                <User className="w-4 h-4 text-amber-600" /> Individual User Overrides
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: ROLE-BASED PERMISSIONS MATRIX */}
            <TabsContent value="role_matrix">
              {isLoading ? (
                <div className="flex items-center justify-center py-12 text-slate-600 font-medium">
                  <Loader2 className="w-6 h-6 animate-spin mr-2 text-amber-600" /> Loading permissions matrix...
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="w-[300px] text-slate-900 font-bold">Tab / Module Feature</TableHead>
                        {TARGET_ROLES.map((role) => (
                          <TableHead key={role} className="text-center font-bold text-slate-900 border-l border-slate-200">
                            <div className="flex flex-col items-center gap-1 py-1">
                              <span className="text-sm font-bold">{roleLabels[role]}</span>
                              <div className="flex items-center gap-4 text-[10px] text-slate-500 uppercase tracking-wider font-semibold mt-1">
                                <span>View</span>
                                <span>Edit</span>
                              </div>
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {TAB_FEATURES.map((feature) => (
                        <TableRow key={feature.key} className="hover:bg-slate-50/70 border-b border-slate-100">
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span className="text-slate-900 font-bold text-sm">{feature.label}</span>
                              <span className="text-xs text-slate-600 font-medium">{feature.description}</span>
                            </div>
                          </TableCell>

                          {TARGET_ROLES.map((role) => {
                            const rolePerm = getRolePermission(role, feature.key)
                            const canView = rolePerm ? rolePerm.can_view : getDefaultViewAccess(role, feature.key)
                            const canEdit = rolePerm ? rolePerm.can_edit : false

                            const updatingView = isUpdating && updatingKey === `role-${role}-${feature.key}-can_view`
                            const updatingEdit = isUpdating && updatingKey === `role-${role}-${feature.key}-can_edit`

                            return (
                              <TableCell key={`${role}-${feature.key}`} className="text-center border-l border-slate-100">
                                <div className="flex justify-center items-center gap-4">
                                  {/* View Switch */}
                                  {updatingView ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                                  ) : (
                                    <Switch
                                      checked={canView}
                                      onCheckedChange={() => handleToggleRolePermission(role, feature.key, 'can_view', canView)}
                                      className="data-[state=checked]:bg-amber-600"
                                      title={`Toggle View Access for ${feature.label}`}
                                    />
                                  )}

                                  {/* Edit Switch */}
                                  {updatingEdit ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                                  ) : (
                                    <Switch
                                      checked={canEdit}
                                      onCheckedChange={() => handleToggleRolePermission(role, feature.key, 'can_edit', canEdit)}
                                      className="data-[state=checked]:bg-emerald-600"
                                      title={`Toggle Edit Access for ${feature.label}`}
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
            </TabsContent>

            {/* TAB 2: INDIVIDUAL USER OVERRIDES */}
            <TabsContent value="user_overrides" className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Select Staff User for Individual Override</h4>
                  <p className="text-xs text-slate-500">Overrides role-level defaults specifically for this single user profile.</p>
                </div>
                <div className="w-full sm:w-[280px]">
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger className="bg-white font-medium">
                      <SelectValue placeholder="Choose Staff Member..." />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} ({u.email}) — <span className="capitalize">{u.role}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {!selectedUserId ? (
                <div className="p-12 text-center text-slate-500 text-sm bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  Select a staff member from the dropdown above to view and configure their user-level feature overrides.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="w-[340px] text-slate-900 font-bold">Feature Key</TableHead>
                        <TableHead className="text-center font-bold text-slate-900">Can View (Access Tab)</TableHead>
                        <TableHead className="text-center font-bold text-slate-900">Can Edit (Modify Data)</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {TAB_FEATURES.map((feature) => {
                        const targetUser = users.find((u) => u.id === selectedUserId)
                        const userPerm = getUserPermission(selectedUserId, feature.key)
                        const defaultView = targetUser ? getDefaultViewAccess(targetUser.role, feature.key) : false

                        const canView = userPerm ? userPerm.can_view : defaultView
                        const canEdit = userPerm ? userPerm.can_edit : false

                        const updatingView = isUpdating && updatingKey === `user-${selectedUserId}-${feature.key}-can_view`
                        const updatingEdit = isUpdating && updatingKey === `user-${selectedUserId}-${feature.key}-can_edit`

                        return (
                          <TableRow key={feature.key} className="hover:bg-slate-50/70 border-b border-slate-100">
                            <TableCell className="font-medium">
                              <div className="flex flex-col">
                                <span className="text-slate-900 font-bold text-sm">{feature.label}</span>
                                <span className="text-xs text-slate-600 font-medium">{feature.description}</span>
                              </div>
                            </TableCell>

                            <TableCell className="text-center">
                              <div className="flex justify-center items-center">
                                {updatingView ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                                ) : (
                                  <Switch
                                    checked={canView}
                                    onCheckedChange={() => handleToggleUserPermission(selectedUserId, feature.key, 'can_view', canView)}
                                    className="data-[state=checked]:bg-amber-600"
                                  />
                                )}
                              </div>
                            </TableCell>

                            <TableCell className="text-center">
                              <div className="flex justify-center items-center">
                                {updatingEdit ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                                ) : (
                                  <Switch
                                    checked={canEdit}
                                    onCheckedChange={() => handleToggleUserPermission(selectedUserId, feature.key, 'can_edit', canEdit)}
                                    className="data-[state=checked]:bg-emerald-600"
                                  />
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3 text-xs text-amber-900 font-medium">
            <Lock className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Live Permissions Engine:</strong> Toggles write directly to Supabase <code className="text-amber-800 font-semibold">feature_permissions</code> table and take immediate effect upon page refresh or permission re-evaluation.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

