/**
 * Lightweight fetch wrapper for the Vallle API.
 * All requests go to `/api/...` (same origin, handled by Pages Functions).
 * Automatically includes the active store ID as an X-Store-Id header.
 * Returns `{ data }` on success, throws on error.
 */

let activeStoreId = null

/**
 * Sets the active store ID that will be sent with every API request.
 * Called by the auth context when the active store changes.
 * @param {string|null} storeId
 */
export const setApiStoreId = (storeId) => {
  activeStoreId = storeId
}

/**
 * Makes a request to the API and returns the parsed JSON body.
 * @param {string} path - API path, e.g. '/api/vouchers'
 * @param {Object} [options] - Fetch options (method, body, etc.)
 * @returns {Promise<Object>} Parsed response body
 */
export const api = async (path, options = {}) => {
  const headers = { 'Content-Type': 'application/json' }

  if (activeStoreId) {
    headers['X-Store-Id'] = activeStoreId
  }

  const response = await fetch(path, {
    credentials: 'same-origin',
    headers,
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const body = await response.json()

  if (!response.ok) {
    const error = new Error(body?.error?.message || 'Request failed')
    error.code = body?.error?.code || 'UNKNOWN'
    error.status = response.status
    throw error
  }

  return body
}

/**
 * GET helper.
 * @param {string} path
 * @returns {Promise<Object>}
 */
export const get = (path) => api(path)

/**
 * POST helper.
 * @param {string} path
 * @param {Object} body
 * @returns {Promise<Object>}
 */
export const post = (path, body) => api(path, { method: 'POST', body })

/**
 * PUT helper.
 * @param {string} path
 * @param {Object} body
 * @returns {Promise<Object>}
 */
export const put = (path, body) => api(path, { method: 'PUT', body })

/**
 * PATCH helper.
 * @param {string} path
 * @param {Object} body
 * @returns {Promise<Object>}
 */
export const patch = (path, body) => api(path, { method: 'PATCH', body })
