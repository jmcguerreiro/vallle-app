import { getAuthUser } from '../auth/_helpers.js'
import { getStoreStatus, requireStore } from '../_store.js'
import { generateUlid } from '../_ulid.js'

/**
 * Characters used for voucher code generation.
 * Excludes confusing characters: O, 0, I, 1, L.
 */
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

/**
 * Generates a 9-character voucher code in groups of 3, e.g. "XTU-TER-T61".
 * @returns {string}
 */
function generateVoucherCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(9))
  let code = ''
  for (let i = 0; i < 9; i++) {
    if (i > 0 && i % 3 === 0) code += '-'
    code += CODE_CHARS[bytes[i] % CODE_CHARS.length]
  }
  return code
}

/**
 * GET /api/vouchers — List vouchers for the active store.
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
    const url = new URL(request.url)
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit'), 10) || 50, 1), 200)
    const offset = Math.max(parseInt(url.searchParams.get('offset'), 10) || 0, 0)

    const [countResult, dataResult] = await env.DB.batch([
      env.DB.prepare('SELECT COUNT(*) as total FROM vouchers WHERE store_id = ?').bind(storeId),
      env.DB.prepare(
        'SELECT * FROM vouchers WHERE store_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      ).bind(storeId, limit, offset),
    ])

    const total = countResult.results[0].total

    return Response.json({ data: dataResult.results, meta: { total, limit, offset } })
  } catch (error) {
    const err = new Error('Vouchers: Failed to list vouchers')
    err.code = 'DB_READ_FAILED'
    err.cause = error
    throw err
  }
}

/**
 * POST /api/vouchers — Create a new voucher.
 * @param {Object} context - Cloudflare Pages Function context
 * @returns {Promise<Response>}
 */
export async function onRequestPost(context) {
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

  // Check store is not suspended or inactive
  const storeStatus = await getStoreStatus(env, storeId)
  if (storeStatus !== 'active') {
    return Response.json(
      { error: { message: 'Store is suspended. Voucher creation is disabled.', code: 'STORE_SUSPENDED' } },
      { status: 403 },
    )
  }

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

  const { amount, buyer, expires_at } = body

  // Validate amount (max €50,000 = 5_000_000 cents)
  if (!amount || typeof amount !== 'number' || !Number.isInteger(amount) || amount <= 0 || amount > 5_000_000) {
    return Response.json(
      { error: { message: 'Amount must be a positive integer (cents) up to 5000000', code: 'VALIDATION_FAILED' } },
      { status: 400 },
    )
  }

  // Validate buyer length
  if (buyer !== undefined && buyer !== null && (typeof buyer !== 'string' || buyer.length > 255)) {
    return Response.json(
      { error: { message: 'Buyer must be a string of 255 characters or fewer', code: 'VALIDATION_FAILED' } },
      { status: 400 },
    )
  }

  // Validate expires_at
  if (!expires_at) {
    return Response.json(
      { error: { message: 'Expiry date is required', code: 'VALIDATION_FAILED' } },
      { status: 400 },
    )
  }

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

  const now = new Date().toISOString()
  const voucherId = generateUlid()
  const code = generateVoucherCode()
  const commissionId = generateUlid()
  const commissionAmount = Math.min(250, Math.max(50, Math.round(amount * 0.05)))

  const voucher = {
    id: voucherId,
    store_id: storeId,
    created_by: user.sub,
    code,
    amount,
    balance: amount,
    buyer: buyer || null,
    status: 'active',
    created_at: now,
    expires_at: expiryDate.toISOString(),
    updated_at: now,
  }

  try {
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO vouchers (id, store_id, created_by, code, amount, balance, buyer, status, created_at, expires_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        voucher.id,
        voucher.store_id,
        voucher.created_by,
        voucher.code,
        voucher.amount,
        voucher.balance,
        voucher.buyer,
        voucher.status,
        voucher.created_at,
        voucher.expires_at,
        voucher.updated_at,
      ),
      env.DB.prepare(
        `INSERT INTO commissions (id, store_id, voucher_id, amount, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      ).bind(commissionId, storeId, voucherId, commissionAmount, now),
    ])

    return Response.json({ data: voucher }, { status: 201 })
  } catch (error) {
    const err = new Error('Vouchers: Failed to create voucher')
    err.code = 'DB_WRITE_FAILED'
    err.cause = error
    throw err
  }
}
