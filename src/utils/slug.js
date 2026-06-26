/**
 * Builds a URL-safe slug from arbitrary text. Strips diacritics (so accented
 * letters map to their base form — "parágrafo" → "paragrafo", not "par-grafo"),
 * lowercases, collapses any run of non-alphanumerics into a single dash, and
 * trims leading/trailing dashes. Mirrors the server copy in
 * `functions/api/_store.js` so the previewed slug matches what gets stored.
 * @param {string} value - Raw text (e.g. a company name)
 * @returns {string}
 */
export const slugify = (value) =>
  (value ?? "")
    .toString()
    .normalize("NFD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
