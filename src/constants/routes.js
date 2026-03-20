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
  COMMISSIONS: '/commissions',
  STATS: '/stats',
  PROFILE: '/profile',
  PROFILE_MODAL_CHANGE_PASSWORD: '/profile/change-password',
  COMPANY: '/company',
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
