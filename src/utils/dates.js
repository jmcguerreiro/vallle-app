/**
 * Formats an ISO 8601 date string for display.
 * @param {string} isoString - ISO date string
 * @param {string} [locale='pt-PT'] - Locale for formatting
 * @returns {string} Localised date string
 */
export const formatDate = (isoString, locale = 'pt-PT') =>
  new Date(isoString).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

/**
 * Formats an ISO 8601 date string for display with time (HH:MM).
 * @param {string} isoString - ISO date string
 * @param {string} [locale='pt-PT'] - Locale for formatting
 * @returns {string} Localised date + time string
 */
export const formatDateTime = (isoString, locale = 'pt-PT') =>
  new Date(isoString).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

