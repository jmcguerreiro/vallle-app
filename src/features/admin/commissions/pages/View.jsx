import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Badge from "@/components/Badge";
import Button from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import Loader from "@/components/Loader";
import Stat from "@/components/Stat";
import { useModal } from "@/hooks/useModal";
import { useToast } from "@/hooks/useToast";
import { get, patch } from "@/services/api";
import { formatCurrency } from "@/utils/currency";

/**
 * Formats a YYYY-MM string into a human-readable month label.
 * @param {string} yearMonth - e.g. "2026-03"
 * @returns {string} e.g. "March 2026"
 */
function formatYearMonth(yearMonth) {
  const [year, month] = yearMonth.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

/**
 * Component: AdminCommissionsView
 * Shows a company's monthly commission breakdown.
 * Allows marking entire months as paid in one click.
 * @component
 * @returns {JSX.Element}
 */
const AdminCommissionsView = () => {
  // Hooks
  const { t } = useTranslation();
  const { storeId } = useParams();
  const { setHeader } = useModal();
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  // Queries
  const {
    data: response,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["admin", "commissions", storeId],
    queryFn: ({ signal }) =>
      get(`/api/admin/commissions/${storeId}`, { signal }),
  });

  const data = response?.data;

  // Mutations
  const markPaid = useMutation({
    mutationFn: (yearMonth) =>
      patch(`/api/admin/commissions/${storeId}/${yearMonth}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "commissions"] });
      addToast(t("features.admin.commissions.markPaidSuccess"), "success");
    },
    onError: () => {
      addToast(t("features.admin.commissions.error.generic"), "error");
    },
  });

  // Derived State

  // Handlers
  const handleMarkMonthPaid = useCallback(
    (yearMonth) => {
      markPaid.mutate(yearMonth);
    },
    [markPaid],
  );

  // Effects
  useEffect(() => {
    if (data?.store) {
      setHeader({
        title: data.store.name,
        description: t("features.admin.commissions.companyDetailDescription"),
      });
    }
    return () => setHeader();
  }, [data, setHeader, t]);

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

  const { summary, months } = data;

  return (
    <div className="c-admin-commissions-detail">
      <div className="c-admin-stats-grid c-admin-stats-grid--3">
        <Stat
          label={t("features.admin.commissions.totalCommission")}
          value={formatCurrency(summary.total_commission)}
        />
        <Stat
          label={t("features.admin.commissions.totalPaid")}
          value={formatCurrency(summary.total_paid)}
        />
        <Stat
          label={t("features.admin.commissions.outstanding")}
          value={formatCurrency(summary.total_unpaid)}
        />
      </div>

      {months.length === 0 ? (
        <p className="c-admin-commissions-detail__empty">
          {t("features.admin.commissions.noMonths")}
        </p>
      ) : (
        <table className="c-admin-table">
          <thead>
            <tr>
              <th>{t("features.admin.commissions.month")}</th>
              <th>{t("features.admin.commissions.commissions")}</th>
              <th>{t("features.admin.commissions.amount")}</th>
              <th>{t("features.admin.commissions.status")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {months.map((month) => {
              const isPaid = month.unpaid_count === 0;
              return (
                <tr
                  key={month.year_month}
                  className={isPaid ? "c-admin-table__row--paid" : ""}
                >
                  <td>{formatYearMonth(month.year_month)}</td>
                  <td>{month.commission_count}</td>
                  <td>{formatCurrency(month.total_commission)}</td>
                  <td>
                    {isPaid ? (
                      <Badge variant="success">
                        {t("features.admin.commissions.paid")}
                      </Badge>
                    ) : (
                      <Badge variant="warning">
                        {t("features.admin.commissions.unpaid")} (
                        {month.unpaid_count})
                      </Badge>
                    )}
                  </td>
                  <td className="c-admin-table__actions">
                    {!isPaid && (
                      <Button
                        isProcessing={
                          markPaid.isPending &&
                          markPaid.variables === month.year_month
                        }
                        onClick={() => handleMarkMonthPaid(month.year_month)}
                        skin="ghost"
                      >
                        {t("features.admin.commissions.markPaid")}
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminCommissionsView;
