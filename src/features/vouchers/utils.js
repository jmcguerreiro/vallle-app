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

/**
 * Formats a raw 9-character voucher code into the XXX-XXX-XXX display form.
 * @param {string} raw - Code without dashes
 * @returns {string}
 */
export function formatVoucherCode(raw) {
  return `${raw.slice(0, 3)}-${raw.slice(3, 6)}-${raw.slice(6, 9)}`
}
