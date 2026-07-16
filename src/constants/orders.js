/**
 * Fulfilment order constants for the Vallle app.
 * Matches the `type`/`status` columns on the `orders` table and the item
 * catalogue validated in `functions/api/admin/orders/_helpers.js` — keep the
 * two in sync.
 */

export const ORDER_TYPES = {
  WELCOME_PACK: "welcome_pack",
  REFILL: "refill",
};

/**
 * Fulfilment lifecycle: requested → preparing → shipped → delivered;
 * cancelled aborts at any point.
 */
export const ORDER_STATUSES = {
  REQUESTED: "requested",
  PREPARING: "preparing",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
};

/** Orderable physical items, in display order. */
export const ORDER_ITEMS = ["cards", "envelopes", "box", "pen"];
