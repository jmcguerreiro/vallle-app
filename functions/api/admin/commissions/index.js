import { buildLikePattern, parseListQuery } from "../../_list.js";

/**
 * GET /api/admin/commissions — Commission summary per store (super_admin only).
 * Returns stores with their total vallle earnings, total commissions,
 * total paid, and outstanding unpaid amount.
 * Server-side pagination, search (store name), sort, and payment filter
 * (`payment=unpaid|paid` on the outstanding balance).
 * @param {Object} context - Cloudflare Pages Function context
 * @returns {Promise<Response>}
 */
export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const url = new URL(request.url);
    const { limit, offset, search, sort, order } = parseListQuery(url, {
      sortableColumns: new Set([
        "store_name",
        "total_vallle_amount",
        "total_commission",
        "total_paid",
        "total_unpaid",
        "last_paid_at",
      ]),
      defaultSort: "total_unpaid",
    });
    const payment = url.searchParams.get("payment") || "all";

    const where = [];
    const params = [];

    if (search) {
      where.push(String.raw`store_name LIKE ? ESCAPE '\'`);
      params.push(buildLikePattern(search));
    }

    if (payment === "unpaid") where.push("total_unpaid > 0");
    if (payment === "paid") where.push("total_unpaid = 0");

    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

    // Aggregate per store first; search/filter/sort/pagination apply to the
    // summary so aggregate columns are sortable like any other.
    const summarySql = `
      WITH summary AS (
        SELECT s.id AS store_id,
               s.name AS store_name,
               COUNT(c.id) AS commission_count,
               COALESCE(SUM(v.amount), 0) AS total_vallle_amount,
               COALESCE(SUM(c.amount), 0) AS total_commission,
               COALESCE(SUM(CASE WHEN c.paid_at IS NOT NULL THEN c.amount ELSE 0 END), 0) AS total_paid,
               COALESCE(SUM(CASE WHEN c.paid_at IS NULL THEN c.amount ELSE 0 END), 0) AS total_unpaid,
               MAX(c.paid_at) AS last_paid_at
        FROM stores s
        LEFT JOIN commissions c ON c.store_id = s.id
        LEFT JOIN vallles v ON v.id = c.vallle_id
        GROUP BY s.id, s.name
      )`;

    const [countResult, dataResult] = await env.DB.batch([
      env.DB.prepare(
        `${summarySql} SELECT COUNT(*) AS total FROM summary ${whereSql}`,
      ).bind(...params),
      env.DB.prepare(
        `${summarySql} SELECT * FROM summary ${whereSql} ORDER BY ${sort} ${order}, store_name ASC LIMIT ? OFFSET ?`,
      ).bind(...params, limit, offset),
    ]);

    const total = countResult.results[0].total;

    return Response.json({
      data: dataResult.results,
      meta: { total, limit, offset },
    });
  } catch (error) {
    const err = new Error("Admin: Failed to get commission overview");
    err.code = "DB_READ_FAILED";
    err.cause = error;
    throw err;
  }
}
