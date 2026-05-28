import { getAuthUser } from '../auth/_helpers.js'

/**
 * GET /api/commissions — List all commissions (super_admin only).
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

  // Super admin only
  if (user.role !== 'super_admin') {
    return Response.json(
      { error: { message: 'Forbidden — super_admin role required', code: 'AUTH_UNAUTHORIZED' } },
      { status: 403 },
    )
  }

  try {
    const url = new URL(request.url)
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit'), 10) || 50, 1), 200)
    const offset = Math.max(parseInt(url.searchParams.get('offset'), 10) || 0, 0)

    const [countResult, dataResult] = await env.DB.batch([
      env.DB.prepare('SELECT COUNT(*) as total FROM commissions').bind(),
      env.DB.prepare(
        `SELECT c.*, s.name as store_name, v.code as vallle_code
         FROM commissions c
         JOIN stores s ON c.store_id = s.id
         JOIN vallles v ON c.vallle_id = v.id
         ORDER BY c.created_at DESC
         LIMIT ? OFFSET ?`,
      ).bind(limit, offset),
    ])

    const total = countResult.results[0].total

    return Response.json({ data: dataResult.results, meta: { total, limit, offset } })
  } catch (error) {
    const err = new Error('Commissions: Failed to list commissions')
    err.code = 'DB_READ_FAILED'
    err.cause = error
    throw err
  }
}
