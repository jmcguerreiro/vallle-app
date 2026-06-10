import { buildLikePattern, parseListQuery } from '../_list.js'
import { getStoreStatus, requireStore } from '../_store.js'
import { generateUlid } from '../_ulid.js'
import { getAuthUser } from '../auth/_helpers.js'

/**
 * Characters used for vallle code generation.
 * Excludes confusing characters: O, 0, I, 1, L.
 */
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

/**
 * Generates a 9-character vallle code in groups of 3, e.g. "XTU-TER-T61".
 * @returns {string}
 */
function generateVallleCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(9))
  let code = ''
  for (let i = 0; i < 9; i++) {
    if (i > 0 && i % 3 === 0) code += '-'
    code += CODE_CHARS[bytes[i] % CODE_CHARS.length]
  }
  return code
}

/**
 * GET /api/vallles — List vallles for the active store.
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
    const { limit, offset, search, sort, order } = parseListQuery(url, {
      sortableColumns: new Set(['code', 'buyer', 'amount', 'balance', 'created_at', 'expires_at']),
      defaultSort: 'created_at',
    })
    const status = url.searchParams.get('status') || 'all'

    const where = ['store_id = ?']
    const params = [storeId]

    if (search) {
      const like = buildLikePattern(search)
      const clauses = [
        String.raw`code LIKE ? ESCAPE '\'`,
        String.raw`buyer LIKE ? ESCAPE '\'`,
      ]
      const searchParams = [like, like]

      // Numeric search — match amount/balance. Input is in euros (e.g. "50"
      // or "50.5"); DB stores cents. Match if the row's cent value, when
      // formatted as a 2-decimal euro string, contains the query.
      const numeric = search.replace(',', '.')
      if (/^\d+(\.\d{1,2})?$/.test(numeric)) {
        clauses.push(
          "printf('%.2f', amount / 100.0) LIKE ?",
          "printf('%.2f', balance / 100.0) LIKE ?",
        )
        searchParams.push(`%${numeric}%`, `%${numeric}%`)
      }

      where.push(`(${clauses.join(' OR ')})`)
      params.push(...searchParams)
    }

    const now = new Date().toISOString()
    switch (status) {
    case 'archived': {
      where.push("status = 'archived'")

    break;
    }
    case 'expired': {
      where.push("status = 'active' AND expires_at < ?")
      params.push(now)

    break;
    }
    case 'used': {
      where.push("status = 'active' AND balance = 0 AND expires_at >= ?")
      params.push(now)

    break;
    }
    case 'active': {
      where.push("status = 'active' AND balance > 0 AND expires_at >= ?")
      params.push(now)

    break;
    }
    // No default
    }

    const whereSql = where.join(' AND ')

    const [countResult, dataResult] = await env.DB.batch([
      env.DB.prepare(`SELECT COUNT(*) as total FROM vallles WHERE ${whereSql}`).bind(...params),
      env.DB.prepare(
        `SELECT * FROM vallles WHERE ${whereSql} ORDER BY ${sort} ${order} LIMIT ? OFFSET ?`,
      ).bind(...params, limit, offset),
    ])

    const total = countResult.results[0].total

    return Response.json({ data: dataResult.results, meta: { total, limit, offset } })
  } catch (error) {
    const err = new Error('Vallles: Failed to list vallles')
    err.code = 'DB_READ_FAILED'
    err.cause = error
    throw err
  }
}

/**
 * POST /api/vallles — Create a new vallle.
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
      { error: { message: 'Store is suspended. Vallle creation is disabled.', code: 'STORE_SUSPENDED' } },
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

  let { amount, buyer, expires_at } = body

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

  // If no expires_at provided, compute from the store's default expiry period
  if (!expires_at) {
    const store = await env.DB.prepare(
      'SELECT default_vallle_expiry_days FROM stores WHERE id = ?',
    ).bind(storeId).first()

    const days = store?.default_vallle_expiry_days || 365
    const defaultExpiry = new Date()
    defaultExpiry.setDate(defaultExpiry.getDate() + days)
    expires_at = defaultExpiry.toISOString()
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
  const vallleId = generateUlid()
  const code = generateVallleCode()
  const commissionId = generateUlid()
  const commissionAmount = Math.max(50, Math.round(amount * 0.05))

  const vallle = {
    id: vallleId,
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
        `INSERT INTO vallles (id, store_id, created_by, code, amount, balance, buyer, status, created_at, expires_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        vallle.id,
        vallle.store_id,
        vallle.created_by,
        vallle.code,
        vallle.amount,
        vallle.balance,
        vallle.buyer,
        vallle.status,
        vallle.created_at,
        vallle.expires_at,
        vallle.updated_at,
      ),
      env.DB.prepare(
        `INSERT INTO commissions (id, store_id, vallle_id, amount, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      ).bind(commissionId, storeId, vallleId, commissionAmount, now),
    ])

    return Response.json({ data: vallle }, { status: 201 })
  } catch (error) {
    const err = new Error('Vallles: Failed to create vallle')
    err.code = 'DB_WRITE_FAILED'
    err.cause = error
    throw err
  }
}
