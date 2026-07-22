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

const rolePermissions: Record<UserRole, Permission[]> = {
  owner: [
    'viewDashboard', 'viewLeads', 'editLeads', 'deleteLeads', 'addLeads', 'exportData',
    'viewFollowUps', 'viewStudents', 'editStudents', 'markAttendance',
    'viewFees', 'recordPayments', 'viewReports', 'viewRevenue',
    'manageUsers', 'manageCourses', 'viewAuditLogs', 'assignCounselor',
    'viewInstitutions', 'editInstitutions', 'viewExpenses', 'manageExpenses',
    'viewBdmDashboard', 'generateInvoices', 'importData',
  ],
  admin: [
    'viewDashboard', 'viewLeads', 'editLeads', 'deleteLeads', 'addLeads',
    'viewFollowUps', 'viewStudents', 'editStudents', 'markAttendance',
    'viewFees', 'assignCounselor',
  ],
  counselor: [
    'viewDashboard', 'viewLeads', 'editLeads', 'addLeads',
    'viewFollowUps', 'viewStudents', 'editStudents',
  ],
  faculty: [
    'viewDashboard', 'viewStudents', 'markAttendance',
  ],
  accounts: [
    'viewDashboard', 'viewStudents', 'viewFees', 'recordPayments',
  ],
  reception: [
    'viewDashboard', 'viewLeads', 'addLeads',
  ],
  bdm: [
    'viewBdmDashboard', 'viewInstitutions', 'editInstitutions',
    'viewFollowUps', 'viewDashboard',
  ],
}

export function hasPermission(role: UserRole | undefined, permission: Permission, isOwner = false): boolean {
  if (!role) return false
  if (isOwner) return true
  return rolePermissions[role]?.includes(permission) ?? false
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
