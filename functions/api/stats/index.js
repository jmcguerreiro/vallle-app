import { requireAuth } from "../auth/_helpers.js";
import { requireStore } from "../_store.js";

/**
 * Builds an array of { month, count } for every month of the given year,
 * filling in months with no data as count: 0.
 * @param {Array<{ month: string, count: number }>} rows - Query results
 * @param {string} year - Four-digit year (e.g. "2026")
 * @returns {Array<{ month: string, count: number }>}
 */
function fillChartData(rows, year) {
  const countMap = new Map(rows.map((r) => [r.month, r.count]));

  return Array.from({ length: 12 }, (_, i) => {
    const month = `${year}-${String(i + 1).padStart(2, "0")}`;
    return { month, count: countMap.get(month) || 0 };
  });
}

/**
 * GET /api/stats — Get store dashboard statistics.
 * @param {Object} context - Cloudflare Pages Function context
 * @returns {Promise<Response>}
 */
export async function onRequestGet(context) {
  const { request, env } = context;

  // Auth
  const auth = await requireAuth(request, env.JWT_SECRET);
  if (auth instanceof Response) return auth;
  const { user } = auth;

  // Store
  const storeResult = await requireStore(request, env, user.sub);
  if (storeResult instanceof Response) return storeResult;
  const { storeId } = storeResult;

  const url = new URL(request.url);
  const year =
    url.searchParams.get("year") || new Date().getFullYear().toString();

  try {
    // Run all stat queries in a batch for efficiency
    const [summaryResult, redeemedResult, chartResult] = await env.DB.batch([
      env.DB.prepare(
        `SELECT
           COUNT(*) as totalVallles,
           SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as activeVallles,
           COALESCE(SUM(amount), 0) as totalAmount
         FROM vallles
         WHERE store_id = ?`,
      ).bind(storeId),
      env.DB.prepare(
        `SELECT COALESCE(SUM(amount), 0) as totalRedeemed
         FROM redemptions
         WHERE store_id = ?`,
      ).bind(storeId),
      env.DB.prepare(
        `SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
         FROM vallles
         WHERE store_id = ? AND strftime('%Y', created_at) = ?
         GROUP BY month
         ORDER BY month`,
      ).bind(storeId, year),
    ]);

    const summary = {
      ...summaryResult.results[0],
      ...redeemedResult.results[0],
    };
    const chartData = fillChartData(chartResult.results, year);

    return Response.json({
      data: {
        totalVallles: summary.totalVallles || 0,
        activeVallles: summary.activeVallles || 0,
        totalAmount: summary.totalAmount || 0,
        totalRedeemed: summary.totalRedeemed || 0,
        chartData,
      },
    });
  } catch (error) {
    const err = new Error("Stats: Failed to load store statistics");
    err.code = "DB_READ_FAILED";
    err.cause = error;
    throw err;
  }
}
