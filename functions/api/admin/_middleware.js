import { requireRole } from "../auth/_helpers.js";

/**
 * Gates every /api/admin/* route to the super_admin role.
 * Runs before the route handler; exposes the authenticated user as
 * `context.data.user` for downstream handlers that need it.
 * @param {Object} context - Cloudflare Pages Function context
 * @returns {Promise<Response>}
 */
export async function onRequest(context) {
  const auth = await requireRole(
    context.request,
    context.env.JWT_SECRET,
    "super_admin",
  );
  if (auth instanceof Response) return auth;

  context.data.user = auth.user;
  return context.next();
}
