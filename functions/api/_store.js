/**
 * Shared store helpers for Pages Functions.
 * Reads the active store ID from the X-Store-Id header
 * and verifies the authenticated user has access.
 */

/**
 * Reads the X-Store-Id header from the request.
 * @param {Request} request
 * @returns {string|null}
 */
export function getStoreId(request) {
  return request.headers.get('X-Store-Id') || null
}

/**
 * Verifies the user has access to the given store via store_users.
 * @param {Object} env - Cloudflare env bindings
 * @param {string} userId - Authenticated user ID
 * @param {string} storeId - Store ID to check
 * @returns {Promise<boolean>}
 */
export async function verifyStoreAccess(env, userId, storeId) {
  const link = await env.DB.prepare(
    'SELECT id FROM store_users WHERE user_id = ? AND store_id = ?',
  ).bind(userId, storeId).first()
  return !!link
}

/**
 * Reads the store ID from the request header and verifies user access.
 * Returns a Response if validation fails, or the store ID if successful.
 * @param {Request} request
 * @param {Object} env - Cloudflare env bindings
 * @param {string} userId - Authenticated user ID
 * @returns {Promise<{ storeId: string }|Response>}
 */
export async function requireStore(request, env, userId) {
  const storeId = getStoreId(request)

  if (!storeId) {
    return Response.json(
      { error: { message: 'X-Store-Id header is required', code: 'STORE_MISSING' } },
      { status: 400 },
    )
  }

  const hasAccess = await verifyStoreAccess(env, userId, storeId)

  if (!hasAccess) {
    return Response.json(
      { error: { message: 'No access to this store', code: 'STORE_FORBIDDEN' } },
      { status: 403 },
    )
  }

  return { storeId }
}
