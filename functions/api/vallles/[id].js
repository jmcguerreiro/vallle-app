import { getAuthUser } from '../auth/_helpers.js'
import { requireStore } from '../_store.js'

/**
 * GET /api/vallles/:id — Get a single vallle by ID.
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
    const vallle = await env.DB.prepare(
      'SELECT * FROM vallles WHERE id = ? AND store_id = ?',
    ).bind(id, storeId).first()

    if (!vallle) {
      return Response.json(
        { error: { message: 'Vallle not found', code: 'VALLLE_NOT_FOUND' } },
        { status: 404 },
      )
    }

    return Response.json({ data: vallle })
  } catch (error) {
    const err = new Error('Vallles: Failed to read vallle')
    err.code = 'DB_READ_FAILED'
    err.cause = error
    throw err
  }
}

/**
 * PUT /api/vallles/:id — Update a vallle (buyer and expiry date only).
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

  const { buyer, expires_at, status } = body

  // Validate buyer length
  if (buyer !== undefined && buyer !== null && (typeof buyer !== 'string' || buyer.length > 255)) {
    return Response.json(
      { error: { message: 'Buyer must be a string of 255 characters or fewer', code: 'VALIDATION_FAILED' } },
      { status: 400 },
    )
  }

  // Validate status (only active/archived can be set manually)
  if (status !== undefined && status !== 'active' && status !== 'archived') {
    return Response.json(
      { error: { message: 'Status must be active or archived', code: 'VALIDATION_FAILED' } },
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
    // Check vallle exists and belongs to store
    const existing = await env.DB.prepare(
      'SELECT * FROM vallles WHERE id = ? AND store_id = ?',
    ).bind(id, storeId).first()

    if (!existing) {
      return Response.json(
        { error: { message: 'Vallle not found', code: 'VALLLE_NOT_FOUND' } },
        { status: 404 },
      )
    }

    const now = new Date().toISOString()
    const updatedBuyer = buyer !== undefined ? buyer : existing.buyer
    const updatedExpiresAt = expires_at ? new Date(expires_at).toISOString() : existing.expires_at
    // Only allow status transitions between active and archived; preserve 'used' otherwise.
    const updatedStatus = status !== undefined && existing.status !== 'used' ? status : existing.status

    await env.DB.prepare(
      'UPDATE vallles SET buyer = ?, expires_at = ?, status = ?, updated_at = ? WHERE id = ? AND store_id = ?',
    ).bind(updatedBuyer, updatedExpiresAt, updatedStatus, now, id, storeId).run()

    const vallle = {
      ...existing,
      buyer: updatedBuyer,
      expires_at: updatedExpiresAt,
      status: updatedStatus,
      updated_at: now,
    }

    return Response.json({ data: vallle })
  } catch (error) {
    const err = new Error('Vallles: Failed to update vallle')
    err.code = 'DB_WRITE_FAILED'
    err.cause = error
    throw err
  }
}
