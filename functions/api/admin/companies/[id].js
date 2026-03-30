import { getAuthUser } from '../../auth/_helpers.js'

const STORE_SELECT = `SELECT id, name, slug, category, email, vat_id, phone, address1, address2, city, postal_code, region, country, status, created_at FROM stores WHERE id = ?`

const EDITABLE_FIELDS = [
  'name', 'category', 'email', 'vat_id', 'phone',
  'address1', 'address2', 'city', 'postal_code', 'region', 'country', 'status',
]

/**
 * GET /api/admin/companies/:id — Get a single store with stats (super_admin only).
 * @param {Object} context - Cloudflare Pages Function context
 * @returns {Promise<Response>}
 */
export async function onRequestGet(context) {
  const { request, env, params } = context
  const { id } = params

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
    const store = await env.DB.prepare(STORE_SELECT).bind(id).first()

    if (!store) {
      return Response.json(
        { error: { message: 'Company not found', code: 'COMPANY_NOT_FOUND' } },
        { status: 404 },
      )
    }

    const [voucherStats, commissionStats] = await env.DB.batch([
      env.DB.prepare(
        `SELECT COUNT(*) AS voucher_count,
                COALESCE(SUM(amount), 0) AS total_voucher_amount
         FROM vouchers WHERE store_id = ?`,
      ).bind(id),
      env.DB.prepare(
        `SELECT COALESCE(SUM(amount), 0) AS total_commission,
                COALESCE(SUM(CASE WHEN paid_at IS NULL THEN amount ELSE 0 END), 0) AS unpaid_commission
         FROM commissions WHERE store_id = ?`,
      ).bind(id),
    ])

    const stats = {
      ...voucherStats.results[0],
      ...commissionStats.results[0],
    }

    const { results: users } = await env.DB.prepare(
      `SELECT u.id, u.name, u.email, u.role, u.status
       FROM users u
       JOIN store_users su ON su.user_id = u.id
       WHERE su.store_id = ?`,
    ).bind(id).all()

    return Response.json({ data: { store, stats, users } })
  } catch (error) {
    const err = new Error('Admin: Failed to get company')
    err.code = 'DB_READ_FAILED'
    err.cause = error
    throw err
  }
}

/**
 * PUT /api/admin/companies/:id — Update a store (super_admin only).
 * @param {Object} context - Cloudflare Pages Function context
 * @returns {Promise<Response>}
 */
export async function onRequestPut(context) {
  const { request, env, params } = context
  const { id } = params

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

  let body
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { error: { message: 'Invalid request body', code: 'VALIDATION_FAILED' } },
      { status: 400 },
    )
  }

  if (!body.name || !body.name.trim()) {
    return Response.json(
      { error: { message: 'Company name is required', code: 'VALIDATION_FAILED' } },
      { status: 400 },
    )
  }

  try {
    const existing = await env.DB.prepare('SELECT id FROM stores WHERE id = ?').bind(id).first()
    if (!existing) {
      return Response.json(
        { error: { message: 'Company not found', code: 'COMPANY_NOT_FOUND' } },
        { status: 404 },
      )
    }

    // Whitelist valid status values
    const VALID_STATUSES = ['active', 'suspended', 'inactive']
    if (body.status && !VALID_STATUSES.includes(body.status)) {
      body.status = 'active'
    }

    const sets = EDITABLE_FIELDS.map((f) => `${f} = ?`).join(', ')
    const values = EDITABLE_FIELDS.map((f) => (body[f] ?? '').toString().trim())
    const now = new Date().toISOString()

    await env.DB.prepare(
      `UPDATE stores SET ${sets}, updated_at = ? WHERE id = ?`,
    ).bind(...values, now, id).run()

    const store = await env.DB.prepare(STORE_SELECT).bind(id).first()

    return Response.json({ data: { store } })
  } catch (error) {
    const err = new Error('Admin: Failed to update company')
    err.code = 'DB_WRITE_FAILED'
    err.cause = error
    throw err
  }
}
