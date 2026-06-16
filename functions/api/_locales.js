/**
 * Supported content/UI locales, shared across API handlers for validation.
 * Mirrored on the frontend in `src/constants/locales.js` — the Vite app and
 * Pages Functions bundle as separate runtimes, so each side owns its copy.
 */

export const SUPPORTED_LOCALES = new Set(["pt", "en"]);
export const DEFAULT_LOCALE = "pt";

/**
 * Normalises an arbitrary value to a supported locale, falling back to the default.
 * @param {string} [locale]
 * @returns {string} A supported locale code
 */
export const normaliseLocale = (locale) =>
  SUPPORTED_LOCALES.has(locale) ? locale : DEFAULT_LOCALE;
