import { getAuthUser } from '../auth/_helpers.js'

/**
 * GET /api/profile
 * Returns the authenticated user's profile details.
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
      'SELECT id, name, email, role, status, created_at FROM users WHERE id = ?',
    ).bind(payload.sub).first()

    if (!user || user.status !== 'active') {
      return Response.json(
        { error: { message: 'User not found or inactive', code: 'AUTH_UNAUTHORIZED' } },
        { status: 401 },
      )
    }

    return Response.json({
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          created_at: user.created_at,
        },
      },
    })
  } catch (error) {
    const err = new Error('Profile: Failed to fetch profile')
    err.code = 'DB_READ_FAILED'
    err.cause = error
    throw err
  }
}

/**
 * PUT /api/profile
 * Updates the authenticated user's name and email.
 */
export async function onRequestPut(context) {
  const { env, request } = context

  const payload = await getAuthUser(request, env.JWT_SECRET)

  if (!payload) {
    return Response.json(
      { error: { message: 'Not authenticated', code: 'AUTH_MISSING_TOKEN' } },
      { status: 401 },
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

  const { name, email } = body

  if (!name || !name.trim()) {
    return Response.json(
      { error: { message: 'Name is required', code: 'VALIDATION_FAILED' } },
      { status: 400 },
    )
  }

  if (!email || !email.trim()) {
    return Response.json(
      { error: { message: 'Email is required', code: 'VALIDATION_FAILED' } },
      { status: 400 },
    )
  }

  try {
    // Check if email is taken by another user
    const existing = await env.DB.prepare(
      'SELECT id FROM users WHERE email = ? AND id != ?',
    ).bind(email.trim().toLowerCase(), payload.sub).first()

    if (existing) {
      return Response.json(
        { error: { message: 'Email is already in use', code: 'EMAIL_TAKEN' } },
        { status: 409 },
      )
    }

    const now = new Date().toISOString()
    await env.DB.prepare(
      'UPDATE users SET name = ?, email = ?, updated_at = ? WHERE id = ?',
    ).bind(name.trim(), email.trim().toLowerCase(), now, payload.sub).run()

    const user = await env.DB.prepare(
      'SELECT id, name, email, role, status, created_at FROM users WHERE id = ?',
    ).bind(payload.sub).first()

    return Response.json({
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          created_at: user.created_at,
        },
      },
    })
  } catch (error) {
    const err = new Error('Profile: Failed to update profile')
    err.code = 'DB_WRITE_FAILED'
    err.cause = error
    throw err
  }
}
