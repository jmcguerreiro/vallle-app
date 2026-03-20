/**
 * Voucher-specific utility functions.
 */

/**
 * Checks whether a voucher is expired based on its expires_at field.
 * @param {string} expiresAt - ISO 8601 expiry date
 * @returns {boolean}
 */
export function isVoucherExpired(expiresAt) {
  return new Date(expiresAt) < new Date()
}
