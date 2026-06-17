import { parsePagination } from "../_list.js";

/**
 * GET /api/commissions — List all commissions.
 * Gated to super_admin by functions/api/commissions/_middleware.js.
 * @param {Object} context - Cloudflare Pages Function context
 * @returns {Promise<Response>}
 */
export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const url = new URL(request.url);
    const { limit, offset } = parsePagination(url);

    const [countResult, dataResult] = await env.DB.batch([
      env.DB.prepare("SELECT COUNT(*) as total FROM commissions").bind(),
      env.DB.prepare(
        `SELECT c.*, s.name as store_name, v.code as vallle_code
         FROM commissions c
         JOIN stores s ON c.store_id = s.id
         JOIN vallles v ON c.vallle_id = v.id
         ORDER BY c.created_at DESC
         LIMIT ? OFFSET ?`,
      ).bind(limit, offset),
    ]);

    const total = countResult.results[0].total;

    return Response.json({
      data: dataResult.results,
      meta: { total, limit, offset },
    });
  } catch (error) {
    const err = new Error("Commissions: Failed to list commissions");
    err.code = "DB_READ_FAILED";
    err.cause = error;
    throw err;
  }
}
