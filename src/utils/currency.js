/**
 * Formats an integer amount in cents to a Euro display string.
 * @param {number} cents - Amount in cents (e.g. 5000)
 * @returns {string} Formatted string (e.g. '€50.00')
 */
export const formatCurrency = (cents) => `${(cents / 100).toFixed(2)}€`;

/**
 * Converts a Euro form-input value to an integer amount in cents.
 * @param {string|number} euros - Euro amount as entered (e.g. "12.50")
 * @returns {number} Amount in cents (e.g. 1250)
 */
export const eurosToCents = (euros) =>
  Math.round(Number.parseFloat(euros) * 100);

/**
 * Converts an integer amount in cents to a plain Euro string for form inputs
 * (no currency symbol — see formatCurrency for display).
 * @param {number} cents - Amount in cents (e.g. 1250)
 * @returns {string} Euro amount (e.g. '12.50')
 */
export const centsToEuros = (cents) => (cents / 100).toFixed(2);
