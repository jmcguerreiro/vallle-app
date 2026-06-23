/**
 * Vallle-specific utility functions.
 */

import { MIN_REDEMPTION_MODES } from "@/constants/redemption";
import { VALLLE_STATUSES } from "@/constants/vallle-statuses";
import { formatCurrency } from "@/utils/currency";

/**
 * Checks whether a vallle is expired based on its expires_at field.
 * @param {string} expiresAt - ISO 8601 expiry date
 * @returns {boolean}
 */
export function isVallleExpired(expiresAt) {
  return new Date(expiresAt) < new Date();
}

/**
 * Formats a raw 6-character vallle code for display as two groups of three,
 * e.g. "XTUT6Q" → "XTU-T6Q". The separator is purely presentational — codes
 * are stored and looked up raw, so don't use this for lookups.
 * @param {string} raw - Raw code without separator
 * @returns {string}
 */
export function formatVallleCode(raw) {
  if (!raw) return "";
  return `${raw.slice(0, 3)}-${raw.slice(3, 6)}`;
}

/**
 * Decides whether a redemption attempt should trigger the below-minimum warning.
 * The minimum is advisory: redeeming the entire remaining balance never warns
 * (covers "€5 left of a €20 purchase"), and the 'none' mode never warns.
 * @param {Object} args
 * @param {'none'|'full'|'custom'} args.mode - Vallle's minimum-redemption mode
 * @param {number} args.minCents - Custom minimum in cents (only used for 'custom')
 * @param {number} args.amountCents - Amount being redeemed, in cents
 * @param {number} args.balanceCents - Remaining balance, in cents
 * @returns {boolean}
 */
export function shouldWarnRedemption({
  mode,
  minCents,
  amountCents,
  balanceCents,
}) {
  // Redeeming everything that's left is always fine, whatever the policy.
  if (amountCents >= balanceCents) return false;
  if (mode === MIN_REDEMPTION_MODES.FULL) return true;
  if (mode === MIN_REDEMPTION_MODES.CUSTOM) return amountCents < minCents;
  return false;
}

/**
 * Formats a minimum-redemption policy value for display, e.g. "No minimum",
 * "Full value only", or "€10.00". Pairs with a "Minimum redemption" label, so
 * the custom case is just the amount (no "minimum of" prefix).
 * @param {'none'|'full'|'custom'} mode
 * @param {number} cents - Custom minimum in cents (only used for 'custom')
 * @param {Function} t - i18next translate function
 * @returns {string}
 */
export function formatMinRedemption(mode, cents, t) {
  if (mode === MIN_REDEMPTION_MODES.FULL)
    return t("features.vallles.minRedemption.full");
  if (mode === MIN_REDEMPTION_MODES.CUSTOM) return formatCurrency(cents);
  return t("features.vallles.minRedemption.none");
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
