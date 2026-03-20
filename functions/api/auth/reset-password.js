/**
 * POST /api/auth/reset-password
 * Validates the reset token and updates the user's password.
 */

import { hashPassword } from './_helpers'

/**
 * Hashes a raw token with SHA-256 to compare against the stored hash.
 * @param {string} raw - The raw token from the URL
 * @returns {Promise<string>} Hex-encoded hash
 */
const hashToken = async (raw) => {
  const buffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(raw),
  )
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export const onRequestPost = async (context) => {
  const { env, request } = context

  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return Response.json(
        { error: { message: 'Token and password are required', code: 'VALIDATION_FAILED' } },
        { status: 400 },
      )
    }

    if (password.length < 8) {
      return Response.json(
        { error: { message: 'Password must be at least 8 characters', code: 'VALIDATION_FAILED' } },
        { status: 400 },
      )
    }

    const tokenHash = await hashToken(token)

    // Find a valid, unused, non-expired token
    const resetToken = await env.DB.prepare(
      'SELECT id, user_id FROM password_reset_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > datetime(\'now\')',
    ).bind(tokenHash).first()

    if (!resetToken) {
      return Response.json(
        { error: { message: 'Invalid or expired reset link', code: 'PASSWORD_RESET_INVALID_TOKEN' } },
        { status: 400 },
      )
    }

    // Hash the new password, update user, and invalidate all tokens for this user
    const passwordHash = await hashPassword(password)

    await env.DB.batch([
      env.DB.prepare(
        'UPDATE users SET password = ? WHERE id = ?',
      ).bind(passwordHash, resetToken.user_id),
      env.DB.prepare(
        'UPDATE password_reset_tokens SET used_at = datetime(\'now\') WHERE user_id = ?',
      ).bind(resetToken.user_id),
    ])

    return Response.json({ data: { reset: true } })
  } catch (error) {
    const err = new Error('ResetPassword: Failed to reset password')
    err.code = 'PASSWORD_RESET_FAILED'
    err.cause = error
    throw err
  }
}
