/**
 * Supported UI locales. Mirrored on the API in `functions/api/_locales.js` —
 * the Vite app and Pages Functions bundle as separate runtimes, so each side
 * owns its copy.
 */

export const SUPPORTED_LOCALES = new Set(["pt", "en"]);
export const DEFAULT_LOCALE = "pt";

/**
 * Locale choices for `<select>` inputs. Labels are endonyms (each language in
 * its own name), so they are intentionally not run through i18n.
 */
export const LOCALE_OPTIONS = [
  { value: "pt", label: "Português" },
  { value: "en", label: "English" },
];
