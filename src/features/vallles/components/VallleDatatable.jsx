import { useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import Badge from "@/components/Badge";
import Datatable from "@/components/Datatable";
import { valllePath } from "@/constants/routes";
import { formatCurrency } from "@/utils/currency";
import { formatDate } from "@/utils/dates";

/**
 * Maps vallle status values to i18n keys.
 */
const STATUS_KEYS = {
  active: "features.vallles.list.active",
  used: "features.vallles.list.used",
  expired: "features.vallles.list.expired",
};

/**
 * Maps vallle status values to Badge variants. Statuses without a
 * mapping render with the neutral base style.
 */
const STATUS_VARIANTS = {
  active: "success",
  expired: "danger",
};

/**
 * Component: VallleDatatable
 * Renders a datatable of vallles. Clicking a row opens the vallle detail
 * modal where actions like redeem live. Secondary columns (balance, dates)
 * are hidden on mobile to keep the table compact.
 * @component
 * @param {Object} props
 * @param {Array} props.vallles - Array of vallle objects from the API
 * @param {React.ReactNode} [props.filters] - Optional filter controls
 * @param {Array} [props.actions] - Optional action buttons rendered in the toolbar (see Datatable)
 * @param {number} [props.pageSize] - Rows per page
 * @param {Object} [props.serverPagination] - Server-side pagination config
 * @param {Object} [props.serverSearch] - Server-side search config (see Datatable)
 * @param {Object} [props.serverSort] - Server-side sort config (see Datatable)
 * @returns {JSX.Element}
 */
const VallleDatatable = ({
  vallles,
  filters,
  actions,
  pageSize,
  serverPagination,
  serverSearch,
  serverSort,
}) => {
  // Hooks
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // Derived State
  const columns = useMemo(
    () => [
      {
        accessorKey: "code",
        header: t("features.vallles.list.code"),
        meta: { tdClassName: "c-datatable__td--text-highlight" },
      },
      {
        accessorKey: "buyer",
        header: t("features.vallles.list.buyer"),
        cell: ({ getValue }) => getValue() || "—",
        meta: { hideOnMobile: true },
      },
      {
        accessorKey: "amount",
        header: t("features.vallles.list.amount"),
        cell: ({ getValue }) => formatCurrency(getValue()),
      },
      {
        accessorKey: "balance",
        header: t("features.vallles.list.balance"),
        cell: ({ getValue }) => formatCurrency(getValue()),
        meta: { hideOnMobile: true },
      },
      {
        accessorKey: "status",
        header: t("features.vallles.list.status"),
        enableSorting: false,
        cell: ({ getValue }) => {
          const status = getValue();
          return (
            <Badge variant={STATUS_VARIANTS[status]}>
              {t(STATUS_KEYS[status])}
            </Badge>
          );
        },
      },
      {
        accessorKey: "created_at",
        header: t("features.vallles.list.createdAt"),
        cell: ({ getValue }) => formatDate(getValue()),
        meta: { hideOnMobile: true },
      },
      {
        accessorKey: "expires_at",
        header: t("features.vallles.list.expiresAt"),
        cell: ({ getValue }) => formatDate(getValue()),
        meta: { hideOnMobile: true },
      },
    ],
    [t],
  );

  // Handlers
  const handleRowClick = useCallback(
    (vallle) => {
      navigate(valllePath(vallle.id), {
        state: { backgroundLocation: location },
      });
    },
    [navigate, location],
  );

  // Render
  return (
    <Datatable
      actions={actions}
      columns={columns}
      data={vallles}
      filters={filters}
      onRowClick={handleRowClick}
      pageSize={pageSize}
      serverPagination={serverPagination}
      serverSearch={serverSearch}
      serverSort={serverSort}
    />
  );
};

export default VallleDatatable;
