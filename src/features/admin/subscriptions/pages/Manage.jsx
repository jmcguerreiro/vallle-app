import { useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Button from "@/components/Button";
import DefinitionList from "@/components/DefinitionList";
import EmptyState from "@/components/EmptyState";
import Loader from "@/components/Loader";
import Table from "@/components/Table";
import {
  adminCompanySubscriptionRenewPath,
  adminSubscriptionEditPath,
} from "@/constants/routes";
import { useConfirm } from "@/hooks/useConfirm";
import { useModal } from "@/hooks/useModal";
import { useToast } from "@/hooks/useToast";
import { get, patch } from "@/services/api";
import { formatCurrency } from "@/utils/currency";
import { formatDate } from "@/utils/dates";
import { IconRotateCcw } from "@/utils/icons";

import PeriodStatusBadge from "../components/PeriodStatusBadge";

/**
 * Component: AdminSubscriptionManage
 * A company's full billing log: the current subscription period with
 * mark-as-paid (when unpaid) and edit actions, the past periods underneath,
 * and a renew button that records the next billing year. Super admin only.
 * @component
 * @returns {JSX.Element}
 */
const AdminSubscriptionManage = () => {
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
      queryClient.invalidateQueries({ queryKey: ["admin", "subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "companies"] });
      addToast(t("features.admin.subscriptions.markPaidSuccess"), "success");
    },
    onError: () => {
      addToast(t("features.admin.subscriptions.error.markPaid"), "error");
    },
  });

  // The mutation result object is a fresh reference every render; only the
  // stable mutate function may be a hook dependency, otherwise the header
  // effect (setHeader → context update → re-render) loops forever.
  const { mutate: mark } = markPaid;

  // Handlers
  const handleMarkPaid = useCallback(
    async (periodId) => {
      const confirmed = await confirm({
        title: t("features.admin.subscriptions.markPaidConfirm.title"),
        message: t("features.admin.subscriptions.markPaidConfirm.message"),
        confirmLabel: t("features.admin.subscriptions.markPaid"),
      });
      if (!confirmed) return;
      mark(periodId);
    },
    [confirm, t, mark],
  );

  const handlePeriodClick = useCallback(
    (period) => {
      const backgroundLocation = location.state?.backgroundLocation || location;
      navigate(adminSubscriptionEditPath(period.id), {
        state: { backgroundLocation },
      });
    },
    [navigate, location],
  );

  const handleRenew = useCallback(() => {
    const backgroundLocation = location.state?.backgroundLocation || location;
    navigate(adminCompanySubscriptionRenewPath(id), {
      state: { backgroundLocation },
    });
  }, [id, navigate, location]);

  // Derived State
  const historyColumns = useMemo(
    () => [
      {
        key: "period_start",
        header: t("features.admin.subscriptions.period"),
        render: (period) =>
          `${formatDate(period.period_start)} – ${formatDate(period.period_end)}`,
      },
      {
        key: "plan",
        header: t("features.admin.subscriptions.plan"),
        render: (period) => t(`constants.plans.${period.plan}`),
        hideOnMobile: true,
      },
      {
        key: "amount",
        header: t("features.admin.subscriptions.amount"),
        align: "right",
        render: (period) => formatCurrency(period.amount),
      },
      {
        key: "paid_at",
        header: t("features.admin.subscriptions.status"),
        render: (period) => <PeriodStatusBadge period={period} />,
      },
    ],
    [t],
  );

  // Effects
  useEffect(() => {
    // Periods come sorted by period_start DESC — [0] is the latest.
    const detail = response?.data;
    const currentPeriod = detail?.subscription.periods[0];

    const actions = [];
    if (currentPeriod && !currentPeriod.paid_at) {
      actions.push({
        label: t("features.admin.subscriptions.markPaid"),
        onClick: () => handleMarkPaid(currentPeriod.id),
        skin: "primary",
        isProcessing: markPaid.isPending,
      });
    }
    if (currentPeriod) {
      actions.push({
        label: t("features.admin.subscriptions.manage.edit"),
        onClick: () => handlePeriodClick(currentPeriod),
      });
    }

    setHeader({
      title: t("features.admin.subscriptions.manage.heading"),
      description: detail?.store.name ?? "",
      actions,
    });
    return () => setHeader();
  }, [
    setHeader,
    t,
    response,
    handleMarkPaid,
    handlePeriodClick,
    markPaid.isPending,
  ]);

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

  const { periods } = response.data.subscription;
  const currentPeriod = periods[0];
  const pastPeriods = periods.slice(1);

  const currentDetails = currentPeriod
    ? [
        {
          label: t("features.admin.subscriptions.period"),
          value: `${formatDate(currentPeriod.period_start)} – ${formatDate(currentPeriod.period_end)}`,
        },
        {
          label: t("features.admin.subscriptions.plan"),
          value: t(`constants.plans.${currentPeriod.plan}`),
        },
        {
          label: t("features.admin.subscriptions.amount"),
          value: formatCurrency(currentPeriod.amount),
        },
        {
          label: t("features.admin.subscriptions.status"),
          value: <PeriodStatusBadge period={currentPeriod} />,
        },
      ]
    : [];

  return (
    <div className="c-admin-subscriptions-detail">
      {currentPeriod ? (
        <>
          <h3 className="c-admin-subscriptions-detail__section-title">
            {t("features.admin.subscriptions.currentPeriod")}
          </h3>
          <DefinitionList
            className="c-admin-detail-list"
            items={currentDetails}
          />
          <h3 className="c-admin-subscriptions-detail__section-title">
            {t("features.admin.subscriptions.manage.history")}
          </h3>
          {pastPeriods.length === 0 ? (
            <p className="c-admin-subscriptions-detail__empty">
              {t("features.admin.subscriptions.manage.historyEmpty")}
            </p>
          ) : (
            <Table
              className="c-admin-subscriptions-detail__table"
              columns={historyColumns}
              data={pastPeriods}
              getRowKey={(period) => period.id}
              onRowClick={handlePeriodClick}
            />
          )}
        </>
      ) : (
        <p className="c-admin-subscriptions-detail__empty">
          {t("features.admin.subscriptions.noPeriods")}
        </p>
      )}
      <div className="c-admin-subscriptions-detail__actions c-admin-subscriptions-detail__actions--block">
        <Button display="block" icon={IconRotateCcw} onClick={handleRenew}>
          {t("features.admin.subscriptions.manage.renew")}
        </Button>
      </div>
    </div>
  );
};

export default AdminSubscriptionManage;
