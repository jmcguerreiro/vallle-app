import { getAuthUser } from '../../auth/_helpers.js'

/**
 * GET /api/admin/users/:id — Get a single user with their store associations (super_admin only).
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
    const foundUser = await env.DB.prepare(
      'SELECT id, name, email, role, status, created_at FROM users WHERE id = ?',
    ).bind(id).first()

    if (!foundUser) {
      return Response.json(
        { error: { message: 'User not found', code: 'USER_NOT_FOUND' } },
        { status: 404 },
      )
    }

    const { results: stores } = await env.DB.prepare(
      `SELECT su.store_id, s.name AS store_name
       FROM store_users su
       JOIN stores s ON s.id = su.store_id
       WHERE su.user_id = ?`,
    ).bind(id).all()

    return Response.json({ data: { user: { ...foundUser, stores } } })
  } catch (error) {
    const err = new Error('Admin: Failed to get user')
    err.code = 'DB_READ_FAILED'
    err.cause = error
    throw err
  }
}

/**
 * PUT /api/admin/users/:id — Update a user's name, email, role, and status (super_admin only).
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

  if (!body.name?.trim()) {
    return Response.json(
      { error: { message: 'Name is required', code: 'VALIDATION_FAILED' } },
      { status: 400 },
    )
  }
  if (!body.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) {
    return Response.json(
      { error: { message: 'A valid email is required', code: 'VALIDATION_FAILED' } },
      { status: 400 },
    )
  }

  try {
    const existing = await env.DB.prepare(
      'SELECT id FROM users WHERE id = ?',
    ).bind(id).first()

    if (!existing) {
      return Response.json(
        { error: { message: 'User not found', code: 'USER_NOT_FOUND' } },
        { status: 404 },
      )
    }

    // Check email uniqueness (excluding this user)
    const emailConflict = await env.DB.prepare(
      'SELECT id FROM users WHERE email = ? AND id != ?',
    ).bind(body.email.trim().toLowerCase(), id).first()

    if (emailConflict) {
      return Response.json(
        { error: { message: 'Email already in use', code: 'EMAIL_TAKEN' } },
        { status: 409 },
      )
    }

    const role = body.role === 'super_admin' ? 'super_admin' : 'admin'
    const status = body.status === 'inactive' ? 'inactive' : 'active'
    const now = new Date().toISOString()

    await env.DB.prepare(
      `UPDATE users SET name = ?, email = ?, role = ?, status = ?, updated_at = ? WHERE id = ?`,
    ).bind(body.name.trim(), body.email.trim().toLowerCase(), role, status, now, id).run()

    const updatedUser = await env.DB.prepare(
      'SELECT id, name, email, role, status, created_at FROM users WHERE id = ?',
    ).bind(id).first()

    return Response.json({ data: { user: updatedUser } })
  } catch (error) {
    const err = new Error('Admin: Failed to update user')
    err.code = 'DB_WRITE_FAILED'
    err.cause = error
    throw err
  }
}
