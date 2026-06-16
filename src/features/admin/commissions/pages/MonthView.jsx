import { useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Badge from "@/components/Badge";
import EmptyState from "@/components/EmptyState";
import Loader from "@/components/Loader";
import Stat from "@/components/Stat";
import Table from "@/components/Table";
import { useModal } from "@/hooks/useModal";
import { useToast } from "@/hooks/useToast";
import { get, patch } from "@/services/api";
import { formatCurrency } from "@/utils/currency";

import { formatYearMonth } from "../utils";

/**
 * Component: AdminCommissionsMonthView
 * Per-vallle commission breakdown for a single store month. The whole month
 * can be marked as paid from the modal header action.
 * @component
 * @returns {JSX.Element}
 */
const AdminCommissionsMonthView = () => {
  // Hooks
  const { t } = useTranslation();
  const { storeId, yearMonth } = useParams();
  const navigate = useNavigate();
  const { setHeader } = useModal();
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  // Queries
  const {
    data: response,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["admin", "commissions", storeId, yearMonth],
    queryFn: ({ signal }) =>
      get(`/api/admin/commissions/${storeId}/${yearMonth}`, { signal }),
  });

  const data = response?.data;

  // Mutations
  const markPaid = useMutation({
    mutationFn: () => patch(`/api/admin/commissions/${storeId}/${yearMonth}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "commissions"] });
      addToast(t("features.admin.commissions.markPaidSuccess"), "success");
      // Return to the store's month list, which now reflects the paid month.
      navigate(-1);
    },
    onError: () => {
      addToast(t("features.admin.commissions.error.generic"), "error");
    },
  });

  // Derived State
  const columns = useMemo(
    () => [
      {
        key: "vallle_code",
        header: t("features.admin.commissions.vallle"),
        className: "c-table__cell--text-highlight",
      },
      {
        key: "vallle_buyer",
        header: t("features.admin.commissions.buyer"),
        hideOnMobile: true,
        render: (commission) => commission.vallle_buyer || "—",
      },
      {
        key: "vallle_amount",
        header: t("features.admin.commissions.vallleValue"),
        align: "right",
        hideOnMobile: true,
        render: (commission) => formatCurrency(commission.vallle_amount),
      },
      {
        key: "commission_amount",
        header: t("features.admin.commissions.totalCommission"),
        align: "right",
        render: (commission) => formatCurrency(commission.commission_amount),
      },
      {
        key: "status",
        header: t("features.admin.commissions.status"),
        render: (commission) =>
          commission.paid_at ? (
            <Badge variant="success">
              {t("features.admin.commissions.paid")}
            </Badge>
          ) : (
            <Badge variant="warning">
              {t("features.admin.commissions.unpaid")}
            </Badge>
          ),
      },
    ],
    [t],
  );

  // Handlers
  const handleMarkPaid = useCallback(() => {
    markPaid.mutate();
  }, [markPaid]);

  // Effects
  useEffect(() => {
    if (!data) return;

    const actions =
      data.summary.unpaid_count > 0
        ? [
            {
              label: t("features.admin.commissions.markPaid"),
              onClick: handleMarkPaid,
              skin: "primary",
              isProcessing: markPaid.isPending,
            },
          ]
        : [];

    setHeader({
      title: formatYearMonth(data.year_month),
      description: data.store.name,
      actions,
    });

    return () => setHeader();
  }, [data, setHeader, t, handleMarkPaid, markPaid.isPending]);

  // Render
  if (isPending) {
    return (
      <div className="c-page-state">
        <Loader />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="c-page-state">
        <EmptyState
          description={t("common.error")}
          hideImageOnMobile
          image="commissions--error"
        />
      </div>
    );
  }

  const { summary, commissions } = data;

  return (
    <div className="c-admin-commissions-detail">
      <div className="c-admin-stats-grid c-admin-stats-grid--2">
        <Stat
          label={t("features.admin.commissions.totalCommission")}
          value={formatCurrency(summary.total_commission)}
        />
        <Stat
          label={t("features.admin.commissions.outstanding")}
          value={formatCurrency(summary.unpaid_amount)}
        />
      </div>

      <Table
        className="c-admin-commissions-detail__table"
        columns={columns}
        data={commissions}
        getRowClassName={(commission) =>
          commission.paid_at ? "c-admin-commissions-detail__row--paid" : ""
        }
      />
    </div>
  );
};

export default AdminCommissionsMonthView;
