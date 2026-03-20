/**
 * Email sending helper for Pages Functions.
 * Uses Resend's REST API — no SDK needed.
 * Requires RESEND_API_KEY in env (set in .dev.vars / Cloudflare dashboard).
 */

const RESEND_API_URL = 'https://api.resend.com/emails'
const FROM_ADDRESS = 'Vallle <noreply@vallle.com>'

/**
 * Sends an email via the Resend API.
 * @param {Object} env - Cloudflare env bindings
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - Email HTML body
 * @returns {Promise<void>}
 */
export const sendEmail = async (env, { to, subject, html }) => {
  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_ADDRESS, to, subject, html }),
  })

  if (!response.ok) {
    const body = await response.text()
    const error = new Error(`Email: Failed to send email to ${to}`)
    error.code = 'EMAIL_SEND_FAILED'
    error.cause = new Error(body)
    throw error
  }
}
