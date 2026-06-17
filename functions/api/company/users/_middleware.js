import { requireStore } from "../../_store.js";
import { requireAuth } from "../../auth/_helpers.js";

/**
 * Gates every /api/company/users/* route to an admin of the active store.
 * Store role is store-scoped (store_users.role), so "admin" means admin of the
 * store named in X-Store-Id — not a global role. Platform super_admins are
 * always allowed. Exposes the authenticated user as `context.data.user` and the
 * resolved store as `context.data.store` for downstream handlers.
 * @param {Object} context - Cloudflare Pages Function context
 * @returns {Promise<Response>}
 */
export async function onRequest(context) {
  const { request, env } = context;

  const auth = await requireAuth(request, env.JWT_SECRET);
  if (auth instanceof Response) return auth;
  const { user } = auth;

  const store = await requireStore(request, env, user.sub);
  if (store instanceof Response) return store;

  const isSuperAdmin = user.role === "super_admin";
  const isStoreAdmin = store.storeRole === "admin";

  if (!isSuperAdmin && !isStoreAdmin) {
    return Response.json(
      { error: { message: "Forbidden", code: "AUTH_FORBIDDEN" } },
      { status: 403 },
    );
  }

  context.data.user = user;
  context.data.store = store;
  return context.next();
}
