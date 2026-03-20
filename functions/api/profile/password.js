import { getAuthUser, hashPassword, verifyPassword } from '../auth/_helpers.js'

/**
 * PUT /api/profile/password
 * Changes the authenticated user's password.
 * Requires current password for verification.
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

  const { currentPassword, newPassword } = body

  if (!currentPassword) {
    return Response.json(
      { error: { message: 'Current password is required', code: 'VALIDATION_FAILED' } },
      { status: 400 },
    )
  }

  if (
    !newPassword
    || newPassword.length < 8
    || !/[A-Z]/.test(newPassword)
    || !/[a-z]/.test(newPassword)
    || !/\d/.test(newPassword)
    || !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(newPassword)
  ) {
    return Response.json(
      { error: { message: 'Password does not meet security requirements', code: 'WEAK_PASSWORD' } },
      { status: 400 },
    )
  }

  try {
    const user = await env.DB.prepare(
      'SELECT id, password, status FROM users WHERE id = ?',
    ).bind(payload.sub).first()

    if (!user || user.status !== 'active') {
      return Response.json(
        { error: { message: 'User not found or inactive', code: 'AUTH_UNAUTHORIZED' } },
        { status: 401 },
      )
    }

    const valid = await verifyPassword(currentPassword, user.password)

    if (!valid) {
      return Response.json(
        { error: { message: 'Current password is incorrect', code: 'WRONG_PASSWORD' } },
        { status: 403 },
      )
    }

    const hashedPassword = await hashPassword(newPassword)
    const now = new Date().toISOString()

    await env.DB.prepare(
      'UPDATE users SET password = ?, updated_at = ? WHERE id = ?',
    ).bind(hashedPassword, now, payload.sub).run()

    return Response.json({ data: { success: true } })
  } catch (error) {
    const err = new Error('Profile: Failed to change password')
    err.code = 'DB_WRITE_FAILED'
    err.cause = error
    throw err
  }
}
