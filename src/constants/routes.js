/**
 * Client-side route path constants for the Vallle app.
 * Use these instead of hardcoded strings in <Route>, <NavLink>, navigate(), and <Navigate>.
 *
 * Modal route paths (VOUCHERS_MODAL_*) are full paths used in the top-level
 * modal <Routes> block — they must match the URL that navigation produces.
 * Use voucherPath(id) / voucherEditPath(id) helpers for <Link> navigation.
 */
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  SELECT_STORE: '/select-store',
  VOUCHERS: '/vouchers',
  VOUCHERS_MODAL_CREATE: '/vouchers/create',
  VOUCHERS_MODAL_VIEW: '/vouchers/:id',
  VOUCHERS_MODAL_EDIT: '/vouchers/:id/edit',
  VOUCHERS_MODAL_REDEEM: '/vouchers/:id/redeem',
  VOUCHERS_MODAL_QUICK_REDEEM: '/vouchers/quick-redeem',
  VOUCHERS_MODAL_QUICK_LOOKUP: '/vouchers/quick-lookup',
  STATS: '/stats',
  PROFILE: '/profile',
  PROFILE_MODAL_CHANGE_PASSWORD: '/profile/change-password',
  COMPANY: '/company',

  // Admin (super_admin only)
  ADMIN_COMPANIES: '/admin/companies',
  ADMIN_COMPANIES_MODAL_CREATE: '/admin/companies/create',
  ADMIN_COMPANIES_MODAL_VIEW: '/admin/companies/:id',
  ADMIN_COMPANIES_MODAL_EDIT: '/admin/companies/:id/edit',
  ADMIN_USERS: '/admin/users',
  ADMIN_USERS_MODAL_CREATE: '/admin/users/create',
  ADMIN_USERS_MODAL_VIEW: '/admin/users/:id',
  ADMIN_USERS_MODAL_EDIT: '/admin/users/:id/edit',
  ADMIN_COMMISSIONS: '/admin/commissions',
  ADMIN_COMMISSIONS_MODAL_DETAIL: '/admin/commissions/:storeId',
}

/**
 * Builds a full voucher create path for navigation.
 * @returns {string} '/vouchers/create'
 */
export const voucherCreatePath = () => '/vouchers/create'

/**
 * Builds a full voucher view path for navigation.
 * @param {string} id - Voucher ID
 * @returns {string} e.g. '/vouchers/abc123'
 */
export const voucherPath = (id) => `/vouchers/${id}`

/**
 * Builds a full voucher edit path for navigation.
 * @param {string} id - Voucher ID
 * @returns {string} e.g. '/vouchers/abc123/edit'
 */
export const voucherEditPath = (id) => `/vouchers/${id}/edit`

/**
 * Builds a full voucher redeem path for navigation.
 * @param {string} id - Voucher ID
 * @returns {string} e.g. '/vouchers/abc123/redeem'
 */
export const voucherRedeemPath = (id) => `/vouchers/${id}/redeem`

/**
 * Builds a full admin company view path for navigation.
 * @param {string} id - Store/company ID
 * @returns {string}
 */
export const adminCompanyPath = (id) => `/admin/companies/${id}`

/**
 * Builds a full admin company edit path for navigation.
 * @param {string} id - Store/company ID
 * @returns {string}
 */
export const adminCompanyEditPath = (id) => `/admin/companies/${id}/edit`

/**
 * Builds a full admin user view path for navigation.
 * @param {string} id - User ID
 * @returns {string}
 */
export const adminUserPath = (id) => `/admin/users/${id}`

/**
 * Builds a full admin user edit path for navigation.
 * @param {string} id - User ID
 * @returns {string}
 */
export const adminUserEditPath = (id) => `/admin/users/${id}/edit`

/**
 * Builds a full admin commissions detail path for navigation.
 * @param {string} storeId - Store ID
 * @returns {string}
 */
export const adminCommissionsDetailPath = (storeId) => `/admin/commissions/${storeId}`
