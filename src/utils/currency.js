/**
 * Formats an integer amount in cents to a Euro display string.
 * @param {number} cents - Amount in cents (e.g. 5000)
 * @returns {string} Formatted string (e.g. '€50.00')
 */
export const formatCurrency = (cents) => `${(cents / 100).toFixed(2)}€`
