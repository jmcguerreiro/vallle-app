import { useTranslation } from "react-i18next";

import Badge from "@/components/Badge";
import { formatDate } from "@/utils/dates";

/**
 * Component: PeriodStatusBadge
 * Paid/unpaid badge for a subscription period, with the payment date under
 * the badge when paid.
 * @component
 * @param {Object} props
 * @param {Object} props.period - Subscription period with `paid_at`
 * @returns {JSX.Element}
 */
const PeriodStatusBadge = ({ period }) => {
  // Hooks
  const { t } = useTranslation();

  // Render
  if (!period.paid_at) {
    return (
      <Badge variant="warning">
        {t("features.admin.subscriptions.unpaid")}
      </Badge>
    );
  }

  return (
    <div className="c-admin-subscriptions-detail__paid">
      <Badge variant="success">{t("features.admin.subscriptions.paid")}</Badge>
      <span className="c-admin-subscriptions-detail__paid-date">
        {formatDate(period.paid_at)}
      </span>
    </div>
  );
};

export default PeriodStatusBadge;
