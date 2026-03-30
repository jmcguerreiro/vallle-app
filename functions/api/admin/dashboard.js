import { getAuthUser } from '../auth/_helpers.js'

/**
 * GET /api/admin/dashboard — Platform-level stats for super admin.
 * Returns total store count, voucher count, and total commission revenue.
 * @param {Object} context - Cloudflare Pages Function context
 * @returns {Promise<Response>}
 */
export async function onRequestGet(context) {
  const { request, env } = context

  const user = await getAuthUser(request, env.JWT_SECRET)
  if (!user) {
    return Response.json(
      { error: { message: 'Unauthorized', code: 'AUTH_UNAUTHORIZED' } },
      { status: 401 },
    )
  }
  if (user.role !== 'super_admin') {
    return Response.json(
      { error: { message: 'Forbidden', code: 'AUTH_FORBIDDEN' } },
      { status: 403 },
    )
  }

  const url = new URL(request.url)
  const year = url.searchParams.get('year') || new Date().getFullYear().toString()

  try {
    const [storesRow, vouchersRow, commissionsRow, monthlyVouchers, monthlyCommissions] = await Promise.all([
      env.DB.prepare('SELECT COUNT(*) AS count FROM stores').first(),
      env.DB.prepare('SELECT COALESCE(SUM(amount), 0) AS total FROM vouchers').first(),
      env.DB.prepare('SELECT COALESCE(SUM(amount), 0) AS total FROM commissions').first(),
      env.DB.prepare(
        `SELECT strftime('%m', created_at) AS month, SUM(amount) AS amount
         FROM vouchers
         WHERE strftime('%Y', created_at) = ?
         GROUP BY strftime('%m', created_at)`,
      ).bind(year).all(),
      env.DB.prepare(
        `SELECT strftime('%m', created_at) AS month, SUM(amount) AS amount
         FROM commissions
         WHERE strftime('%Y', created_at) = ?
         GROUP BY strftime('%m', created_at)`,
      ).bind(year).all(),
    ])

    const vouchersByMonth = Object.fromEntries(
      (monthlyVouchers.results || []).map((r) => [r.month, r.amount]),
    )
    const commissionsByMonth = Object.fromEntries(
      (monthlyCommissions.results || []).map((r) => [r.month, r.amount]),
    )

    const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']
    const chartData = months.map((m) => ({
      month: `${year}-${m}`,
      voucher_amount: vouchersByMonth[m] || 0,
      commission_amount: commissionsByMonth[m] || 0,
    }))

    return Response.json({
      data: {
        storeCount: storesRow.count,
        totalVoucherAmount: vouchersRow.total,
        totalCommission: commissionsRow.total,
        chartData,
      },
    })
  } catch (error) {
    const err = new Error('Admin Dashboard: Failed to fetch stats')
    err.code = 'DB_READ_FAILED'
    err.cause = error
    throw err
  }
}
