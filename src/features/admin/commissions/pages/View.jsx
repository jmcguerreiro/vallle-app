import { useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { useQuery } from "@tanstack/react-query";

import Badge from "@/components/Badge";
import EmptyState from "@/components/EmptyState";
import Loader from "@/components/Loader";
import Stat from "@/components/Stat";
import Table from "@/components/Table";
import { adminCommissionsMonthPath } from "@/constants/routes";
import { useModal } from "@/hooks/useModal";
import { get } from "@/services/api";
import { formatCurrency } from "@/utils/currency";

import { formatYearMonth } from "../utils";

/**
 * Component: AdminCommissionsView
 * Shows a company's monthly commission breakdown. Clicking a month row opens
 * the per-vallle breakdown for that month, where the month can be marked paid.
 * @component
 * @returns {JSX.Element}
 */
const AdminCommissionsView = () => {
  // Hooks
  const { t } = useTranslation();
  const { storeId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { setHeader } = useModal();

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

  // Derived State
  const columns = useMemo(
    () => [
      {
        key: "year_month",
        header: t("features.admin.commissions.month"),
        render: (month) => formatYearMonth(month.year_month),
      },
      {
        key: "commission_count",
        header: t("features.admin.commissions.commissions"),
      },
      {
        key: "total_commission",
        header: t("features.admin.commissions.amount"),
        render: (month) => formatCurrency(month.total_commission),
      },
      {
        key: "status",
        header: t("features.admin.commissions.status"),
        render: (month) =>
          month.unpaid_count === 0 ? (
            <Badge variant="success">
              {t("features.admin.commissions.paid")}
            </Badge>
          ) : (
            <Badge variant="warning">
              {t("features.admin.commissions.unpaid")} ({month.unpaid_count})
            </Badge>
          ),
      },
    ],
    [t],
  );

  // Handlers
  const handleRowClick = useCallback(
    (month) => {
      navigate(adminCommissionsMonthPath(storeId, month.year_month), {
        state: { backgroundLocation: location },
      });
    },
    [navigate, storeId, location],
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
        <Table
          className="c-admin-commissions-detail__table"
          columns={columns}
          data={months}
          getRowClassName={(month) =>
            month.unpaid_count === 0
              ? "c-admin-commissions-detail__row--paid"
              : ""
          }
          getRowKey={(month) => month.year_month}
          onRowClick={handleRowClick}
        />
      )}
    </div>
  );
};

export default AdminCommissionsView;
