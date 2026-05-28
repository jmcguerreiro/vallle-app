import { getAuthUser } from '../auth/_helpers.js'
import { requireStore } from '../_store.js'

/**
 * Builds an array of { month, count } for the last 12 months,
 * filling in months with no data as count: 0.
 * @param {Array<{ month: string, count: number }>} rows - Query results
 * @returns {Array<{ month: string, count: number }>}
 */
function fillChartData(rows) {
  const now = new Date()
  const months = []

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    months.push(key)
  }

  const countMap = new Map(rows.map((r) => [r.month, r.count]))

  return months.map((month) => ({
    month,
    count: countMap.get(month) || 0,
  }))
}

/**
 * GET /api/stats — Get store dashboard statistics.
 * @param {Object} context - Cloudflare Pages Function context
 * @returns {Promise<Response>}
 */
export async function onRequestGet(context) {
  const { request, env } = context

  // Auth
  const user = await getAuthUser(request, env.JWT_SECRET)
  if (!user) {
    return Response.json(
      { error: { message: 'Unauthorized', code: 'AUTH_UNAUTHORIZED' } },
      { status: 401 },
    )
  }

  // Store
  const storeResult = await requireStore(request, env, user.sub)
  if (storeResult instanceof Response) return storeResult
  const { storeId } = storeResult

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
         WHERE store_id = ? AND created_at >= ?
         GROUP BY month
         ORDER BY month`,
      ).bind(
        storeId,
        new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1).toISOString(),
      ),
    ])

    const summary = { ...summaryResult.results[0], ...redeemedResult.results[0] }
    const chartData = fillChartData(chartResult.results)

    return Response.json({
      data: {
        totalVallles: summary.totalVallles || 0,
        activeVallles: summary.activeVallles || 0,
        totalAmount: summary.totalAmount || 0,
        totalRedeemed: summary.totalRedeemed || 0,
        chartData,
      },
    })
  } catch (error) {
    const err = new Error('Stats: Failed to load store statistics')
    err.code = 'DB_READ_FAILED'
    err.cause = error
    throw err
  }
}
