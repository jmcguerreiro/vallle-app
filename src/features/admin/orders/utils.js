import { ORDER_ITEMS } from "@/constants/orders";

/**
 * Builds the API `items` payload from the form's per-item quantity fields,
 * keeping only items with a positive quantity.
 * @param {Object} quantities - Map of item key → raw quantity input value
 * @returns {Array<{ item: string, quantity: number }>}
 */
export const buildOrderItems = (quantities) =>
  ORDER_ITEMS.map((item) => ({
    item,
    quantity: Number.parseInt(quantities?.[item], 10) || 0,
  })).filter((entry) => entry.quantity > 0);

/**
 * Maps order fulfilment statuses to Badge variants. Statuses without a
 * mapping render with the neutral base style.
 */
export const ORDER_STATUS_VARIANTS = {
  requested: "warning",
  delivered: "success",
  cancelled: "danger",
};

/**
 * Payment states as derived and returned by the API (`payment_state` on every
 * order — see `derivePaymentState` in `functions/api/admin/orders/_helpers.js`).
 * Values double as the list `payment` filter params and as the i18n key
 * suffix under `features.admin.orders.list.*`.
 */
export const ORDER_PAYMENT_STATES = {
  INCLUDED: "included",
  TO_INVOICE: "to_invoice",
  AWAITING_PAYMENT: "awaiting_payment",
  PAID: "paid",
};
