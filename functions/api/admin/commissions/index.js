import { getAuthUser } from '../../auth/_helpers.js'

/**
 * GET /api/admin/commissions — Commission summary per store (super_admin only).
 * Returns all stores with their total vallle earnings, total commissions,
 * total paid, and outstanding unpaid amount.
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

  try {
    const { results } = await env.DB.prepare(
      `SELECT s.id AS store_id,
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
       ORDER BY total_unpaid DESC, s.name`,
    ).all()

    return Response.json({ data: results })
  } catch (error) {
    const err = new Error('Admin: Failed to get commission overview')
    err.code = 'DB_READ_FAILED'
    err.cause = error
    throw err
  }
}
