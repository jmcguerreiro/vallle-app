/**
 * Shared request-body validators for vallle endpoints. Each returns a 400
 * `Response` describing the problem, or `null` when the value is valid — call
 * sites short-circuit with `if (error) return error`.
 */

const MAX_AMOUNT_CENTS = 5_000_000; // €50,000
const MAX_EXPIRY_YEARS = 5;

import { validationError } from "../_validation.js";

const MIN_REDEMPTION_MODES = new Set(["none", "full", "custom"]);

/**
 * Amount must be a positive integer number of cents, up to €50,000.
 * @param {unknown} amount
 * @returns {Response|null}
 */
export function validateAmount(amount) {
  if (
    !amount ||
    typeof amount !== "number" ||
    !Number.isInteger(amount) ||
    amount <= 0 ||
    amount > MAX_AMOUNT_CENTS
  ) {
    return validationError(
      "Amount must be a positive integer (cents) up to 5000000",
    );
  }
  return null;
}

/**
 * Buyer is optional; when present it must be a string of 255 chars or fewer.
 * @param {unknown} buyer
 * @returns {Response|null}
 */
export function validateBuyer(buyer) {
  if (
    buyer !== undefined &&
    buyer !== null &&
    (typeof buyer !== "string" || buyer.length > 255)
  ) {
    return validationError("Buyer must be a string of 255 characters or fewer");
  }
  return null;
}

/**
 * Expiry must be a valid date in the future, at most 5 years out.
 * @param {string} expires_at - ISO 8601 date string
 * @returns {Response|null}
 */
export function validateExpiry(expires_at) {
  const expiryDate = new Date(expires_at);
  const maxExpiry = new Date();
  maxExpiry.setFullYear(maxExpiry.getFullYear() + MAX_EXPIRY_YEARS);

  if (Number.isNaN(expiryDate.getTime()) || expiryDate <= new Date()) {
    return validationError("Expiry date must be a valid future date");
  }
  if (expiryDate > maxExpiry) {
    return validationError("Expiry date cannot exceed 5 years from now");
  }
  return null;
}

/**
 * Minimum redemption policy. `mode` must be one of none/full/custom. The cents
 * value is only meaningful for 'custom', where it must be a positive integer up
 * to €50,000; for the other modes it must be absent or 0. Shared by the vallle
 * endpoints and the store-default validator in `_store.js`.
 * @param {unknown} mode
 * @param {unknown} cents
 * @returns {Response|null}
 */
export function validateMinRedemption(mode, cents) {
  if (mode === undefined) return null;

  if (typeof mode !== "string" || !MIN_REDEMPTION_MODES.has(mode)) {
    return validationError(
      "Minimum redemption mode must be none, full or custom",
    );
  }

  if (mode === "custom") {
    if (
      typeof cents !== "number" ||
      !Number.isInteger(cents) ||
      cents <= 0 ||
      cents > MAX_AMOUNT_CENTS
    ) {
      return validationError(
        "Custom minimum must be a positive integer (cents) up to 5000000",
      );
    }
  } else if (cents !== undefined && cents !== null && cents !== 0) {
    return validationError(
      "Minimum redemption amount is only allowed when mode is custom",
    );
  }

  return null;
}
