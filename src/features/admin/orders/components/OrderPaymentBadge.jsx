import { useTranslation } from "react-i18next";

import Badge from "@/components/Badge";

import { ORDER_PAYMENT_STATES, derivePaymentState } from "../utils";

/**
 * Maps derived payment states to Badge variants. "Included" (free orders)
 * has no mapping and renders with the neutral base style.
 */
const PAYMENT_STATE_VARIANTS = {
  [ORDER_PAYMENT_STATES.TO_INVOICE]: "danger",
  [ORDER_PAYMENT_STATES.AWAITING_PAYMENT]: "warning",
  [ORDER_PAYMENT_STATES.PAID]: "success",
};

/**
 * Component: OrderPaymentBadge
 * Shows an order's derived payment state: "Included" for free orders
 * (amount 0, e.g. a welcome pack), "To invoice" when no invoice was sent
 * yet, "Awaiting payment" once invoiced, and "Paid" when settled.
 * @component
 * @param {Object} props
 * @param {Object} props.order - Order with `amount`, `invoiced_at`, `paid_at`
 * @returns {JSX.Element}
 */
const OrderPaymentBadge = ({ order }) => {
  // Hooks
  const { t } = useTranslation();

  // Derived State
  const state = derivePaymentState(order);

  // Render
  return (
    <Badge variant={PAYMENT_STATE_VARIANTS[state]}>
      {t(`features.admin.orders.list.${state}`)}
    </Badge>
  );
};

export default OrderPaymentBadge;
