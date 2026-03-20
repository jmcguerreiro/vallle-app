/**
 * POST /api/auth/forgot-password
 * Generates a password reset token and sends a reset link via email.
 * Always returns 200 regardless of whether the email exists (prevents enumeration).
 */

import { sendEmail } from './_email'

const TOKEN_EXPIRY_MINUTES = 30

/**
 * Generates a cryptographically random token and its SHA-256 hash.
 * The raw token goes in the email link; the hash is stored in the DB.
 * @returns {Promise<{ raw: string, hash: string }>}
 */
const generateResetToken = async () => {
  const buffer = crypto.getRandomValues(new Uint8Array(32))
  const raw = [...buffer].map((b) => b.toString(16).padStart(2, '0')).join('')

  const hashBuffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(raw),
  )
  const hash = [...new Uint8Array(hashBuffer)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  return { raw, hash }
}

export const onRequestPost = async (context) => {
  const { env, request } = context

  try {
    const { email } = await request.json()

    if (!email) {
      return Response.json(
        { error: { message: 'Email is required', code: 'VALIDATION_FAILED' } },
        { status: 400 },
      )
    }

    // Look up user — but always return 200 to prevent email enumeration
    const user = await env.DB.prepare(
      'SELECT id, name, email FROM users WHERE email = ?',
    ).bind(email.toLowerCase().trim()).first()

    if (user) {
      const { raw, hash } = await generateResetToken()
      const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000).toISOString()

      await env.DB.prepare(
        'INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
      ).bind(crypto.randomUUID(), user.id, hash, expiresAt).run()

      const resetUrl = `${new URL(request.url).origin}/reset-password?token=${raw}`

      await sendEmail(env, {
        to: user.email,
        subject: 'Vallle — Repor palavra-passe',
        html: `
          <p>Olá ${user.name},</p>
          <p>Recebemos um pedido para repor a tua palavra-passe.</p>
          <p><a href="${resetUrl}">Clica aqui para repor a tua palavra-passe</a></p>
          <p>Este link expira em ${TOKEN_EXPIRY_MINUTES} minutos.</p>
          <p>Se não pediste esta alteração, ignora este email.</p>
          <p>— Vallle</p>
        `,
      })
    }

    // Always return success to prevent email enumeration
    return Response.json({ data: { sent: true } })
  } catch (error) {
    const err = new Error('ForgotPassword: Failed to process reset request')
    err.code = 'PASSWORD_RESET_FAILED'
    err.cause = error
    throw err
  }
}
