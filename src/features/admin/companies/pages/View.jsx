import { useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Accordion from "@/components/Accordion";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import DefinitionList from "@/components/DefinitionList";
import EmptyState from "@/components/EmptyState";
import Loader from "@/components/Loader";
import Stat from "@/components/Stat";
import Table from "@/components/Table";
import { adminCompanyEditPath, adminUserPath } from "@/constants/routes";
import { useConfirm } from "@/hooks/useConfirm";
import { useModal } from "@/hooks/useModal";
import { useToast } from "@/hooks/useToast";
import { get, patch } from "@/services/api";
import { formatCurrency } from "@/utils/currency";
import { formatDate } from "@/utils/dates";

/**
 * Maps company status values to Badge variants. Statuses without a
 * mapping render with the neutral base style.
 */
const STATUS_VARIANTS = {
  active: "success",
  suspended: "warning",
};

/**
 * Maps user status values to Badge variants (used in the company's user list).
 */
const USER_STATUS_VARIANTS = {
  active: "success",
};

/**
 * Component: AdminCompanyView
 * Displays all details for a single company: headline stats, company details,
 * a subscription accordion (plan, usage, billing periods with mark-as-paid),
 * and the company's users.
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
  const { confirm } = useConfirm();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const {
    data: response,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["admin", "companies", id],
    queryFn: ({ signal }) => get(`/api/admin/companies/${id}`, { signal }),
  });

  // Mutations
  const markPaid = useMutation({
    mutationFn: (periodId) =>
      patch(`/api/admin/subscriptions/periods/${periodId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "companies"] });
      addToast(t("features.admin.subscriptions.markPaidSuccess"), "success");
    },
    onError: () => {
      addToast(t("features.admin.subscriptions.error.markPaid"), "error");
    },
  });

  // Handlers
  const handleEdit = useCallback(() => {
    const backgroundLocation = location.state?.backgroundLocation || location;
    navigate(adminCompanyEditPath(id), { state: { backgroundLocation } });
  }, [id, navigate, location]);

  const handleMarkPaid = useCallback(
    async (periodId) => {
      const confirmed = await confirm({
        title: t("features.admin.subscriptions.markPaidConfirm.title"),
        message: t("features.admin.subscriptions.markPaidConfirm.message"),
        confirmLabel: t("features.admin.subscriptions.markPaid"),
      });
      if (!confirmed) return;
      markPaid.mutate(periodId);
    },
    [confirm, t, markPaid],
  );

  // Derived State
  const periodColumns = useMemo(
    () => [
      {
        key: "period",
        header: t("features.admin.subscriptions.period"),
        render: (period) =>
          `${formatDate(period.period_start)} – ${formatDate(period.period_end)}`,
      },
      {
        key: "plan",
        header: t("features.admin.subscriptions.plan"),
        render: (period) => t(`constants.plans.${period.plan}`),
      },
      {
        key: "vallles_sold",
        header: t("features.admin.subscriptions.valllesSold"),
      },
      {
        key: "amount",
        header: t("features.admin.subscriptions.amount"),
        align: "right",
        render: (period) => formatCurrency(period.amount),
      },
      {
        key: "status",
        header: t("features.admin.subscriptions.status"),
        render: (period) =>
          period.paid_at ? (
            <Badge variant="success">
              {t("features.admin.subscriptions.paid")}
            </Badge>
          ) : (
            <Badge variant="warning">
              {t("features.admin.subscriptions.unpaid")}
            </Badge>
          ),
      },
      {
        key: "action",
        header: "",
        align: "right",
        render: (period) =>
          period.paid_at ? null : (
            <Button
              disabled={markPaid.isPending}
              onClick={() => handleMarkPaid(period.id)}
              type="button"
            >
              {t("features.admin.subscriptions.markPaid")}
            </Button>
          ),
      },
    ],
    [t, handleMarkPaid, markPaid.isPending],
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

  const { store, stats, subscription, users } = response.data;

  const details = [
    {
      label: t("features.admin.companies.form.category"),
      value: store.category
        ? t(`constants.companyCategories.${store.category}`)
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
      label: t("features.admin.subscriptions.renewsAt"),
      value: store.plan_renews_at ? formatDate(store.plan_renews_at) : "—",
    },
    {
      label: t("features.admin.subscriptions.valllesPeriod"),
      value: subscription.vallles_period,
    },
    {
      label: t("features.admin.subscriptions.suggestedPlan"),
      value: t(`constants.plans.${subscription.suggested_plan}`),
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
          {subscription.periods.length === 0 ? (
            <p className="c-admin-subscriptions-detail__empty">
              {t("features.admin.subscriptions.noPeriods")}
            </p>
          ) : (
            <Table
              className="c-admin-subscriptions-detail__table"
              columns={periodColumns}
              data={subscription.periods}
              getRowClassName={(period) =>
                period.paid_at ? "c-admin-subscriptions-detail__row--paid" : ""
              }
              getRowKey={(period) => period.id}
            />
          )}
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
