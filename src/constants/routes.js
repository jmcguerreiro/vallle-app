/**
 * Client-side route path constants for the Vallle app.
 * Use these instead of hardcoded strings in <Route>, <NavLink>, navigate(), and <Navigate>.
 *
 * Modal route paths (VALLLES_MODAL_*) are full paths used in the top-level
 * modal <Routes> block — they must match the URL that navigation produces.
 * Use valllePath(id) / vallleEditPath(id) helpers for <Link> navigation.
 */
export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
  SELECT_STORE: "/select-store",
  VALLLES: "/vallles",
  VALLLES_MODAL_CREATE: "/vallles/create",
  VALLLES_MODAL_VIEW: "/vallles/:id",
  VALLLES_MODAL_EDIT: "/vallles/:id/edit",
  VALLLES_MODAL_REDEEM: "/vallles/:id/redeem",
  VALLLES_MODAL_QUICK_REDEEM: "/vallles/quick-redeem",
  VALLLES_MODAL_QUICK_LOOKUP: "/vallles/quick-lookup",
  STATS: "/stats",
  PROFILE: "/profile",
  PROFILE_MODAL_CHANGE_PASSWORD: "/profile/change-password",
  SETTINGS: "/settings",
  SETTINGS_COMPANY: "/settings/company",
  SETTINGS_USERS: "/settings/users",
  SETTINGS_USERS_MODAL_CREATE: "/settings/users/create",
  SETTINGS_USERS_MODAL_EDIT: "/settings/users/:id/edit",

  // Admin (super_admin only)
  ADMIN_COMPANIES: "/admin/companies",
  ADMIN_COMPANIES_MODAL_CREATE: "/admin/companies/create",
  ADMIN_COMPANIES_MODAL_VIEW: "/admin/companies/:id",
  ADMIN_COMPANIES_MODAL_EDIT: "/admin/companies/:id/edit",
  ADMIN_USERS: "/admin/users",
  ADMIN_USERS_MODAL_CREATE: "/admin/users/create",
  ADMIN_USERS_MODAL_VIEW: "/admin/users/:id",
  ADMIN_USERS_MODAL_EDIT: "/admin/users/:id/edit",
  ADMIN_COMMISSIONS: "/admin/commissions",
  ADMIN_COMMISSIONS_MODAL_DETAIL: "/admin/commissions/:storeId",
  ADMIN_COMMISSIONS_MODAL_MONTH: "/admin/commissions/:storeId/:yearMonth",
};

/**
 * Builds a full vallle create path for navigation.
 * @returns {string} '/vallles/create'
 */
export const vallleCreatePath = () => "/vallles/create";

/**
 * Builds a full vallle view path for navigation.
 * @param {string} id - Vallle ID
 * @returns {string} e.g. '/vallles/abc123'
 */
export const valllePath = (id) => `/vallles/${id}`;

/**
 * Builds a full vallle edit path for navigation.
 * @param {string} id - Vallle ID
 * @returns {string} e.g. '/vallles/abc123/edit'
 */
export const vallleEditPath = (id) => `/vallles/${id}/edit`;

/**
 * Builds a full vallle redeem path for navigation.
 * @param {string} id - Vallle ID
 * @returns {string} e.g. '/vallles/abc123/redeem'
 */
export const vallleRedeemPath = (id) => `/vallles/${id}/redeem`;

/**
 * Builds a full admin company view path for navigation.
 * @param {string} id - Store/company ID
 * @returns {string}
 */
export const adminCompanyPath = (id) => `/admin/companies/${id}`;

/**
 * Builds a full admin company edit path for navigation.
 * @param {string} id - Store/company ID
 * @returns {string}
 */
export const adminCompanyEditPath = (id) => `/admin/companies/${id}/edit`;

/**
 * Builds a full admin user view path for navigation.
 * @param {string} id - User ID
 * @returns {string}
 */
export const adminUserPath = (id) => `/admin/users/${id}`;

/**
 * Builds a full admin user edit path for navigation.
 * @param {string} id - User ID
 * @returns {string}
 */
export const adminUserEditPath = (id) => `/admin/users/${id}/edit`;

/**
 * Builds a full admin commissions detail path for navigation.
 * @param {string} storeId - Store ID
 * @returns {string}
 */
export const adminCommissionsDetailPath = (storeId) =>
  `/admin/commissions/${storeId}`;

/**
 * Builds a full admin commissions month breakdown path for navigation.
 * @param {string} storeId - Store ID
 * @param {string} yearMonth - Month in YYYY-MM format
 * @returns {string}
 */
export const adminCommissionsMonthPath = (storeId, yearMonth) =>
  `/admin/commissions/${storeId}/${yearMonth}`;

/**
 * Builds a full settings user create path for navigation.
 * @returns {string} '/settings/users/create'
 */
export const settingsUserCreatePath = () => "/settings/users/create";

/**
 * Builds a full settings user edit path for navigation.
 * @param {string} id - User ID
 * @returns {string} e.g. '/settings/users/abc123/edit'
 */
export const settingsUserEditPath = (id) => `/settings/users/${id}/edit`;
