import { requireStore } from '../../_store.js'
import { getAuthUser } from '../../auth/_helpers.js'

/**
 * GET /api/company/users/:id — Get a single user belonging to the active store.
 * Requires admin role.
 */
export async function onRequestGet(context) {
  const { request, env, params } = context
  const { id } = params

  const payload = await getAuthUser(request, env.JWT_SECRET)
  if (!payload) {
    return Response.json(
      { error: { message: 'Unauthorized', code: 'AUTH_UNAUTHORIZED' } },
      { status: 401 },
    )
  }

  if (payload.role !== 'admin' && payload.role !== 'super_admin') {
    return Response.json(
      { error: { message: 'Forbidden', code: 'AUTH_FORBIDDEN' } },
      { status: 403 },
    )
  }

  const result = await requireStore(request, env, payload.sub)
  if (result instanceof Response) return result

  try {
    // Verify user belongs to this store
    const link = await env.DB.prepare(
      'SELECT id FROM store_users WHERE store_id = ? AND user_id = ?',
    ).bind(result.storeId, id).first()

    if (!link) {
      return Response.json(
        { error: { message: 'User not found', code: 'USER_NOT_FOUND' } },
        { status: 404 },
      )
    }

    const user = await env.DB.prepare(
      'SELECT id, name, email, role, status, created_at FROM users WHERE id = ?',
    ).bind(id).first()

    if (!user) {
      return Response.json(
        { error: { message: 'User not found', code: 'USER_NOT_FOUND' } },
        { status: 404 },
      )
    }

    return Response.json({ data: { user } })
  } catch (error) {
    const err = new Error('Company: Failed to get user')
    err.code = 'DB_READ_FAILED'
    err.cause = error
    throw err
  }
}

/**
 * PUT /api/company/users/:id — Update a user belonging to the active store.
 * Requires admin role. Can update name, email, role (user/admin), and status.
 */
export async function onRequestPut(context) {
  const { request, env, params } = context
  const { id } = params

  const payload = await getAuthUser(request, env.JWT_SECRET)
  if (!payload) {
    return Response.json(
      { error: { message: 'Unauthorized', code: 'AUTH_UNAUTHORIZED' } },
      { status: 401 },
    )
  }

  if (payload.role !== 'admin' && payload.role !== 'super_admin') {
    return Response.json(
      { error: { message: 'Forbidden', code: 'AUTH_FORBIDDEN' } },
      { status: 403 },
    )
  }

  const result = await requireStore(request, env, payload.sub)
  if (result instanceof Response) return result

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
    // Verify user belongs to this store
    const link = await env.DB.prepare(
      'SELECT id FROM store_users WHERE store_id = ? AND user_id = ?',
    ).bind(result.storeId, id).first()

    if (!link) {
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

    // Company admins can only set user or admin roles
    const role = body.role === 'admin' ? 'admin' : 'user'
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
    const err = new Error('Company: Failed to update user')
    err.code = 'DB_WRITE_FAILED'
    err.cause = error
    throw err
  }
}
