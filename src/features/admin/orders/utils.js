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
 * Derived payment states. Values double as the i18n key suffix under
 * `features.admin.orders.list.*`.
 */
export const ORDER_PAYMENT_STATES = {
  INCLUDED: "included",
  TO_INVOICE: "toInvoice",
  AWAITING_PAYMENT: "awaitingPayment",
  PAID: "paid",
};

/**
 * Derives an order's payment state from its payment record. The state is
 * never stored — it follows from the amount and the two timestamps, and the
 * sequence is enforced by the API (no paid before invoiced).
 * @param {Object} order - Order with `amount`, `invoiced_at`, `paid_at`
 * @returns {string} One of ORDER_PAYMENT_STATES
 */
export function derivePaymentState(order) {
  if (order.amount === 0) return ORDER_PAYMENT_STATES.INCLUDED;
  if (order.paid_at) return ORDER_PAYMENT_STATES.PAID;
  if (order.invoiced_at) return ORDER_PAYMENT_STATES.AWAITING_PAYMENT;
  return ORDER_PAYMENT_STATES.TO_INVOICE;
}
