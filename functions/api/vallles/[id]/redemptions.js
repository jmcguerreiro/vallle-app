import { parsePagination } from "../../_list.js";
import { requireStore } from "../../_store.js";
import { requireAuth } from "../../auth/_helpers.js";

/**
 * GET /api/vallles/:id/redemptions — List redemptions for a vallle.
 * @param {Object} context - Cloudflare Pages Function context
 * @returns {Promise<Response>}
 */
export async function onRequestGet(context) {
  const { request, env, params } = context;
  const { id } = params;

  // Auth
  const auth = await requireAuth(request, env.JWT_SECRET);
  if (auth instanceof Response) return auth;
  const { user } = auth;

  // Store
  const storeResult = await requireStore(request, env, user.sub);
  if (storeResult instanceof Response) return storeResult;
  const { storeId } = storeResult;

  try {
    // Verify vallle belongs to store
    const vallle = await env.DB.prepare(
      "SELECT id FROM vallles WHERE id = ? AND store_id = ?",
    )
      .bind(id, storeId)
      .first();

    if (!vallle) {
      return Response.json(
        { error: { message: "Vallle not found", code: "VALLLE_NOT_FOUND" } },
        { status: 404 },
      );
    }

    const url = new URL(request.url);
    const { limit, offset } = parsePagination(url);

    const [countResult, dataResult] = await env.DB.batch([
      env.DB.prepare(
        "SELECT COUNT(*) as total FROM redemptions WHERE vallle_id = ? AND store_id = ?",
      ).bind(id, storeId),
      env.DB.prepare(
        `SELECT r.*, u.name AS redeemed_by_name
         FROM redemptions r
         LEFT JOIN users u ON u.id = r.redeemed_by
         WHERE r.vallle_id = ? AND r.store_id = ?
         ORDER BY r.created_at DESC
         LIMIT ? OFFSET ?`,
      ).bind(id, storeId, limit, offset),
    ]);

    const total = countResult.results[0].total;

    return Response.json({
      data: dataResult.results,
      meta: { total, limit, offset },
    });
  } catch (error) {
    const err = new Error("Vallles: Failed to list redemptions");
    err.code = "DB_READ_FAILED";
    err.cause = error;
    throw err;
  }
}
