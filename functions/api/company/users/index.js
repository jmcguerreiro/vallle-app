import { generateUlid } from '../../_ulid.js'
import { requireStore } from '../../_store.js'
import { getAuthUser, hashPassword } from '../../auth/_helpers.js'

/**
 * GET /api/company/users — List users for the active store.
 * Requires admin role (admin or super_admin).
 */
export async function onRequestGet(context) {
  const { request, env } = context

  const payload = await getAuthUser(request, env.JWT_SECRET)
  if (!payload) {
    return Response.json(
      { error: { message: 'Unauthorized', code: 'AUTH_UNAUTHORIZED' } },
      { status: 401 },
    )
  }

  // Only admins can manage company users
  if (payload.role !== 'admin' && payload.role !== 'super_admin') {
    return Response.json(
      { error: { message: 'Forbidden', code: 'AUTH_FORBIDDEN' } },
      { status: 403 },
    )
  }

  const result = await requireStore(request, env, payload.sub)
  if (result instanceof Response) return result

  try {
    const { results } = await env.DB.prepare(
      `SELECT u.id, u.name, u.email, u.role, u.status, u.created_at, u.updated_at
       FROM store_users su
       JOIN users u ON u.id = su.user_id
       WHERE su.store_id = ?
       ORDER BY u.name`,
    ).bind(result.storeId).all()

    return Response.json({ data: results })
  } catch (error) {
    const err = new Error('Company: Failed to list users')
    err.code = 'DB_READ_FAILED'
    err.cause = error
    throw err
  }
}

/**
 * POST /api/company/users — Create a user and assign to the active store.
 * Requires admin role (admin or super_admin).
 */
export async function onRequestPost(context) {
  const { request, env } = context

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
  if (!body.password?.trim() || body.password.length < 8) {
    return Response.json(
      { error: { message: 'Password is required (min 8 characters)', code: 'VALIDATION_FAILED' } },
      { status: 400 },
    )
  }

  try {
    const existing = await env.DB.prepare(
      'SELECT id FROM users WHERE email = ?',
    ).bind(body.email.trim().toLowerCase()).first()

    if (existing) {
      return Response.json(
        { error: { message: 'Email already in use', code: 'EMAIL_TAKEN' } },
        { status: 409 },
      )
    }

    const id = generateUlid()
    const passwordHash = await hashPassword(body.password)
    // Company admins can only create user or admin roles, never super_admin
    const role = body.role === 'admin' ? 'admin' : 'user'
    const now = new Date().toISOString()

    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO users (id, name, email, password, role, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`,
      ).bind(id, body.name.trim(), body.email.trim().toLowerCase(), passwordHash, role, now, now),
      env.DB.prepare(
        `INSERT INTO store_users (store_id, user_id, role) VALUES (?, ?, ?)`,
      ).bind(result.storeId, id, role),
    ])

    const newUser = await env.DB.prepare(
      'SELECT id, name, email, role, status, created_at FROM users WHERE id = ?',
    ).bind(id).first()

    return Response.json({ data: { user: newUser } }, { status: 201 })
  } catch (error) {
    const err = new Error('Company: Failed to create user')
    err.code = 'DB_WRITE_FAILED'
    err.cause = error
    throw err
  }
}
