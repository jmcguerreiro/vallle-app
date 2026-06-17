import { requireStore } from "../_store.js";
import { requireAuth } from "../auth/_helpers.js";

/**
 * Gates every /api/stats/* route to an authenticated user with active
 * membership of the store named in X-Store-Id. Exposes the authenticated user
 * as `context.data.user` and the resolved store as `context.data.store`.
 * @param {Object} context - Cloudflare Pages Function context
 * @returns {Promise<Response>}
 */
export async function onRequest(context) {
  const { request, env } = context;

  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const store = await requireStore(request, env, auth.user.sub);
  if (store instanceof Response) return store;

  context.data.user = auth.user;
  context.data.store = store;
  return context.next();
}
