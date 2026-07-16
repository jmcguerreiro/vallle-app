/**
 * Shared helpers for the admin orders routes: allowed values, body validation,
 * and the order+items detail read used by GET/POST/PUT responses.
 * Keep the catalogue in sync with the client copy in `src/constants/orders.js`.
 */

import { generateUlid } from "../../_ulid.js";

export { normalizeDateInput } from "../../_dates.js";

export const ORDER_TYPES = new Set(["welcome_pack", "refill"]);

export const ORDER_STATUSES = new Set([
  "requested",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
]);

// Catalogue lives in app code (no SQL CHECK) so adding a product is a
// constant edit, not a migration.
export const ORDER_ITEMS = new Set(["cards", "envelopes", "box", "pen"]);

/**
 * Builds a 400 validation Response.
 * @param {string} message
 * @returns {Response}
 */
function validationError(message) {
  return Response.json(
    { error: { message, code: "VALIDATION_FAILED" } },
    { status: 400 },
  );
}

/**
 * Validates the optional `type` field. Returns a 400 `Response` when
 * present-but-invalid, or `null` when absent or valid.
 * @param {unknown} value - Raw `body.type`
 * @returns {Response|null}
 */
export function validateOrderType(value) {
  if (value === undefined) return null;
  if (!ORDER_TYPES.has(value)) return validationError("Invalid order type");
  return null;
}

/**
 * Validates the optional `status` field. Returns a 400 `Response` when
 * present-but-invalid, or `null` when absent or valid.
 * @param {unknown} value - Raw `body.status`
 * @returns {Response|null}
 */
export function validateOrderStatus(value) {
  if (value === undefined) return null;
  if (!ORDER_STATUSES.has(value))
    return validationError("Invalid order status");
  return null;
}

/**
 * Validates the optional `amount` field (net cents, integer >= 0). Returns a
 * 400 `Response` when present-but-invalid, or `null` when absent or valid.
 * @param {unknown} value - Raw `body.amount`
 * @returns {Response|null}
 */
export function validateOrderAmount(value) {
  if (value === undefined) return null;
  if (!Number.isInteger(value) || value < 0) {
    return validationError("Amount must be a non-negative integer (cents)");
  }
  return null;
}

/**
 * Validates an `items` array: non-empty, catalogue items only, positive
 * integer quantities, no duplicate items. Returns a 400 `Response` or `null`.
 * @param {unknown} items - Raw `body.items`
 * @returns {Response|null}
 */
export function validateOrderItemsList(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return validationError("Order must contain at least one item");
  }
  const seen = new Set();
  for (const entry of items) {
    if (!entry || !ORDER_ITEMS.has(entry.item)) {
      return validationError("Invalid order item");
    }
    if (!Number.isInteger(entry.quantity) || entry.quantity < 1) {
      return validationError("Item quantity must be a positive integer");
    }
    if (seen.has(entry.item)) {
      return validationError("Duplicate order item");
    }
    seen.add(entry.item);
  }
  return null;
}

/**
 * Builds the D1 statements that replace an order's items (delete + inserts).
 * Run inside an `env.DB.batch` so the swap is atomic.
 * @param {Object} env - Cloudflare env bindings
 * @param {string} orderId
 * @param {Array<{ item: string, quantity: number }>} items
 * @returns {Array} Prepared statements
 */
export function buildItemsReplace(env, orderId, items) {
  return [
    env.DB.prepare("DELETE FROM order_items WHERE order_id = ?").bind(orderId),
    ...items.map((entry) =>
      env.DB.prepare(
        "INSERT INTO order_items (id, order_id, item, quantity) VALUES (?, ?, ?, ?)",
      ).bind(generateUlid(), orderId, entry.item, entry.quantity),
    ),
  ];
}

/**
 * Reads a single order with its items and the store's name.
 * @param {Object} env - Cloudflare env bindings
 * @param {string} id - Order ID
 * @returns {Promise<Object|null>} The order (with `items` array) or null
 */
export async function getOrderDetail(env, id) {
  const [orderResult, itemsResult] = await env.DB.batch([
    env.DB.prepare(
      `SELECT o.*, s.name AS store_name
       FROM orders o JOIN stores s ON s.id = o.store_id
       WHERE o.id = ?`,
    ).bind(id),
    env.DB.prepare(
      "SELECT id, item, quantity FROM order_items WHERE order_id = ? ORDER BY item",
    ).bind(id),
  ]);

  const order = orderResult.results[0];
  if (!order) return null;

  return { ...order, items: itemsResult.results };
}
