import { useTranslation } from "react-i18next";

import Badge from "@/components/Badge";

/**
 * Component: PeriodStatusBadge
 * Paid/unpaid badge for a subscription period. Maps `paid_at` to the badge
 * variant and label — the payment date, when needed, is surfaced by the
 * caller (e.g. a dedicated "Paid on" field), never inside the badge.
 * @component
 * @param {Object} props
 * @param {Object} props.period - Subscription period with `paid_at`
 * @returns {JSX.Element}
 */
const PeriodStatusBadge = ({ period }) => {
  // Hooks
  const { t } = useTranslation();

  // Render
  return period.paid_at ? (
    <Badge variant="success">{t("features.admin.subscriptions.paid")}</Badge>
  ) : (
    <Badge variant="warning">{t("features.admin.subscriptions.unpaid")}</Badge>
  );
};

export default PeriodStatusBadge;
