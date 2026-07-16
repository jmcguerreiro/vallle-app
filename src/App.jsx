import {
  BrowserRouter,
  matchPath,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import Confetti from "@/components/Confetti";
import Confirm from "@/components/Confirm";
import Toast from "@/components/Toast";
import { ROUTES } from "@/constants/routes";
import { ACCOUNT_ROLES } from "@/constants/user-roles";
import { AuthProvider } from "@/contexts/auth";
import { ConfettiProvider } from "@/contexts/confetti";
import { ConfirmProvider } from "@/contexts/confirm";
import { MainProvider } from "@/contexts/main";
import { ModalProvider } from "@/contexts/modal";
import { ToastProvider } from "@/contexts/toast";
import AdminCompanyCreate from "@/features/admin/companies/pages/Create";
import AdminCompanyEdit from "@/features/admin/companies/pages/Edit";
import AdminCompaniesIndex from "@/features/admin/companies/pages/Index";
import AdminCompanyView from "@/features/admin/companies/pages/View";
import AdminDashboard from "@/features/admin/dashboard/pages/Index";
import AdminOrderCreate from "@/features/admin/orders/pages/Create";
import AdminOrderEdit from "@/features/admin/orders/pages/Edit";
import AdminOrdersIndex from "@/features/admin/orders/pages/Index";
import AdminOrderView from "@/features/admin/orders/pages/View";
import AdminUserCreate from "@/features/admin/users/pages/Create";
import AdminUserEdit from "@/features/admin/users/pages/Edit";
import AdminUsersIndex from "@/features/admin/users/pages/Index";
import AdminUserView from "@/features/admin/users/pages/View";
import ForgotPassword from "@/features/auth/pages/ForgotPassword";
import Login from "@/features/auth/pages/Login";
import ResetPassword from "@/features/auth/pages/ResetPassword";
import SelectStore from "@/features/auth/pages/SelectStore";
import Dashboard from "@/features/dashboard/pages/Index";
import ChangePassword from "@/features/profile/pages/ChangePassword";
import Profile from "@/features/profile/Profile";
import CompanyEdit from "@/features/settings/pages/CompanyEdit";
import Settings from "@/features/settings/pages/Index";
import CompanyUserCreate from "@/features/settings/pages/UserCreate";
import CompanyUserEdit from "@/features/settings/pages/UserEdit";
import CompanyUserList from "@/features/settings/pages/UserList";
import StatsIndex from "@/features/stats/pages/Index";
import VallleCreate from "@/features/vallles/pages/Create";
import VallleEdit from "@/features/vallles/pages/Edit";
import ValllesIndex from "@/features/vallles/pages/Index";
import QuickLookup from "@/features/vallles/pages/QuickLookup";
import QuickRedeem from "@/features/vallles/pages/QuickRedeem";
import VallleRedeem from "@/features/vallles/pages/Redeem";
import VallleView from "@/features/vallles/pages/View";
import { useAuth } from "@/hooks/useAuth";
import BlankLayout from "@/layouts/Blank";
import DefaultLayout from "@/layouts/Default";
import AuthGuard from "@/router/AuthGuard";
import RoleGuard from "@/router/RoleGuard";
import RouteModal from "@/router/RouteModal";
import ScrollToTop from "@/router/ScrollToTop";

const AdminRoute = ({ children }) => (
  <RoleGuard allowedRoles={[ACCOUNT_ROLES.SUPER_ADMIN]}>{children}</RoleGuard>
);

/**
 * Gates a route to admins of the active store (store-scoped role) or platform
 * super_admins. Redirects to the home page otherwise.
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @returns {JSX.Element}
 */
const StoreAdminRoute = ({ children }) => {
  const { isAdmin } = useAuth();
  return isAdmin ? children : <Navigate replace to={ROUTES.HOME} />;
};

/**
 * Path patterns that render as URL-driven modals. When one of these is opened
 * directly (no `backgroundLocation` in router state), we synthesize the home
 * dashboard as the background so it still renders in a modal rather than as a
 * full page.
 */
const MODAL_ROUTE_PATHS = [
  ROUTES.VALLLES_MODAL_CREATE,
  ROUTES.VALLLES_MODAL_VIEW,
  ROUTES.VALLLES_MODAL_EDIT,
  ROUTES.VALLLES_MODAL_REDEEM,
  ROUTES.VALLLES_MODAL_QUICK_REDEEM,
  ROUTES.VALLLES_MODAL_QUICK_LOOKUP,
  ROUTES.PROFILE_MODAL_CHANGE_PASSWORD,
  ROUTES.SETTINGS_USERS_MODAL_CREATE,
  ROUTES.SETTINGS_USERS_MODAL_EDIT,
  ROUTES.ADMIN_COMPANIES_MODAL_CREATE,
  ROUTES.ADMIN_COMPANIES_MODAL_VIEW,
  ROUTES.ADMIN_COMPANIES_MODAL_EDIT,
  ROUTES.ADMIN_USERS_MODAL_CREATE,
  ROUTES.ADMIN_USERS_MODAL_VIEW,
  ROUTES.ADMIN_USERS_MODAL_EDIT,
  ROUTES.ADMIN_ORDERS_MODAL_CREATE,
  ROUTES.ADMIN_ORDERS_MODAL_VIEW,
  ROUTES.ADMIN_ORDERS_MODAL_EDIT,
];

/**
 * Component: HomeDashboard
 * Renders the correct dashboard based on the user's role.
 * Super admins see the platform overview; regular admins see the store dashboard.
 * @component
 * @returns {JSX.Element}
 */
const HomeDashboard = () => {
  const { isSuperAdmin } = useAuth();
  return isSuperAdmin ? <AdminDashboard /> : <Dashboard />;
};

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
  const location = useLocation();

  // Derived State
  // When a modal route is opened directly (no background passed via state),
  // synthesize the home dashboard as the background so it still renders as a
  // modal on top of the dashboard rather than as a standalone page.
  const isModalRoute = MODAL_ROUTE_PATHS.some((path) =>
    matchPath(path, location.pathname),
  );
  const backgroundLocation =
    location.state?.backgroundLocation ??
    (isModalRoute ? { pathname: ROUTES.HOME } : null);

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
          <Route element={<StatsIndex />} path={ROUTES.STATS} />
          <Route element={<Profile />} path={ROUTES.PROFILE} />
          <Route element={<Settings />} path={ROUTES.SETTINGS}>
            <Route
              element={<Navigate replace to={ROUTES.SETTINGS_COMPANY} />}
              index
            />
            <Route element={<CompanyEdit />} path={ROUTES.SETTINGS_COMPANY} />
            <Route
              element={
                <StoreAdminRoute>
                  <CompanyUserList />
                </StoreAdminRoute>
              }
              path={ROUTES.SETTINGS_USERS}
            />
          </Route>

          {/* Admin routes (super_admin only) */}
          <Route
            element={
              <AdminRoute>
                <AdminCompaniesIndex />
              </AdminRoute>
            }
            path={ROUTES.ADMIN_COMPANIES}
          />
          <Route
            element={
              <AdminRoute>
                <AdminUsersIndex />
              </AdminRoute>
            }
            path={ROUTES.ADMIN_USERS}
          />
          <Route
            element={
              <AdminRoute>
                <AdminOrdersIndex />
              </AdminRoute>
            }
            path={ROUTES.ADMIN_ORDERS}
          />
        </Route>
      </Routes>

      {backgroundLocation && (
        <ModalProvider>
          <AuthGuard>
            {/* Keyed by location so navigating modal-to-modal (e.g. tapping a
                row while the previous drawer animates out) mounts a fresh
                RouteModal instead of reusing one whose open state is stale. */}
            <Routes key={location.key}>
              <Route
                element={
                  <RouteModal>
                    <VallleCreate />
                  </RouteModal>
                }
                path={ROUTES.VALLLES_MODAL_CREATE}
              />
              <Route
                element={
                  <RouteModal>
                    <VallleView />
                  </RouteModal>
                }
                path={ROUTES.VALLLES_MODAL_VIEW}
              />
              <Route
                element={
                  <RouteModal>
                    <VallleEdit />
                  </RouteModal>
                }
                path={ROUTES.VALLLES_MODAL_EDIT}
              />
              <Route
                element={
                  <RouteModal>
                    <VallleRedeem />
                  </RouteModal>
                }
                path={ROUTES.VALLLES_MODAL_REDEEM}
              />
              <Route
                element={
                  <RouteModal>
                    <QuickRedeem />
                  </RouteModal>
                }
                path={ROUTES.VALLLES_MODAL_QUICK_REDEEM}
              />
              <Route
                element={
                  <RouteModal>
                    <QuickLookup />
                  </RouteModal>
                }
                path={ROUTES.VALLLES_MODAL_QUICK_LOOKUP}
              />
              <Route
                element={
                  <RouteModal>
                    <ChangePassword />
                  </RouteModal>
                }
                path={ROUTES.PROFILE_MODAL_CHANGE_PASSWORD}
              />

              {/* Settings user modals (store-admin only — guarded for direct access) */}
              <Route
                element={
                  <StoreAdminRoute>
                    <RouteModal>
                      <CompanyUserCreate />
                    </RouteModal>
                  </StoreAdminRoute>
                }
                path={ROUTES.SETTINGS_USERS_MODAL_CREATE}
              />
              <Route
                element={
                  <StoreAdminRoute>
                    <RouteModal>
                      <CompanyUserEdit />
                    </RouteModal>
                  </StoreAdminRoute>
                }
                path={ROUTES.SETTINGS_USERS_MODAL_EDIT}
              />

              {/* Admin modals (super_admin only — guarded for direct access) */}
              <Route
                element={
                  <AdminRoute>
                    <RouteModal>
                      <AdminCompanyCreate />
                    </RouteModal>
                  </AdminRoute>
                }
                path={ROUTES.ADMIN_COMPANIES_MODAL_CREATE}
              />
              <Route
                element={
                  <AdminRoute>
                    <RouteModal>
                      <AdminCompanyView />
                    </RouteModal>
                  </AdminRoute>
                }
                path={ROUTES.ADMIN_COMPANIES_MODAL_VIEW}
              />
              <Route
                element={
                  <AdminRoute>
                    <RouteModal>
                      <AdminCompanyEdit />
                    </RouteModal>
                  </AdminRoute>
                }
                path={ROUTES.ADMIN_COMPANIES_MODAL_EDIT}
              />
              <Route
                element={
                  <AdminRoute>
                    <RouteModal>
                      <AdminUserCreate />
                    </RouteModal>
                  </AdminRoute>
                }
                path={ROUTES.ADMIN_USERS_MODAL_CREATE}
              />
              <Route
                element={
                  <AdminRoute>
                    <RouteModal>
                      <AdminUserView />
                    </RouteModal>
                  </AdminRoute>
                }
                path={ROUTES.ADMIN_USERS_MODAL_VIEW}
              />
              <Route
                element={
                  <AdminRoute>
                    <RouteModal>
                      <AdminUserEdit />
                    </RouteModal>
                  </AdminRoute>
                }
                path={ROUTES.ADMIN_USERS_MODAL_EDIT}
              />
              <Route
                element={
                  <AdminRoute>
                    <RouteModal>
                      <AdminOrderCreate />
                    </RouteModal>
                  </AdminRoute>
                }
                path={ROUTES.ADMIN_ORDERS_MODAL_CREATE}
              />
              <Route
                element={
                  <AdminRoute>
                    <RouteModal>
                      <AdminOrderView />
                    </RouteModal>
                  </AdminRoute>
                }
                path={ROUTES.ADMIN_ORDERS_MODAL_VIEW}
              />
              <Route
                element={
                  <AdminRoute>
                    <RouteModal>
                      <AdminOrderEdit />
                    </RouteModal>
                  </AdminRoute>
                }
                path={ROUTES.ADMIN_ORDERS_MODAL_EDIT}
              />
            </Routes>
          </AuthGuard>
        </ModalProvider>
      )}
    </>
  );
};

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
            <ConfettiProvider>
              <ConfirmProvider>
                <AppRoutes />
                <Toast />
                <Confetti />
                <Confirm />
              </ConfirmProvider>
            </ConfettiProvider>
          </ToastProvider>
        </MainProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
