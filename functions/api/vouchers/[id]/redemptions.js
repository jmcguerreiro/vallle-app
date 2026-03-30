import { getAuthUser } from '../../auth/_helpers.js'
import { requireStore } from '../../_store.js'

/**
 * GET /api/vouchers/:id/redemptions — List redemptions for a voucher.
 * @param {Object} context - Cloudflare Pages Function context
 * @returns {Promise<Response>}
 */
export async function onRequestGet(context) {
  const { request, env, params } = context
  const { id } = params

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
    // Verify voucher belongs to store
    const voucher = await env.DB.prepare(
      'SELECT id FROM vouchers WHERE id = ? AND store_id = ?',
    ).bind(id, storeId).first()

    if (!voucher) {
      return Response.json(
        { error: { message: 'Voucher not found', code: 'VOUCHER_NOT_FOUND' } },
        { status: 404 },
      )
    }

    const url = new URL(request.url)
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit'), 10) || 50, 1), 200)
    const offset = Math.max(parseInt(url.searchParams.get('offset'), 10) || 0, 0)

    const [countResult, dataResult] = await env.DB.batch([
      env.DB.prepare(
        'SELECT COUNT(*) as total FROM redemptions WHERE voucher_id = ? AND store_id = ?',
      ).bind(id, storeId),
      env.DB.prepare(
        `SELECT r.*, u.name AS redeemed_by_name
         FROM redemptions r
         LEFT JOIN users u ON u.id = r.redeemed_by
         WHERE r.voucher_id = ? AND r.store_id = ?
         ORDER BY r.created_at DESC
         LIMIT ? OFFSET ?`,
      ).bind(id, storeId, limit, offset),
    ])

    const total = countResult.results[0].total

    return Response.json({ data: dataResult.results, meta: { total, limit, offset } })
  } catch (error) {
    const err = new Error('Vouchers: Failed to list redemptions')
    err.code = 'DB_READ_FAILED'
    err.cause = error
    throw err
  }
}
