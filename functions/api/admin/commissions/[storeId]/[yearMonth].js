import { getAuthUser } from '../../../auth/_helpers.js'

/**
 * PATCH /api/admin/commissions/:storeId/:yearMonth
 * Mark all unpaid commissions for a store in a given month as paid (super_admin only).
 * yearMonth format: YYYY-MM (e.g. "2026-03")
 * @param {Object} context - Cloudflare Pages Function context
 * @returns {Promise<Response>}
 */
export async function onRequestPatch(context) {
  const { request, env, params } = context
  const { storeId, yearMonth } = params

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

  if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
    return Response.json(
      { error: { message: 'Invalid year-month format. Expected YYYY-MM.', code: 'VALIDATION_FAILED' } },
      { status: 400 },
    )
  }

  try {
    const store = await env.DB.prepare(
      'SELECT id FROM stores WHERE id = ?',
    ).bind(storeId).first()

    if (!store) {
      return Response.json(
        { error: { message: 'Store not found', code: 'STORE_NOT_FOUND' } },
        { status: 404 },
      )
    }

    const paidAt = new Date().toISOString()

    const result = await env.DB.prepare(
      `UPDATE commissions
       SET paid_at = ?
       WHERE store_id = ?
         AND strftime('%Y-%m', created_at) = ?
         AND paid_at IS NULL`,
    ).bind(paidAt, storeId, yearMonth).run()

    return Response.json({ data: { updated: result.meta?.changes ?? 0, paid_at: paidAt } })
  } catch (error) {
    const err = new Error('Admin: Failed to mark month as paid')
    err.code = 'DB_WRITE_FAILED'
    err.cause = error
    throw err
  }
}
