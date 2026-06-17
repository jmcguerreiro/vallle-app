/**
 * Shared store helpers for Pages Functions.
 * Reads the active store ID from the X-Store-Id header and resolves the
 * authenticated user's store-scoped membership.
 *
 * Two distinct status concepts:
 * - Membership (`store_users.status`): `active`/`inactive` — whether this user
 *   can access this store. `role` (`admin`/`user`) is likewise store-scoped.
 * - Store (`stores.status`): `active`/`suspended`/`inactive`, set by the
 *   platform super_admin. `suspended` keeps the store readable but blocks new
 *   vallle creation; `inactive` removes access entirely.
 */

/**
 * Reads the X-Store-Id header from the request.
 * @param {Request} request
 * @returns {string|null}
 */
export function getStoreId(request) {
  return request.headers.get("X-Store-Id") || null;
}

/**
 * Reads the store ID from the request header and resolves the user's
 * store-scoped membership. Returns a Response if validation fails, otherwise the
 * store ID, the caller's store role, and the store's status.
 *
 * Access is denied (403) when the user has no membership, the membership is
 * inactive, or the store itself is inactive. A suspended store is allowed
 * through (read access); creation handlers gate writes on `storeStatus`.
 * @param {Request} request
 * @param {Object} env - Cloudflare env bindings
 * @param {string} userId - Authenticated user ID
 * @returns {Promise<{ storeId: string, storeRole: string, storeStatus: string }|Response>}
 */
export async function requireStore(request, env, userId) {
  const storeId = getStoreId(request);

  if (!storeId) {
    return Response.json(
      {
        error: {
          message: "X-Store-Id header is required",
          code: "STORE_MISSING",
        },
      },
      { status: 400 },
    );
  }

  const row = await env.DB.prepare(
    `SELECT su.role AS member_role, su.status AS member_status,
            s.status AS store_status
       FROM store_users su
       JOIN stores s ON s.id = su.store_id
      WHERE su.user_id = ? AND su.store_id = ?`,
  )
    .bind(userId, storeId)
    .first();

  if (
    !row ||
    row.member_status === "inactive" ||
    row.store_status === "inactive"
  ) {
    return Response.json(
      {
        error: { message: "No access to this store", code: "STORE_FORBIDDEN" },
      },
      { status: 403 },
    );
  }

  return {
    storeId,
    storeRole: row.member_role,
    storeStatus: row.store_status,
  };
}
