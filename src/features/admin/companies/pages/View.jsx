import { useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import { useQuery } from "@tanstack/react-query";

import Accordion from "@/components/Accordion";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import DefinitionList from "@/components/DefinitionList";
import EmptyState from "@/components/EmptyState";
import Loader from "@/components/Loader";
import Stat from "@/components/Stat";
import Table from "@/components/Table";
import { ORDER_STATUSES } from "@/constants/orders";
import {
  adminCompanyEditPath,
  adminCompanyOrdersPath,
  adminCompanySubscriptionPath,
  adminOrderPath,
  adminUserPath,
} from "@/constants/routes";
import { useModal } from "@/hooks/useModal";
import { get } from "@/services/api";
import { formatCurrency } from "@/utils/currency";
import { formatDate } from "@/utils/dates";
import { IconReceiptText, IconPackage } from "@/utils/icons";

import OrderPaymentBadge from "../../orders/components/OrderPaymentBadge";
import {
  ORDER_PAYMENT_STATES,
  ORDER_STATUS_VARIANTS,
} from "../../orders/utils";
import PeriodStatusBadge from "../../subscriptions/components/PeriodStatusBadge";

/**
 * Maps company status values to Badge variants. Statuses without a
 * mapping render with the neutral base style.
 */
const STATUS_VARIANTS = {
  active: "success",
  suspended: "warning",
};

/**
 * Whether an order still needs attention: anything not delivered yet, or
 * delivered but with money still to invoice or chase. Cancelled orders are
 * never pending.
 * @param {Object} order - Order with `status` and `payment_state`
 * @returns {boolean}
 */
const isPendingOrder = (order) =>
  order.status !== ORDER_STATUSES.CANCELLED &&
  (order.status !== ORDER_STATUSES.DELIVERED ||
    order.payment_state === ORDER_PAYMENT_STATES.TO_INVOICE ||
    order.payment_state === ORDER_PAYMENT_STATES.AWAITING_PAYMENT);

/**
 * Maps user status values to Badge variants (used in the company's user list).
 */
const USER_STATUS_VARIANTS = {
  active: "success",
};

/**
 * Component: AdminCompanyView
 * Displays a single company at a glance: headline stats, company details, a
 * subscription summary (the current period) and a pending-orders worklist —
 * each with a full-width "manage" button into its company-scoped modal — and
 * the company's users.
 * @component
 * @returns {JSX.Element}
 */
const AdminCompanyView = () => {
  // Hooks
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { setHeader } = useModal();

  // Queries
  const {
    data: response,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["admin", "companies", id],
    queryFn: ({ signal }) => get(`/api/admin/companies/${id}`, { signal }),
  });

  // Handlers
  const handleEdit = useCallback(() => {
    const backgroundLocation = location.state?.backgroundLocation || location;
    navigate(adminCompanyEditPath(id), { state: { backgroundLocation } });
  }, [id, navigate, location]);

  // "Manage" buttons open the company-scoped subscription/orders modals on
  // top of the same background page.
  const handleManageSubscription = useCallback(() => {
    const backgroundLocation = location.state?.backgroundLocation || location;
    navigate(adminCompanySubscriptionPath(id), {
      state: { backgroundLocation },
    });
  }, [id, navigate, location]);

  const handleManageOrders = useCallback(() => {
    const backgroundLocation = location.state?.backgroundLocation || location;
    navigate(adminCompanyOrdersPath(id), { state: { backgroundLocation } });
  }, [id, navigate, location]);

  const handleOrderClick = useCallback(
    (order) => {
      const backgroundLocation = location.state?.backgroundLocation || location;
      navigate(adminOrderPath(order.id), { state: { backgroundLocation } });
    },
    [navigate, location],
  );

  // Derived State
  const orderColumns = useMemo(
    () => [
      {
        key: "requested_at",
        header: t("features.admin.orders.list.requestedAt"),
        render: (order) => formatDate(order.requested_at),
      },
      {
        key: "type",
        header: t("features.admin.orders.list.type"),
        render: (order) => t(`constants.orderTypes.${order.type}`),
        hideOnMobile: true,
      },
      {
        key: "amount",
        header: t("features.admin.orders.list.amount"),
        align: "right",
        render: (order) => formatCurrency(order.amount),
      },
      {
        key: "payment",
        header: t("features.admin.orders.list.payment"),
        render: (order) => <OrderPaymentBadge order={order} />,
        hideOnMobile: true,
      },
      {
        key: "status",
        header: t("features.admin.orders.list.status"),
        render: (order) => (
          <Badge variant={ORDER_STATUS_VARIANTS[order.status]}>
            {t(`constants.orderStatuses.${order.status}`)}
          </Badge>
        ),
      },
    ],
    [t],
  );

  // Effects
  useEffect(() => {
    setHeader({
      title: t("features.admin.companies.view.heading"),
      description: t("features.admin.companies.view.description"),
      actions: [
        { label: t("features.admin.companies.view.edit"), onClick: handleEdit },
      ],
    });
    return () => setHeader();
  }, [setHeader, t, handleEdit]);

  // Render
  if (isPending) {
    return (
      <div className="c-page-state">
        <Loader />
      </div>
    );
  }

  if (isError || !response?.data) {
    return (
      <div className="c-page-state">
        <EmptyState
          description={t("common.error")}
          hideImageOnMobile
          image="companies--error"
        />
      </div>
    );
  }

  const { store, stats, subscription, orders, users } = response.data;

  // Periods come sorted by period_start DESC — [0] is the latest.
  const currentPeriod = subscription.periods[0];

  // The accordion is a worklist, not a log — only orders that still need
  // fulfilling or paying. The full history lives in the manage-orders modal.
  const pendingOrders = orders.filter((order) => isPendingOrder(order));

  const details = [
    {
      label: t("features.admin.companies.form.category"),
      // defaultValue guards legacy free-text categories (pre-constants data)
      // from rendering as a raw translation path.
      value: store.category
        ? t(`constants.companyCategories.${store.category}`, {
            defaultValue: store.category,
          })
        : "—",
    },
    {
      label: t("features.admin.companies.form.email"),
      value: store.email || "—",
    },
    {
      label: t("features.admin.companies.form.phone"),
      value: store.phone || "—",
    },
    {
      label: t("features.admin.companies.form.vatId"),
      value: store.vat_id || "—",
    },
    {
      label: t("features.admin.companies.list.status"),
      value: (
        <Badge variant={STATUS_VARIANTS[store.status]}>
          {t(`features.admin.companies.list.${store.status}`)}
        </Badge>
      ),
    },
    {
      label: t("features.admin.companies.list.createdAt"),
      value: formatDate(store.created_at),
    },
  ];

  const subscriptionDetails = [
    {
      label: t("features.admin.subscriptions.currentPeriod"),
      value: currentPeriod
        ? `${formatDate(currentPeriod.period_start)} – ${formatDate(currentPeriod.period_end)}`
        : t("features.admin.subscriptions.noPeriods"),
    },
    ...(currentPeriod
      ? [
          {
            label: t("features.admin.subscriptions.status"),
            value: <PeriodStatusBadge period={currentPeriod} />,
          },
          {
            label: t("features.admin.subscriptions.amount"),
            value: formatCurrency(currentPeriod.amount),
          },
        ]
      : []),
    {
      label: t("features.admin.subscriptions.renewsAt"),
      value: store.plan_renews_at ? formatDate(store.plan_renews_at) : "—",
    },
    {
      label: t("features.admin.companies.form.isFoundingMember"),
      value: store.is_founding_member
        ? t("features.admin.companies.form.foundingMemberYes")
        : t("features.admin.companies.form.foundingMemberNo"),
    },
  ];

  return (
    <div className="c-admin-company-view">
      <div className="c-admin-stats-grid c-admin-stats-grid--2">
        <Stat
          label={t("features.admin.companies.view.vallles")}
          value={stats.vallle_count}
        />
        <Stat
          label={t("features.admin.companies.view.totalSales")}
          value={formatCurrency(stats.total_vallle_amount)}
        />
        <Stat
          label={t("features.admin.companies.view.plan")}
          value={t(`constants.plans.${store.plan}`)}
        />
        <Stat
          label={t("features.admin.companies.view.outstanding")}
          value={formatCurrency(stats.unpaid_subscription)}
        />
      </div>

      <DefinitionList className="c-admin-detail-list" items={details} />

      <div className="c-admin-subscriptions-detail">
        <Accordion title={t("features.admin.companies.view.subscription")}>
          <DefinitionList
            className="c-admin-detail-list"
            items={subscriptionDetails}
          />
          <div className="c-admin-subscriptions-detail__actions c-admin-subscriptions-detail__actions--block">
            <Button
              display="block"
              icon={IconReceiptText}
              onClick={handleManageSubscription}
            >
              {t("features.admin.subscriptions.manageSubscription")}
            </Button>
          </div>
        </Accordion>
      </div>

      <div className="c-admin-subscriptions-detail">
        <Accordion title={t("features.admin.companies.view.orders")}>
          {pendingOrders.length === 0 ? (
            <p className="c-admin-subscriptions-detail__empty">
              {t("features.admin.companies.view.ordersAllGood")}
            </p>
          ) : (
            <Table
              className="c-admin-subscriptions-detail__table"
              columns={orderColumns}
              data={pendingOrders}
              getRowKey={(order) => order.id}
              onRowClick={handleOrderClick}
            />
          )}
          <div className="c-admin-subscriptions-detail__actions c-admin-subscriptions-detail__actions--block">
            <Button
              display="block"
              icon={IconPackage}
              onClick={handleManageOrders}
            >
              {t("features.admin.companies.view.manageOrders")}
            </Button>
          </div>
        </Accordion>
      </div>

      <div className="c-admin-company-users">
        <Accordion title={t("features.admin.companies.view.users")}>
          {users.length === 0 ? (
            <p className="c-admin-company-users__empty">
              {t("features.admin.companies.view.usersEmpty")}
            </p>
          ) : (
            <ul className="c-admin-company-users__list">
              {users.map((u) => (
                <li key={u.id} className="c-admin-company-users__item">
                  <Link
                    className="c-admin-company-users__link"
                    state={{
                      backgroundLocation:
                        location.state?.backgroundLocation || location,
                    }}
                    to={adminUserPath(u.id)}
                  >
                    <div className="c-admin-company-users__row">
                      <span className="c-admin-company-users__name">
                        {u.name}
                      </span>
                      <Badge variant={USER_STATUS_VARIANTS[u.status]}>
                        {t(`features.admin.users.list.${u.status}`)}
                      </Badge>
                    </div>
                    <span className="c-admin-company-users__email">
                      {u.email}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Accordion>
      </div>
    </div>
  );
};

export default AdminCompanyView;
