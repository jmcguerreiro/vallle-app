/**
 * Vallle-specific utility functions.
 */

import { VALLLE_STATUSES } from "@/constants/vallle-statuses";

/**
 * Checks whether a vallle is expired based on its expires_at field.
 * @param {string} expiresAt - ISO 8601 expiry date
 * @returns {boolean}
 */
export function isVallleExpired(expiresAt) {
  return new Date(expiresAt) < new Date();
}

/**
 * Derives the display status for a vallle based on its data.
 * @param {Object} vallle
 * @returns {'active'|'used'|'expired'|'archived'}
 */
export function deriveVallleStatus(vallle) {
  if (vallle.status === VALLLE_STATUSES.ARCHIVED)
    return VALLLE_STATUSES.ARCHIVED;
  if (isVallleExpired(vallle.expires_at)) return VALLLE_STATUSES.EXPIRED;
  if (vallle.balance === 0) return VALLLE_STATUSES.USED;
  return VALLLE_STATUSES.ACTIVE;
}
