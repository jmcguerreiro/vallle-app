import { getAuthUser } from '../../auth/_helpers.js'
import { requireStore } from '../../_store.js'
import { generateUlid } from '../../_ulid.js'

/**
 * POST /api/vouchers/:id/redeem — Redeem a voucher (partial or full).
 * Creates a redemption record, updates the voucher balance.
 * @param {Object} context - Cloudflare Pages Function context
 * @returns {Promise<Response>}
 */
export async function onRequestPost(context) {
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

  const { amount, description } = body

  // Validate amount (max €50,000 = 5_000_000 cents)
  if (!amount || typeof amount !== 'number' || !Number.isInteger(amount) || amount <= 0 || amount > 5_000_000) {
    return Response.json(
      { error: { message: 'Amount must be a positive integer (cents) up to 5000000', code: 'VALIDATION_FAILED' } },
      { status: 400 },
    )
  }

  // Validate description length
  if (description !== undefined && description !== null && (typeof description !== 'string' || description.length > 500)) {
    return Response.json(
      { error: { message: 'Description must be a string of 500 characters or fewer', code: 'VALIDATION_FAILED' } },
      { status: 400 },
    )
  }

  try {
    // Fetch voucher
    const voucher = await env.DB.prepare(
      'SELECT * FROM vouchers WHERE id = ? AND store_id = ?',
    ).bind(id, storeId).first()

    if (!voucher) {
      return Response.json(
        { error: { message: 'Voucher not found', code: 'VOUCHER_NOT_FOUND' } },
        { status: 404 },
      )
    }

    // Check status
    if (voucher.status !== 'active') {
      return Response.json(
        { error: { message: 'Voucher is not active', code: 'VOUCHER_INACTIVE' } },
        { status: 400 },
      )
    }

    // Check expiry
    if (new Date(voucher.expires_at) < new Date()) {
      return Response.json(
        { error: { message: 'This voucher has expired', code: 'VOUCHER_EXPIRED' } },
        { status: 400 },
      )
    }

    // Check balance
    if (amount > voucher.balance) {
      return Response.json(
        { error: { message: 'Insufficient balance', code: 'VOUCHER_INSUFFICIENT_BALANCE' } },
        { status: 400 },
      )
    }

    const now = new Date().toISOString()
    const redemptionId = generateUlid()

    // Atomically deduct balance — WHERE balance >= amount prevents double-spend.
    // A 0-row UPDATE is NOT a DB error (D1 won't rollback), so we must check
    // changes BEFORE inserting the redemption record.
    const updateResult = await env.DB.prepare(
      'UPDATE vouchers SET balance = balance - ?, updated_at = ? WHERE id = ? AND store_id = ? AND balance >= ?',
    ).bind(amount, now, id, storeId, amount).run()

    if (!updateResult.meta.changes) {
      return Response.json(
        { error: { message: 'Insufficient balance (concurrent redemption)', code: 'VOUCHER_INSUFFICIENT_BALANCE' } },
        { status: 409 },
      )
    }

    // Balance was deducted — read the actual new balance from the DB for accuracy
    const updated = await env.DB.prepare(
      'SELECT balance FROM vouchers WHERE id = ?',
    ).bind(id).first()
    const balanceAfter = updated.balance

    await env.DB.prepare(
      'INSERT INTO redemptions (id, store_id, voucher_id, redeemed_by, description, amount, balance_after, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ).bind(redemptionId, storeId, id, user.sub, description || null, amount, balanceAfter, now).run()

    return Response.json({
      data: {
        id: redemptionId,
        voucher_id: id,
        amount,
        balance_after: balanceAfter,
        description: description || null,
        created_at: now,
      },
    })
  } catch (error) {
    const err = new Error('Vouchers: Failed to redeem voucher')
    err.code = 'DB_WRITE_FAILED'
    err.cause = error
    throw err
  }
}
