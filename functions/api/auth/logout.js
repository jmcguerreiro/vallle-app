import { clearAuthCookie } from './_helpers.js'

/**
 * POST /api/auth/logout
 * Clears the auth cookie.
 */
export async function onRequestPost() {
  return Response.json(
    { data: { message: 'Logged out' } },
    { headers: { 'Set-Cookie': clearAuthCookie() } },
  )
}
