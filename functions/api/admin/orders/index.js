import {
  buildItemsReplace,
  getOrderDetail,
  normalizeDateInput,
  validateOrderAmount,
  validateOrderItemsList,
  validateOrderType,
} from "./_helpers.js";
import { generateUlid } from "../../_ulid.js";

/**
 * POST /api/admin/orders — Record a new fulfilment order (super_admin only).
 * Body: { store_id, type, items: [{ item, quantity }], amount?, notes?,
 * requested_at? }. Orders arrive by email/phone today, so the super_admin
 * records them on the store's behalf.
 * @param {Object} context - Cloudflare Pages Function context
 * @returns {Promise<Response>}
 */
export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: { message: "Invalid request body", code: "VALIDATION_FAILED" } },
      { status: 400 },
    );
  }

  if (!body.store_id) {
    return Response.json(
      { error: { message: "Store is required", code: "VALIDATION_FAILED" } },
      { status: 400 },
    );
  }

  const typeError = validateOrderType(body.type);
  if (typeError) return typeError;

  const amountError = validateOrderAmount(body.amount);
  if (amountError) return amountError;

  const itemsError = validateOrderItemsList(body.items);
  if (itemsError) return itemsError;

  try {
    const store = await env.DB.prepare("SELECT id FROM stores WHERE id = ?")
      .bind(body.store_id)
      .first();
    if (!store) {
      return Response.json(
        { error: { message: "Store not found", code: "STORE_NOT_FOUND" } },
        { status: 404 },
      );
    }

    const id = generateUlid();
    const now = new Date().toISOString();
    const requestedAt = normalizeDateInput(body.requested_at) ?? now;

    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO orders (id, store_id, type, status, amount, notes, requested_at, created_at, updated_at)
         VALUES (?, ?, ?, 'requested', ?, ?, ?, ?, ?)`,
      ).bind(
        id,
        body.store_id,
        body.type ?? "refill",
        body.amount ?? 0,
        (body.notes ?? "").toString().trim(),
        requestedAt,
        now,
        now,
      ),
      ...buildItemsReplace(env, id, body.items),
    ]);

    const order = await getOrderDetail(env, id);

    return Response.json({ data: { order } }, { status: 201 });
  } catch (error) {
    const err = new Error("Admin: Failed to create order");
    err.code = "DB_WRITE_FAILED";
    err.cause = error;
    throw err;
  }
}
