import { buildLikePattern, parseListQuery } from '../../_list.js'
import { generateUlid } from '../../_ulid.js'
import { getAuthUser } from '../../auth/_helpers.js'

const STORE_FIELDS = [
  'name', 'category', 'email', 'vat_id', 'phone',
  'address1', 'address2', 'city', 'postal_code', 'region', 'country',
]

/**
 * GET /api/admin/companies — List all stores with vallle stats (super_admin only).
 * Server-side pagination, search (name), sort, and status/category filters.
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
    const url = new URL(request.url)
    const { limit, offset, search, sort, order } = parseListQuery(url, {
      sortableColumns: new Set([
        'name', 'category', 'vallle_count', 'total_revenue', 'total_commission', 'updated_at',
      ]),
      defaultSort: 'name',
      defaultOrder: 'ASC',
    })
    const status = url.searchParams.get('status') || 'all'
    const category = url.searchParams.get('category') || 'all'

    const where = []
    const params = []

    if (search) {
      where.push(String.raw`name LIKE ? ESCAPE '\'`)
      params.push(buildLikePattern(search))
    }

    if (status !== 'all') {
      where.push('status = ?')
      params.push(status)
    }

    if (category !== 'all') {
      where.push('category = ?')
      params.push(category)
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''

    // Aggregate per store first; search/filter/sort/pagination apply to the
    // summary so aggregate columns are sortable like any other.
    const summarySql = `
      WITH summary AS (
        SELECT s.id, s.name, s.category, s.status, s.created_at, s.updated_at,
               COUNT(v.id) AS vallle_count,
               COALESCE(SUM(v.amount), 0) AS total_revenue,
               COALESCE(cs.total_commission, 0) AS total_commission,
               COALESCE(cs.unpaid_commission, 0) AS unpaid_commission
        FROM stores s
        LEFT JOIN vallles v ON v.store_id = s.id
        LEFT JOIN (
          SELECT store_id,
                 SUM(amount) AS total_commission,
                 SUM(CASE WHEN paid_at IS NULL THEN amount ELSE 0 END) AS unpaid_commission
          FROM commissions
          GROUP BY store_id
        ) cs ON cs.store_id = s.id
        GROUP BY s.id
      )`

    const [countResult, dataResult] = await env.DB.batch([
      env.DB.prepare(`${summarySql} SELECT COUNT(*) AS total FROM summary ${whereSql}`).bind(...params),
      env.DB.prepare(
        `${summarySql} SELECT * FROM summary ${whereSql} ORDER BY ${sort} ${order} LIMIT ? OFFSET ?`,
      ).bind(...params, limit, offset),
    ])

    const total = countResult.results[0].total

    return Response.json({ data: dataResult.results, meta: { total, limit, offset } })
  } catch (error) {
    const err = new Error('Admin: Failed to list companies')
    err.code = 'DB_READ_FAILED'
    err.cause = error
    throw err
  }
}

/**
 * POST /api/admin/companies — Create a new store (super_admin only).
 * @param {Object} context - Cloudflare Pages Function context
 * @returns {Promise<Response>}
 */
export async function onRequestPost(context) {
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
    const id = generateUlid()
    const slug = body.name.trim().toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')
    const now = new Date().toISOString()

    const fields = ['id', 'slug', ...STORE_FIELDS, 'status', 'created_at', 'updated_at']
    const values = [id, slug, ...STORE_FIELDS.map((f) => (body[f] ?? '').toString().trim()), 'active', now, now]
    const placeholders = fields.map(() => '?').join(', ')

    await env.DB.prepare(
      `INSERT INTO stores (${fields.join(', ')}) VALUES (${placeholders})`,
    ).bind(...values).run()

    const store = await env.DB.prepare(
      'SELECT id, name, category, email, vat_id, phone, address1, address2, city, postal_code, region, country, status, created_at FROM stores WHERE id = ?',
    ).bind(id).first()

    return Response.json({ data: { store } }, { status: 201 })
  } catch (error) {
    const err = new Error('Admin: Failed to create company')
    err.code = 'DB_WRITE_FAILED'
    err.cause = error
    throw err
  }
}
