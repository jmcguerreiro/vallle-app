import { getAuthUser } from './_helpers.js'

/**
 * GET /api/auth/me
 * Returns the currently authenticated user from the JWT cookie.
 */
export async function onRequestGet(context) {
  const { env, request } = context

  const payload = await getAuthUser(request, env.JWT_SECRET)

  if (!payload) {
    return Response.json(
      { error: { message: 'Not authenticated', code: 'AUTH_MISSING_TOKEN' } },
      { status: 401 },
    )
  }

  try {
    const user = await env.DB.prepare(
      'SELECT id, name, email, role, status FROM users WHERE id = ?',
    ).bind(payload.sub).first()

    if (!user || user.status !== 'active') {
      return Response.json(
        { error: { message: 'User not found or inactive', code: 'AUTH_UNAUTHORIZED' } },
        { status: 401 },
      )
    }

    const { results: storeLinks } = await env.DB.prepare(
      `SELECT su.store_id, su.role, s.name AS store_name
       FROM store_users su
       JOIN stores s ON s.id = su.store_id
       WHERE su.user_id = ?`,
    ).bind(user.id).all()

    return Response.json({
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          stores: storeLinks,
        },
      },
    })
  } catch (error) {
    const err = new Error('Auth: Failed to fetch user')
    err.code = 'DB_READ_FAILED'
    err.cause = error
    throw err
  }
}
