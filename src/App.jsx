import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'

import Modal from '@/components/Modal'
import { ROUTES } from '@/constants/routes'
import { USER_ROLES } from '@/constants/user-roles'
import { AuthProvider } from '@/contexts/auth'
import { MainProvider } from '@/contexts/main'
import { ModalProvider } from '@/contexts/modal'
import ForgotPassword from '@/features/auth/ForgotPassword'
import Login from '@/features/auth/Login'
import ResetPassword from '@/features/auth/ResetPassword'
import SelectStore from '@/features/auth/SelectStore'
import Company from '@/features/company/Company'
import Commissions from '@/features/commissions/Commissions'
import Dashboard from '@/features/dashboard/Dashboard'
import Profile from '@/features/profile/Profile'
import ChangePassword from '@/features/profile/pages/ChangePassword'
import Stats from '@/features/stats/Stats'
import VoucherCreate from '@/features/vouchers/pages/Create'
import VoucherEdit from '@/features/vouchers/pages/Edit'
import VouchersIndex from '@/features/vouchers/pages/Index'
import VoucherView from '@/features/vouchers/pages/View'
import BlankLayout from '@/layouts/blank'
import DefaultLayout from '@/layouts/default'
import AuthGuard from '@/router/AuthGuard'
import RoleGuard from '@/router/RoleGuard'

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
          <Route element={<Dashboard />} index />
          <Route element={<VouchersIndex />} path={ROUTES.VOUCHERS} />
          <Route element={<VoucherCreate />} path={ROUTES.VOUCHERS_MODAL_CREATE} />
          <Route element={<VoucherView />} path={ROUTES.VOUCHERS_MODAL_VIEW} />
          <Route element={<VoucherEdit />} path={ROUTES.VOUCHERS_MODAL_EDIT} />
          <Route element={<Stats />} path={ROUTES.STATS} />
          <Route element={<Profile />} path={ROUTES.PROFILE} />
          <Route element={<ChangePassword />} path={ROUTES.PROFILE_MODAL_CHANGE_PASSWORD} />
          <Route element={<Company />} path={ROUTES.COMPANY} />
          <Route
            element={
              <RoleGuard allowedRoles={[USER_ROLES.SUPER_ADMIN]}>
                <Commissions />
              </RoleGuard>
            }
            path={ROUTES.COMMISSIONS}
          />
        </Route>
      </Routes>

      {backgroundLocation && (
        <ModalProvider>
          <Routes>
            <Route element={<Modal><VoucherCreate /></Modal>} path={ROUTES.VOUCHERS_MODAL_CREATE} />
            <Route element={<Modal><VoucherView /></Modal>} path={ROUTES.VOUCHERS_MODAL_VIEW} />
            <Route element={<Modal><VoucherEdit /></Modal>} path={ROUTES.VOUCHERS_MODAL_EDIT} />
            <Route element={<Modal><ChangePassword /></Modal>} path={ROUTES.PROFILE_MODAL_CHANGE_PASSWORD} />
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
          <AppRoutes />
        </MainProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
