/**
 * Shared date helpers for Pages Functions.
 */

/**
 * Normalises a date field from a request body: empty/null → `null`; a
 * date-only string from a form (`YYYY-MM-DD`) → a full ISO timestamp;
 * anything else is passed through.
 * @param {unknown} value
 * @returns {string|null}
 */
export function normalizeDateInput(value) {
  if (value === "" || value === null || value === undefined) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T00:00:00Z`;
  return value;
}
