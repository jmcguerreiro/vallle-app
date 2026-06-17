/**
 * Shared request-body validators for vallle endpoints. Each returns a 400
 * `Response` describing the problem, or `null` when the value is valid — call
 * sites short-circuit with `if (error) return error`.
 */

const MAX_AMOUNT_CENTS = 5_000_000; // €50,000
const MAX_EXPIRY_YEARS = 5;

function validationError(message) {
  return Response.json(
    { error: { message, code: "VALIDATION_FAILED" } },
    { status: 400 },
  );
}

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
