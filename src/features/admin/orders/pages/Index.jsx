import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import Badge from "@/components/Badge";
import Datatable from "@/components/Datatable";
import EmptyState from "@/components/EmptyState";
import FilterSelect from "@/components/forms/FilterSelect";
import Loader from "@/components/Loader";
import { ORDER_STATUSES, ORDER_TYPES } from "@/constants/orders";
import { ROUTES, adminOrderPath } from "@/constants/routes";
import { useMain } from "@/hooks/useMain";
import { get } from "@/services/api";
import { formatCurrency } from "@/utils/currency";
import { formatDate } from "@/utils/dates";
import { IconPlus } from "@/utils/icons";

import OrderPaymentBadge from "../components/OrderPaymentBadge";
import { ORDER_STATUS_VARIANTS } from "../utils";

/**
 * Component: AdminOrdersIndex
 * Lists all fulfilment orders (welcome packs and refills) for the super
 * admin. Each row links to the order view modal. Pagination, search (store
 * name), sorting, and the status/type/payment filters are server-side.
 * @component
 * @returns {JSX.Element}
 */
const AdminOrdersIndex = () => {
  // Constants
  const FILTER_ALL = "all";
  const PAGE_SIZE = 20;

  // Hooks
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { setHeader } = useMain();

  // State
  const [statusFilter, setStatusFilter] = useState(FILTER_ALL);
  const [typeFilter, setTypeFilter] = useState(FILTER_ALL);
  const [paymentFilter, setPaymentFilter] = useState(FILTER_ALL);
  const [pageIndex, setPageIndex] = useState(0);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ id: "requested_at", desc: true });

  // Queries
  const {
    data: response,
    isPending,
    isError,
  } = useQuery({
    queryKey: [
      "admin",
      "orders",
      {
        page: pageIndex,
        pageSize: PAGE_SIZE,
        status: statusFilter,
        type: typeFilter,
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
      if (statusFilter !== FILTER_ALL) params.set("status", statusFilter);
      if (typeFilter !== FILTER_ALL) params.set("type", typeFilter);
      if (paymentFilter !== FILTER_ALL) params.set("payment", paymentFilter);
      if (search) params.set("search", search);
      return get(`/api/admin/orders?${params.toString()}`, { signal });
    },
    placeholderData: keepPreviousData,
  });

  const totalCount = response?.meta?.total ?? 0;

  // Derived State
  const orders = useMemo(() => response?.data ?? [], [response]);

  const columns = useMemo(
    () => [
      {
        accessorKey: "store_name",
        header: t("features.admin.orders.list.company"),
        meta: { tdClassName: "c-datatable__td--text-highlight" },
      },
      {
        accessorKey: "type",
        header: t("features.admin.orders.list.type"),
        cell: ({ getValue }) => t(`constants.orderTypes.${getValue()}`),
        meta: { hideOnMobile: true },
      },
      {
        accessorKey: "amount",
        header: t("features.admin.orders.list.amount"),
        cell: ({ getValue }) => formatCurrency(getValue()),
        meta: { hideOnMobile: true },
      },
      {
        accessorKey: "paid_at",
        header: t("features.admin.orders.list.payment"),
        enableSorting: false,
        cell: ({ row }) => <OrderPaymentBadge order={row.original} />,
        meta: { hideOnMobile: true },
      },
      {
        accessorKey: "status",
        header: t("features.admin.orders.list.status"),
        cell: ({ getValue }) => {
          const status = getValue();
          return (
            <Badge variant={ORDER_STATUS_VARIANTS[status]}>
              {t(`constants.orderStatuses.${status}`)}
            </Badge>
          );
        },
      },
      {
        accessorKey: "requested_at",
        header: t("features.admin.orders.list.requestedAt"),
        cell: ({ getValue }) => formatDate(getValue()),
        meta: { hideOnMobile: true },
      },
    ],
    [t],
  );

  // Handlers
  const handleRowClick = useCallback(
    (row) => {
      navigate(adminOrderPath(row.id), {
        state: { backgroundLocation: location },
      });
    },
    [navigate, location],
  );

  const handleCreate = useCallback(() => {
    navigate(ROUTES.ADMIN_ORDERS_MODAL_CREATE, {
      state: { backgroundLocation: location },
    });
  }, [navigate, location]);

  const handleStatusFilter = useCallback((event) => {
    setStatusFilter(event.target.value);
    setPageIndex(0);
  }, []);

  const handleTypeFilter = useCallback((event) => {
    setTypeFilter(event.target.value);
    setPageIndex(0);
  }, []);

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
      title: t("features.admin.orders.heading"),
      description: t("features.admin.orders.description"),
      image: "companies",
    });
    return () => setHeader();
  }, [setHeader, t]);

  // Render
  if (isPending) {
    return (
      <div className="p-admin-orders">
        <div className="p-admin-orders__loading">
          <Loader />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-admin-orders">
        <div className="p-admin-orders__error">
          <EmptyState
            description={t("common.error")}
            hideImageOnMobile
            image="companies--error"
          />
        </div>
      </div>
    );
  }

  const orderFilters = (
    <>
      <FilterSelect
        ariaLabel={t("common.filters.allStatuses")}
        onChange={handleStatusFilter}
        options={[
          { value: FILTER_ALL, label: t("common.filters.allStatuses") },
          ...Object.values(ORDER_STATUSES).map((status) => ({
            value: status,
            label: t(`constants.orderStatuses.${status}`),
          })),
        ]}
        value={statusFilter}
      />
      <FilterSelect
        ariaLabel={t("features.admin.orders.list.allTypes")}
        onChange={handleTypeFilter}
        options={[
          {
            value: FILTER_ALL,
            label: t("features.admin.orders.list.allTypes"),
          },
          ...Object.values(ORDER_TYPES).map((type) => ({
            value: type,
            label: t(`constants.orderTypes.${type}`),
          })),
        ]}
        value={typeFilter}
      />
      <FilterSelect
        ariaLabel={t("common.filters.allStatuses")}
        onChange={handlePaymentFilter}
        options={[
          { value: FILTER_ALL, label: t("common.filters.allStatuses") },
          {
            value: "pending",
            label: t("features.admin.orders.list.toInvoice"),
          },
          {
            value: "invoiced",
            label: t("features.admin.orders.list.awaitingPayment"),
          },
          { value: "paid", label: t("features.admin.orders.list.paid") },
        ]}
        value={paymentFilter}
      />
    </>
  );

  const actions = [
    {
      label: t("features.admin.orders.create.heading"),
      icon: IconPlus,
      onClick: handleCreate,
    },
  ];

  return (
    <div className="p-admin-orders">
      <Datatable
        actions={actions}
        columns={columns}
        data={orders}
        filters={orderFilters}
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

export default AdminOrdersIndex;
