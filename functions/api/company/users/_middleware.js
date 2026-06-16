import { requireRole } from "../../auth/_helpers.js";

/**
 * Gates every /api/company/users/* route to admin or super_admin.
 * Runs before the route handler; exposes the authenticated user as
 * `context.data.user` for downstream handlers.
 * @param {Object} context - Cloudflare Pages Function context
 * @returns {Promise<Response>}
 */
export async function onRequest(context) {
  const auth = await requireRole(context.request, context.env.JWT_SECRET, [
    "admin",
    "super_admin",
  ]);
  if (auth instanceof Response) return auth;

  context.data.user = auth.user;
  return context.next();
}
