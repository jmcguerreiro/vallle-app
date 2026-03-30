import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'

import Modal from '@/components/Modal'
import Toast from '@/components/Toast'
import { ROUTES } from '@/constants/routes'
import { USER_ROLES } from '@/constants/user-roles'
import { AuthProvider } from '@/contexts/auth'
import { MainProvider } from '@/contexts/main'
import { ModalProvider } from '@/contexts/modal'
import { ToastProvider } from '@/contexts/toast'
import AdminCompaniesIndex from '@/features/admin/companies/pages/Index'
import AdminCompanyCreate from '@/features/admin/companies/pages/Create'
import AdminCompanyEdit from '@/features/admin/companies/pages/Edit'
import AdminCompanyView from '@/features/admin/companies/pages/View'
import AdminCommissionsIndex from '@/features/admin/commissions/pages/Index'
import AdminCommissionsCompanyDetail from '@/features/admin/commissions/pages/CompanyDetail'
import AdminDashboard from '@/features/admin/dashboard/AdminDashboard'
import AdminUsersIndex from '@/features/admin/users/pages/Index'
import AdminUserCreate from '@/features/admin/users/pages/Create'
import AdminUserEdit from '@/features/admin/users/pages/Edit'
import AdminUserView from '@/features/admin/users/pages/View'
import ForgotPassword from '@/features/auth/ForgotPassword'
import Login from '@/features/auth/Login'
import ResetPassword from '@/features/auth/ResetPassword'
import SelectStore from '@/features/auth/SelectStore'
import Company from '@/features/company/Company'
import Dashboard from '@/features/dashboard/Dashboard'
import ChangePassword from '@/features/profile/pages/ChangePassword'
import Profile from '@/features/profile/Profile'
import Stats from '@/features/stats/Stats'
import VoucherCreate from '@/features/vouchers/pages/Create'
import VoucherEdit from '@/features/vouchers/pages/Edit'
import VouchersIndex from '@/features/vouchers/pages/Index'
import QuickLookup from '@/features/vouchers/pages/QuickLookup'
import QuickRedeem from '@/features/vouchers/pages/QuickRedeem'
import VoucherRedeem from '@/features/vouchers/pages/Redeem'
import VoucherView from '@/features/vouchers/pages/View'
import BlankLayout from '@/layouts/blank'
import DefaultLayout from '@/layouts/default'
import { useAuth } from '@/hooks/useAuth'
import AuthGuard from '@/router/AuthGuard'
import RoleGuard from '@/router/RoleGuard'

const AdminRoute = ({ children }) => (
  <RoleGuard allowedRoles={[USER_ROLES.SUPER_ADMIN]}>{children}</RoleGuard>
)

/**
 * Component: HomeDashboard
 * Renders the correct dashboard based on the user's role.
 * Super admins see the platform overview; regular admins see the store dashboard.
 * @component
 * @returns {JSX.Element}
 */
const HomeDashboard = () => {
  const { isSuperAdmin } = useAuth()
  return isSuperAdmin ? <AdminDashboard /> : <Dashboard />
}

/**
 * Component: AppRoutes
 * Handles background location logic for modal routes.
 * When a modal link passes `state.backgroundLocation`, the page routes
 * render against that background location (keeping the current page visible)
 * while the modal routes render on top at the actual URL.
 * @component
 * @returns {JSX.Element}
 */
const AppRoutes = () => {
  // Hooks
  const location = useLocation()

  // Derived State
  const backgroundLocation = location.state?.backgroundLocation

  // Render
  return (
    <>
      <Routes location={backgroundLocation || location}>
        <Route element={<BlankLayout />}>
          <Route element={<Login />} path={ROUTES.LOGIN} />
          <Route element={<ForgotPassword />} path={ROUTES.FORGOT_PASSWORD} />
          <Route element={<ResetPassword />} path={ROUTES.RESET_PASSWORD} />
          <Route element={<SelectStore />} path={ROUTES.SELECT_STORE} />
        </Route>
        <Route
          element={
            <AuthGuard>
              <DefaultLayout />
            </AuthGuard>
          }
        >
          <Route element={<HomeDashboard />} index />
          <Route element={<VouchersIndex />} path={ROUTES.VOUCHERS} />
          <Route element={<VoucherCreate />} path={ROUTES.VOUCHERS_MODAL_CREATE} />
          <Route element={<VoucherView />} path={ROUTES.VOUCHERS_MODAL_VIEW} />
          <Route element={<VoucherEdit />} path={ROUTES.VOUCHERS_MODAL_EDIT} />
          <Route element={<VoucherRedeem />} path={ROUTES.VOUCHERS_MODAL_REDEEM} />
          <Route element={<QuickRedeem />} path={ROUTES.VOUCHERS_MODAL_QUICK_REDEEM} />
          <Route element={<QuickLookup />} path={ROUTES.VOUCHERS_MODAL_QUICK_LOOKUP} />
          <Route element={<Stats />} path={ROUTES.STATS} />
          <Route element={<Profile />} path={ROUTES.PROFILE} />
          <Route element={<ChangePassword />} path={ROUTES.PROFILE_MODAL_CHANGE_PASSWORD} />
          <Route element={<Company />} path={ROUTES.COMPANY} />

          {/* Admin routes (super_admin only) */}
          <Route element={<AdminRoute><AdminCompaniesIndex /></AdminRoute>} path={ROUTES.ADMIN_COMPANIES} />
          <Route element={<AdminRoute><AdminCompanyCreate /></AdminRoute>} path={ROUTES.ADMIN_COMPANIES_MODAL_CREATE} />
          <Route element={<AdminRoute><AdminCompanyView /></AdminRoute>} path={ROUTES.ADMIN_COMPANIES_MODAL_VIEW} />
          <Route element={<AdminRoute><AdminCompanyEdit /></AdminRoute>} path={ROUTES.ADMIN_COMPANIES_MODAL_EDIT} />
          <Route element={<AdminRoute><AdminUsersIndex /></AdminRoute>} path={ROUTES.ADMIN_USERS} />
          <Route element={<AdminRoute><AdminUserCreate /></AdminRoute>} path={ROUTES.ADMIN_USERS_MODAL_CREATE} />
          <Route element={<AdminRoute><AdminUserView /></AdminRoute>} path={ROUTES.ADMIN_USERS_MODAL_VIEW} />
          <Route element={<AdminRoute><AdminUserEdit /></AdminRoute>} path={ROUTES.ADMIN_USERS_MODAL_EDIT} />
          <Route element={<AdminRoute><AdminCommissionsIndex /></AdminRoute>} path={ROUTES.ADMIN_COMMISSIONS} />
          <Route element={<AdminRoute><AdminCommissionsCompanyDetail /></AdminRoute>} path={ROUTES.ADMIN_COMMISSIONS_MODAL_DETAIL} />
        </Route>
      </Routes>

      {backgroundLocation && (
        <ModalProvider>
          <Routes>
            <Route element={<Modal><VoucherCreate /></Modal>} path={ROUTES.VOUCHERS_MODAL_CREATE} />
            <Route element={<Modal><VoucherView /></Modal>} path={ROUTES.VOUCHERS_MODAL_VIEW} />
            <Route element={<Modal><VoucherEdit /></Modal>} path={ROUTES.VOUCHERS_MODAL_EDIT} />
            <Route element={<Modal><VoucherRedeem /></Modal>} path={ROUTES.VOUCHERS_MODAL_REDEEM} />
            <Route element={<Modal><QuickRedeem /></Modal>} path={ROUTES.VOUCHERS_MODAL_QUICK_REDEEM} />
            <Route element={<Modal><QuickLookup /></Modal>} path={ROUTES.VOUCHERS_MODAL_QUICK_LOOKUP} />
            <Route element={<Modal><ChangePassword /></Modal>} path={ROUTES.PROFILE_MODAL_CHANGE_PASSWORD} />

            {/* Admin modals */}
            <Route element={<Modal><AdminCompanyCreate /></Modal>} path={ROUTES.ADMIN_COMPANIES_MODAL_CREATE} />
            <Route element={<Modal><AdminCompanyView /></Modal>} path={ROUTES.ADMIN_COMPANIES_MODAL_VIEW} />
            <Route element={<Modal><AdminCompanyEdit /></Modal>} path={ROUTES.ADMIN_COMPANIES_MODAL_EDIT} />
            <Route element={<Modal><AdminUserCreate /></Modal>} path={ROUTES.ADMIN_USERS_MODAL_CREATE} />
            <Route element={<Modal><AdminUserView /></Modal>} path={ROUTES.ADMIN_USERS_MODAL_VIEW} />
            <Route element={<Modal><AdminUserEdit /></Modal>} path={ROUTES.ADMIN_USERS_MODAL_EDIT} />
            <Route element={<Modal size="wide"><AdminCommissionsCompanyDetail /></Modal>} path={ROUTES.ADMIN_COMMISSIONS_MODAL_DETAIL} />
          </Routes>
        </ModalProvider>
      )}
    </>
  )
}

/**
 * Component: App
 * Root component — sets up auth provider, routing, and layouts.
 * @component
 * @returns {JSX.Element}
 */
const App = () => {
  // Render
  return (
    <BrowserRouter>
      <AuthProvider>
        <MainProvider>
          <ToastProvider>
            <AppRoutes />
            <Toast />
          </ToastProvider>
        </MainProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
