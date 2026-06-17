/**
 * Shared helpers for list endpoints with server-side pagination, search,
 * and sorting. All list GETs accept the same query params:
 * `limit`, `offset`, `search`, `sort`, `order` (+ endpoint-specific filters)
 * and return `{ data, meta: { total, limit, offset } }`.
 */

/**
 * Parses the standard list query params from a request URL.
 * Sort columns are matched against an allowlist because column names cannot
 * be parameterised in SQL.
 * @param {URL} url - The request URL
 * @param {Object} options
 * @param {Set<string>} options.sortableColumns - Allowed sort column names
 * @param {string} options.defaultSort - Sort column when none/invalid is given
 * @param {string} [options.defaultOrder='DESC'] - Order when none is given
 * @returns {{ limit: number, offset: number, search: string, sort: string, order: string }}
 */
export function parseListQuery(
  url,
  { sortableColumns, defaultSort, defaultOrder = "DESC" },
) {
  const { limit, offset } = parsePagination(url);
  const search = (url.searchParams.get("search") || "").trim();

  const sortParam = url.searchParams.get("sort");
  const sort = sortableColumns.has(sortParam) ? sortParam : defaultSort;

  const orderParam = url.searchParams.get("order");
  let order = defaultOrder;
  if (orderParam === "asc") order = "ASC";
  if (orderParam === "desc") order = "DESC";

  return { limit, offset, search, sort, order };
}

/**
 * Parses just `limit` (1–200, default 50) and `offset` (>= 0) from a request
 * URL. For list endpoints that paginate but don't search or sort.
 * @param {URL} url - The request URL
 * @returns {{ limit: number, offset: number }}
 */
export function parsePagination(url) {
  const limit = Math.min(
    Math.max(Number.parseInt(url.searchParams.get("limit"), 10) || 50, 1),
    200,
  );
  const offset = Math.max(
    Number.parseInt(url.searchParams.get("offset"), 10) || 0,
    0,
  );
  return { limit, offset };
}

/**
 * Builds a LIKE pattern for a search term, escaping LIKE wildcards.
 * Use with `LIKE ? ESCAPE '\'` clauses.
 * @param {string} search - Raw search input
 * @returns {string}
 */
export function buildLikePattern(search) {
  return `%${search.replaceAll(/[\\%_]/g, (c) => `\\${c}`)}%`;
}
