import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/hooks/useAuth'
import { ProtectedRoute, RoleGuard } from '@/components/auth/ProtectedRoute'
import { Layout } from '@/components/layout/Layout'
import Login from '@/pages/auth/Login'
import Dashboard from '@/pages/dashboard/Dashboard'
import LeadList from '@/pages/leads/LeadList'
import LeadDetail from '@/pages/leads/LeadDetail'
import FollowUps from '@/pages/followups/FollowUps'
import StudentList from '@/pages/students/StudentList'
import StudentDetail from '@/pages/students/StudentDetail'
import FeeManagement from '@/pages/fees/FeeManagement'
import FeeDetail from '@/pages/fees/FeeDetail'
import Reports from '@/pages/reports/Reports'
import Settings from '@/pages/settings/Settings'
import InstitutionList from '@/pages/institutions/InstitutionList'
import InstitutionDetail from '@/pages/institutions/InstitutionDetail'
import ExpensesPage from '@/pages/expenses/ExpensesPage'
import FacultyDashboard from '@/pages/faculty/FacultyDashboard'
import LeadImport from '@/pages/leads/LeadImport'
import { CommandPalette } from '@/components/shared/CommandPalette'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="leads" element={<LeadList />} />
              <Route path="leads/:id" element={<LeadDetail />} />
              <Route path="followups" element={<FollowUps />} />
              <Route path="institutions" element={<InstitutionList />} />
              <Route path="institutions/:id" element={<InstitutionDetail />} />
              <Route path="expenses" element={<ExpensesPage />} />
              <Route path="faculty" element={<FacultyDashboard />} />
              <Route
                path="import"
                element={
                  <RoleGuard permission="importData" fallback={<Navigate to="/dashboard" replace />}>
                    <LeadImport />
                  </RoleGuard>
                }
              />
              <Route path="students" element={<StudentList />} />
              <Route path="students/:id" element={<StudentDetail />} />
              <Route path="fees" element={<FeeManagement />} />
              <Route path="fees/:id" element={<FeeDetail />} />
              <Route
                path="reports"
                element={
                  <RoleGuard permission="viewReports" fallback={<Navigate to="/dashboard" replace />}>
                    <Reports />
                  </RoleGuard>
                }
              />
              <Route
                path="settings"
                element={
                  <RoleGuard permission="manageUsers" fallback={<Navigate to="/dashboard" replace />}>
                    <Settings />
                  </RoleGuard>
                }
              />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          <CommandPalette />
        </BrowserRouter>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      </AuthProvider>
    </QueryClientProvider>
  )
}
