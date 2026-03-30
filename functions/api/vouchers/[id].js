import { getAuthUser } from '../auth/_helpers.js'
import { requireStore } from '../_store.js'

/**
 * GET /api/vouchers/:id — Get a single voucher by ID.
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
    const voucher = await env.DB.prepare(
      'SELECT * FROM vouchers WHERE id = ? AND store_id = ?',
    ).bind(id, storeId).first()

    if (!voucher) {
      return Response.json(
        { error: { message: 'Voucher not found', code: 'VOUCHER_NOT_FOUND' } },
        { status: 404 },
      )
    }

    return Response.json({ data: voucher })
  } catch (error) {
    const err = new Error('Vouchers: Failed to read voucher')
    err.code = 'DB_READ_FAILED'
    err.cause = error
    throw err
  }
}

/**
 * PUT /api/vouchers/:id — Update a voucher (buyer and expiry date only).
 * @param {Object} context - Cloudflare Pages Function context
 * @returns {Promise<Response>}
 */
export async function onRequestPut(context) {
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

  // Body
  let body
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { error: { message: 'Invalid JSON body', code: 'VALIDATION_FAILED' } },
      { status: 400 },
    )
  }

  const { buyer, expires_at } = body

  // Validate buyer length
  if (buyer !== undefined && buyer !== null && (typeof buyer !== 'string' || buyer.length > 255)) {
    return Response.json(
      { error: { message: 'Buyer must be a string of 255 characters or fewer', code: 'VALIDATION_FAILED' } },
      { status: 400 },
    )
  }

  // Validate expires_at if provided (max 5 years from now)
  if (expires_at) {
    const expiryDate = new Date(expires_at)
    const maxExpiry = new Date()
    maxExpiry.setFullYear(maxExpiry.getFullYear() + 5)

    if (Number.isNaN(expiryDate.getTime()) || expiryDate <= new Date()) {
      return Response.json(
        { error: { message: 'Expiry date must be a valid future date', code: 'VALIDATION_FAILED' } },
        { status: 400 },
      )
    }

    if (expiryDate > maxExpiry) {
      return Response.json(
        { error: { message: 'Expiry date cannot exceed 5 years from now', code: 'VALIDATION_FAILED' } },
        { status: 400 },
      )
    }
  }

  try {
    // Check voucher exists and belongs to store
    const existing = await env.DB.prepare(
      'SELECT * FROM vouchers WHERE id = ? AND store_id = ?',
    ).bind(id, storeId).first()

    if (!existing) {
      return Response.json(
        { error: { message: 'Voucher not found', code: 'VOUCHER_NOT_FOUND' } },
        { status: 404 },
      )
    }

    const now = new Date().toISOString()
    const updatedBuyer = buyer !== undefined ? buyer : existing.buyer
    const updatedExpiresAt = expires_at ? new Date(expires_at).toISOString() : existing.expires_at

    await env.DB.prepare(
      'UPDATE vouchers SET buyer = ?, expires_at = ?, updated_at = ? WHERE id = ? AND store_id = ?',
    ).bind(updatedBuyer, updatedExpiresAt, now, id, storeId).run()

    const voucher = {
      ...existing,
      buyer: updatedBuyer,
      expires_at: updatedExpiresAt,
      updated_at: now,
    }

    return Response.json({ data: voucher })
  } catch (error) {
    const err = new Error('Vouchers: Failed to update voucher')
    err.code = 'DB_WRITE_FAILED'
    err.cause = error
    throw err
  }
}
