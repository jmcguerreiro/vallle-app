import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import Datatable from "@/components/Datatable";
import EmptyState from "@/components/EmptyState";
import FilterSelect from "@/components/forms/FilterSelect";
import Loader from "@/components/Loader";
import { adminCommissionsDetailPath } from "@/constants/routes";
import { useMain } from "@/hooks/useMain";
import { get } from "@/services/api";
import { formatCurrency } from "@/utils/currency";
import { formatDate } from "@/utils/dates";

/**
 * Component: AdminCommissionsIndex
 * Shows a commission overview per company — total earnings, commissions, and
 * outstanding balance. Clicking a row opens the company's monthly commission
 * detail modal. Pagination, search, sorting, and the payment filter are
 * server-side.
 * @component
 * @returns {JSX.Element}
 */
const AdminCommissionsIndex = () => {
  // Constants
  const FILTER_ALL = "all";
  const PAGE_SIZE = 20;

  // Hooks
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { setHeader } = useMain();

  // State
  const [paymentFilter, setPaymentFilter] = useState(FILTER_ALL);
  const [pageIndex, setPageIndex] = useState(0);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ id: "total_unpaid", desc: true });

  // Queries
  const {
    data: response,
    isPending,
    isError,
  } = useQuery({
    queryKey: [
      "admin",
      "commissions",
      {
        page: pageIndex,
        pageSize: PAGE_SIZE,
        payment: paymentFilter,
        search,
        sort: sort.id,
        order: sort.desc ? "desc" : "asc",
      },
    ],
    queryFn: ({ signal }) => {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(pageIndex * PAGE_SIZE),
        sort: sort.id,
        order: sort.desc ? "desc" : "asc",
      });
      if (paymentFilter !== FILTER_ALL) params.set("payment", paymentFilter);
      if (search) params.set("search", search);
      return get(`/api/admin/commissions?${params.toString()}`, { signal });
    },
    placeholderData: keepPreviousData,
  });

  const totalCount = response?.meta?.total ?? 0;

  // Derived State
  const companies = useMemo(() => response?.data ?? [], [response]);

  const columns = useMemo(
    () => [
      {
        accessorKey: "store_name",
        header: t("features.admin.commissions.company"),
        meta: { tdClassName: "c-datatable__td--text-highlight" },
      },
      {
        accessorKey: "total_vallle_amount",
        header: t("features.admin.commissions.vallleSales"),
        cell: ({ getValue }) => formatCurrency(getValue()),
        meta: { hideOnMobile: true },
      },
      {
        accessorKey: "total_commission",
        header: t("features.admin.commissions.totalCommission"),
        cell: ({ getValue }) => formatCurrency(getValue()),
      },
      {
        accessorKey: "total_paid",
        header: t("features.admin.commissions.totalPaid"),
        cell: ({ getValue }) => formatCurrency(getValue()),
        meta: { hideOnMobile: true },
      },
      {
        accessorKey: "total_unpaid",
        header: t("features.admin.commissions.outstanding"),
        cell: ({ getValue }) => {
          const amount = getValue();
          return (
            <span
              className={
                amount > 0 ? "c-admin-amount--unpaid" : "c-admin-amount--paid"
              }
            >
              {formatCurrency(amount)}
            </span>
          );
        },
      },
      {
        accessorKey: "last_paid_at",
        header: t("features.admin.commissions.lastPaid"),
        cell: ({ getValue }) => (getValue() ? formatDate(getValue()) : "—"),
        meta: { hideOnMobile: true },
      },
    ],
    [t],
  );

  // Handlers
  const handleRowClick = useCallback(
    (row) => {
      navigate(adminCommissionsDetailPath(row.store_id), {
        state: { backgroundLocation: location },
      });
    },
    [navigate, location],
  );

  const handlePaymentFilter = useCallback((event) => {
    setPaymentFilter(event.target.value);
    setPageIndex(0);
  }, []);

  const handleSearchChange = useCallback((value) => {
    setSearch(value);
    setPageIndex(0);
  }, []);

  const handlePageChange = useCallback((newPageIndex) => {
    setPageIndex(newPageIndex);
  }, []);

  const handleSortChange = useCallback((next) => {
    setSort(next);
    setPageIndex(0);
  }, []);

  // Effects
  useEffect(() => {
    setHeader({
      title: t("features.admin.commissions.heading"),
      description: t("features.admin.commissions.description"),
      image: "commissions",
    });
    return () => setHeader();
  }, [setHeader, t]);

  // Render
  if (isPending) {
    return (
      <div className="p-admin-commissions">
        <div className="p-admin-commissions__loading">
          <Loader />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-admin-commissions">
        <div className="p-admin-commissions__error">
          <EmptyState
            description={t("common.error")}
            hideImageOnMobile
            image="commissions--error"
          />
        </div>
      </div>
    );
  }

  const commissionFilters = (
    <FilterSelect
      ariaLabel={t("common.filters.allStatuses")}
      onChange={handlePaymentFilter}
      options={[
        { value: FILTER_ALL, label: t("common.filters.allStatuses") },
        { value: "unpaid", label: t("features.admin.commissions.unpaid") },
        { value: "paid", label: t("features.admin.commissions.paid") },
      ]}
      value={paymentFilter}
    />
  );

  return (
    <div className="p-admin-commissions">
      <Datatable
        columns={columns}
        data={companies}
        filters={commissionFilters}
        onRowClick={handleRowClick}
        pageSize={PAGE_SIZE}
        serverPagination={{
          total: totalCount,
          pageIndex,
          onPageChange: handlePageChange,
        }}
        serverSearch={{
          value: search,
          onChange: handleSearchChange,
        }}
        serverSort={{
          id: sort.id,
          desc: sort.desc,
          onChange: handleSortChange,
        }}
      />
    </div>
  );
};

export default AdminCommissionsIndex;
