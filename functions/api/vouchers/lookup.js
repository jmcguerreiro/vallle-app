import { getAuthUser } from '../auth/_helpers.js'
import { requireStore } from '../_store.js'

/**
 * GET /api/vouchers/lookup?code=XXX — Look up a voucher by its code.
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

  // Query param
  const url = new URL(request.url)
  const code = url.searchParams.get('code')?.trim()

  if (!code) {
    return Response.json(
      { error: { message: 'Code query parameter is required', code: 'VALIDATION_FAILED' } },
      { status: 400 },
    )
  }

  try {
    const voucher = await env.DB.prepare(
      'SELECT * FROM vouchers WHERE code = ? AND store_id = ?',
    ).bind(code.toUpperCase(), storeId).first()

    if (!voucher) {
      return Response.json(
        { error: { message: 'Voucher not found', code: 'VOUCHER_NOT_FOUND' } },
        { status: 404 },
      )
    }

    return Response.json({ data: voucher })
  } catch (error) {
    const err = new Error('Vouchers: Failed to look up voucher by code')
    err.code = 'DB_READ_FAILED'
    err.cause = error
    throw err
  }
}
