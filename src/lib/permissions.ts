import type { UserRole } from '@/types'

export type Permission =
  | 'viewDashboard'
  | 'viewLeads'
  | 'editLeads'
  | 'deleteLeads'
  | 'addLeads'
  | 'exportData'
  | 'viewFollowUps'
  | 'viewStudents'
  | 'editStudents'
  | 'markAttendance'
  | 'viewFees'
  | 'recordPayments'
  | 'viewReports'
  | 'viewRevenue'
  | 'manageUsers'
  | 'manageCourses'
  | 'viewAuditLogs'
  | 'assignCounselor'
  | 'viewInstitutions'
  | 'editInstitutions'
  | 'viewExpenses'
  | 'manageExpenses'
  | 'viewFacultyDashboard'
  | 'viewBdmDashboard'
  | 'generateInvoices'
  | 'importData'
  | 'viewKnowledgeBase'

const rolePermissions: Record<UserRole, Permission[]> = {
  owner: [
    'viewDashboard', 'viewLeads', 'editLeads', 'deleteLeads', 'addLeads', 'exportData',
    'viewFollowUps', 'viewStudents', 'editStudents', 'markAttendance',
    'viewFees', 'recordPayments', 'viewReports', 'viewRevenue',
    'manageUsers', 'manageCourses', 'viewAuditLogs', 'assignCounselor',
    'viewInstitutions', 'editInstitutions', 'viewExpenses', 'manageExpenses',
    'viewBdmDashboard', 'generateInvoices', 'importData', 'viewKnowledgeBase',
  ],
  admin: [
    'viewDashboard', 'viewLeads', 'editLeads', 'deleteLeads', 'addLeads',
    'viewFollowUps', 'viewStudents', 'editStudents', 'markAttendance',
    'viewFees', 'assignCounselor', 'viewKnowledgeBase',
  ],
  counselor: [
    'viewDashboard', 'viewLeads', 'editLeads', 'addLeads',
    'viewFollowUps', 'viewStudents', 'editStudents', 'viewKnowledgeBase',
  ],
  faculty: [
    'viewDashboard', 'viewStudents', 'markAttendance', 'viewKnowledgeBase',
  ],
  accounts: [
    'viewDashboard', 'viewStudents', 'viewFees', 'recordPayments', 'viewKnowledgeBase',
  ],
  reception: [
    'viewDashboard', 'viewLeads', 'addLeads', 'viewFollowUps', 'viewStudents', 'viewKnowledgeBase',
  ],
  bdm: [
    'viewBdmDashboard', 'viewInstitutions', 'editInstitutions',
    'viewFollowUps', 'viewDashboard', 'viewKnowledgeBase',
  ],
}

const STORAGE_KEY = 'kizen_dynamic_role_permissions'

export function getDynamicRolePermissions(role: UserRole): Permission[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed && parsed[role]) {
        return parsed[role]
      }
    }
  } catch (e) {
    console.error('Failed to parse dynamic permissions:', e)
  }
  return rolePermissions[role] || []
}

export function saveDynamicRolePermissions(role: UserRole, permissions: Permission[]): void {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    const current = saved ? JSON.parse(saved) : {}
    current[role] = permissions
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
    window.dispatchEvent(new Event('kizen_permissions_updated'))
  } catch (e) {
    console.error('Failed to save dynamic permissions:', e)
  }
}

export function hasPermission(role: UserRole | undefined, permission: Permission, isOwner = false): boolean {
  if (!role) return false
  if (isOwner) return true
  const activePermissions = getDynamicRolePermissions(role)
  return activePermissions.includes(permission)
}

export function canAccessRoute(role: UserRole | undefined, path: string, isOwner = false): boolean {
  if (!role) return false
  if (isOwner) return true

  const routePermissions: Record<string, Permission> = {
    '/dashboard': 'viewDashboard',
    '/leads': 'viewLeads',
    '/followups': 'viewFollowUps',
    '/calendar': 'viewFollowUps',
    '/students': 'viewStudents',
    '/fees': 'viewFees',
    '/reports': 'viewReports',
    '/settings': 'manageUsers',
    '/institutions': 'viewInstitutions',
    '/expenses': 'viewExpenses',
    '/faculty': 'viewFacultyDashboard',
    '/import': 'importData',
  }

  const base = '/' + path.split('/').filter(Boolean)[0]
  const permission = routePermissions[base]
  if (!permission) return true
  return hasPermission(role, permission, isOwner)
}

export function getDefaultRoute(role: UserRole): string {
  switch (role) {
    case 'faculty': return '/students'
    case 'accounts': return '/fees'
    default: return '/dashboard'
  }
}

export const roleLabels: Record<UserRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  counselor: 'Counselor',
  faculty: 'Faculty',
  accounts: 'Accounts',
  reception: 'Reception',
  bdm: 'BDM',
}
