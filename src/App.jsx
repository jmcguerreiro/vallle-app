import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'

import Modal from '@/components/Modal'
import Toast from '@/components/Toast'
import { ROUTES } from '@/constants/routes'
import { USER_ROLES } from '@/constants/user-roles'
import { AuthProvider } from '@/contexts/auth'
import { MainProvider } from '@/contexts/main'
import { ModalProvider } from '@/contexts/modal'
import { ToastProvider } from '@/contexts/toast'
import AdminCommissionsCompanyDetail from '@/features/admin/commissions/pages/CompanyDetail'
import AdminCommissionsIndex from '@/features/admin/commissions/pages/Index'
import AdminCompanyCreate from '@/features/admin/companies/pages/Create'
import AdminCompanyEdit from '@/features/admin/companies/pages/Edit'
import AdminCompaniesIndex from '@/features/admin/companies/pages/Index'
import AdminCompanyView from '@/features/admin/companies/pages/View'
import AdminDashboard from '@/features/admin/dashboard/pages/Index'
import AdminUserCreate from '@/features/admin/users/pages/Create'
import AdminUserEdit from '@/features/admin/users/pages/Edit'
import AdminUsersIndex from '@/features/admin/users/pages/Index'
import AdminUserView from '@/features/admin/users/pages/View'
import ForgotPassword from '@/features/auth/ForgotPassword'
import Login from '@/features/auth/Login'
import ResetPassword from '@/features/auth/ResetPassword'
import SelectStore from '@/features/auth/SelectStore'
import Dashboard from '@/features/dashboard/pages/Index'
import ChangePassword from '@/features/profile/pages/ChangePassword'
import Profile from '@/features/profile/Profile'
import CompanyDetails from '@/features/settings/CompanyDetails'
import CompanyUsers from '@/features/settings/CompanyUsers'
import Settings from '@/features/settings/pages/Index'
import SettingsUserCreate from '@/features/settings/pages/UserCreate'
import SettingsUserEdit from '@/features/settings/pages/UserEdit'
import StatsIndex from '@/features/stats/pages/Index'
import VallleCreate from '@/features/vallles/pages/Create'
import VallleEdit from '@/features/vallles/pages/Edit'
import ValllesIndex from '@/features/vallles/pages/Index'
import QuickLookup from '@/features/vallles/pages/QuickLookup'
import QuickRedeem from '@/features/vallles/pages/QuickRedeem'
import VallleRedeem from '@/features/vallles/pages/Redeem'
import VallleView from '@/features/vallles/pages/View'
import { useAuth } from '@/hooks/useAuth'
import BlankLayout from '@/layouts/Blank'
import DefaultLayout from '@/layouts/Default'
import AuthGuard from '@/router/AuthGuard'
import RoleGuard from '@/router/RoleGuard'
import ScrollToTop from '@/router/ScrollToTop'

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
          <Route element={<ValllesIndex />} path={ROUTES.VALLLES} />
          <Route element={<VallleCreate />} path={ROUTES.VALLLES_MODAL_CREATE} />
          <Route element={<VallleView />} path={ROUTES.VALLLES_MODAL_VIEW} />
          <Route element={<VallleEdit />} path={ROUTES.VALLLES_MODAL_EDIT} />
          <Route element={<VallleRedeem />} path={ROUTES.VALLLES_MODAL_REDEEM} />
          <Route element={<QuickRedeem />} path={ROUTES.VALLLES_MODAL_QUICK_REDEEM} />
          <Route element={<QuickLookup />} path={ROUTES.VALLLES_MODAL_QUICK_LOOKUP} />
          <Route element={<StatsIndex />} path={ROUTES.STATS} />
          <Route element={<Profile />} path={ROUTES.PROFILE} />
          <Route element={<ChangePassword />} path={ROUTES.PROFILE_MODAL_CHANGE_PASSWORD} />
          <Route element={<Settings />} path={ROUTES.SETTINGS}>
            <Route element={<Navigate replace to={ROUTES.SETTINGS_COMPANY} />} index />
            <Route element={<CompanyDetails />} path={ROUTES.SETTINGS_COMPANY} />
            <Route
              element={
                <RoleGuard allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]}>
                  <CompanyUsers />
                </RoleGuard>
              }
              path={ROUTES.SETTINGS_USERS}
            />
          </Route>
          <Route element={<SettingsUserCreate />} path={ROUTES.SETTINGS_USERS_MODAL_CREATE} />
          <Route element={<SettingsUserEdit />} path={ROUTES.SETTINGS_USERS_MODAL_EDIT} />

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
            <Route element={<Modal><VallleCreate /></Modal>} path={ROUTES.VALLLES_MODAL_CREATE} />
            <Route element={<Modal><VallleView /></Modal>} path={ROUTES.VALLLES_MODAL_VIEW} />
            <Route element={<Modal><VallleEdit /></Modal>} path={ROUTES.VALLLES_MODAL_EDIT} />
            <Route element={<Modal><VallleRedeem /></Modal>} path={ROUTES.VALLLES_MODAL_REDEEM} />
            <Route element={<Modal><QuickRedeem /></Modal>} path={ROUTES.VALLLES_MODAL_QUICK_REDEEM} />
            <Route element={<Modal><QuickLookup /></Modal>} path={ROUTES.VALLLES_MODAL_QUICK_LOOKUP} />
            <Route element={<Modal><ChangePassword /></Modal>} path={ROUTES.PROFILE_MODAL_CHANGE_PASSWORD} />

            {/* Settings user modals */}
            <Route element={<Modal><SettingsUserCreate /></Modal>} path={ROUTES.SETTINGS_USERS_MODAL_CREATE} />
            <Route element={<Modal><SettingsUserEdit /></Modal>} path={ROUTES.SETTINGS_USERS_MODAL_EDIT} />

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
      <ScrollToTop />
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
