import {
  STORE_SELECT,
  buildStoreUpdate,
  requireStore,
  validateStoreExpiryDays,
} from "../_store.js";
import { requireAuth } from "../auth/_helpers.js";

/**
 * GET /api/company
 * Returns the store details for the active store (from X-Store-Id header).
 * Verifies the authenticated user has access.
 */
export async function onRequestGet(context) {
  const { env, request } = context;

  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const result = await requireStore(request, env, auth.user.sub);
  if (result instanceof Response) return result;

  try {
    const store = await env.DB.prepare(STORE_SELECT)
      .bind(result.storeId)
      .first();

    if (!store) {
      return Response.json(
        { error: { message: "Store not found", code: "STORE_NOT_FOUND" } },
        { status: 404 },
      );
    }

    return Response.json({ data: { store } });
  } catch (error) {
    const err = new Error("Company: Failed to fetch store");
    err.code = "DB_READ_FAILED";
    err.cause = error;
    throw err;
  }
}

/**
 * PUT /api/company
 * Updates the store details for the active store (from X-Store-Id header).
 * Verifies the authenticated user has access.
 */
export async function onRequestPut(context) {
  const { env, request } = context;

  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const result = await requireStore(request, env, auth.user.sub);
  if (result instanceof Response) return result;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: { message: "Invalid request body", code: "VALIDATION_FAILED" } },
      { status: 400 },
    );
  }

  if (!body.name || !body.name.trim()) {
    return Response.json(
      {
        error: {
          message: "Company name is required",
          code: "VALIDATION_FAILED",
        },
      },
      { status: 400 },
    );
  }

  const expiryError = validateStoreExpiryDays(body.default_vallle_expiry_days);
  if (expiryError) return expiryError;

  try {
    const { sets, values } = buildStoreUpdate(body);
    const now = new Date().toISOString();

    await env.DB.prepare(
      `UPDATE stores SET ${sets}, updated_at = ? WHERE id = ?`,
    )
      .bind(...values, now, result.storeId)
      .run();

    const store = await env.DB.prepare(STORE_SELECT)
      .bind(result.storeId)
      .first();

    return Response.json({ data: { store } });
  } catch (error) {
    const err = new Error("Company: Failed to update store");
    err.code = "DB_WRITE_FAILED";
    err.cause = error;
    throw err;
  }
}
