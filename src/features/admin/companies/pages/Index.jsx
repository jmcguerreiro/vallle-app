import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import Badge from "@/components/Badge";
import Datatable from "@/components/Datatable";
import EmptyState from "@/components/EmptyState";
import FilterSelect from "@/components/forms/FilterSelect";
import Loader from "@/components/Loader";
import { COMPANY_CATEGORIES } from "@/constants/company-categories";
import { COMPANY_STATUSES } from "@/constants/company-statuses";
import { ROUTES, adminCompanyPath } from "@/constants/routes";
import { useMain } from "@/hooks/useMain";
import { get } from "@/services/api";
import { formatCurrency } from "@/utils/currency";
import { formatDateTime } from "@/utils/dates";
import { IconPlus } from "@/utils/icons";

/**
 * Maps company status values to Badge variants. Statuses without a
 * mapping render with the neutral base style.
 */
const STATUS_VARIANTS = {
  active: "success",
  suspended: "warning",
};

/**
 * Component: AdminCompaniesIndex
 * Lists all companies (stores) for the super admin. Each row links to the
 * company view modal. Pagination, search, sorting, and the status/category
 * filters are server-side.
 * @component
 * @returns {JSX.Element}
 */
const AdminCompaniesIndex = () => {
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
  const [categoryFilter, setCategoryFilter] = useState(FILTER_ALL);
  const [paymentFilter, setPaymentFilter] = useState(FILTER_ALL);
  const [pageIndex, setPageIndex] = useState(0);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ id: "name", desc: false });

  // Queries
  const {
    data: response,
    isPending,
    isError,
  } = useQuery({
    queryKey: [
      "admin",
      "companies",
      {
        page: pageIndex,
        pageSize: PAGE_SIZE,
        status: statusFilter,
        category: categoryFilter,
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
      if (categoryFilter !== FILTER_ALL) params.set("category", categoryFilter);
      if (paymentFilter !== FILTER_ALL) params.set("payment", paymentFilter);
      if (search) params.set("search", search);
      return get(`/api/admin/companies?${params.toString()}`, { signal });
    },
    placeholderData: keepPreviousData,
  });

  const totalCount = response?.meta?.total ?? 0;

  // Derived State
  const companies = useMemo(() => response?.data ?? [], [response]);

  const columns = useMemo(
    () => [
      {
        accessorKey: "name",
        header: t("features.admin.companies.list.name"),
        meta: { tdClassName: "c-datatable__td--text-highlight" },
      },
      {
        accessorKey: "category",
        header: t("features.admin.companies.list.category"),
        cell: ({ getValue }) => getValue() || "—",
        meta: { hideOnMobile: true },
      },
      {
        accessorKey: "vallle_count",
        header: t("features.admin.companies.list.vallles"),
        meta: { hideOnMobile: true },
      },
      {
        accessorKey: "total_revenue",
        header: t("features.admin.companies.list.revenue"),
        cell: ({ getValue }) => formatCurrency(getValue()),
        meta: { hideOnMobile: true },
      },
      {
        accessorKey: "plan",
        header: t("features.admin.companies.list.plan"),
        cell: ({ getValue }) => <Badge>{t(`constants.plans.${getValue()}`)}</Badge>,
        meta: { hideOnMobile: true },
      },
      {
        accessorKey: "total_unpaid",
        header: t("features.admin.companies.list.outstanding"),
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
        meta: { hideOnMobile: true },
      },
      {
        accessorKey: "status",
        header: t("features.admin.companies.list.status"),
        enableSorting: false,
        cell: ({ getValue }) => {
          const status = getValue();
          return (
            <Badge variant={STATUS_VARIANTS[status]}>
              {t(`features.admin.companies.list.${status}`)}
            </Badge>
          );
        },
      },
      {
        accessorKey: "updated_at",
        header: t("features.admin.companies.list.updatedAt"),
        cell: ({ getValue }) => formatDateTime(getValue()),
        meta: { hideOnMobile: true },
      },
    ],
    [t],
  );

  // Handlers
  const handleRowClick = useCallback(
    (row) => {
      navigate(adminCompanyPath(row.id), {
        state: { backgroundLocation: location },
      });
    },
    [navigate, location],
  );

  const handleCreate = useCallback(() => {
    navigate(ROUTES.ADMIN_COMPANIES_MODAL_CREATE, {
      state: { backgroundLocation: location },
    });
  }, [navigate, location]);

  const handleStatusFilter = useCallback((event) => {
    setStatusFilter(event.target.value);
    setPageIndex(0);
  }, []);

  const handleCategoryFilter = useCallback((event) => {
    setCategoryFilter(event.target.value);
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
      title: t("features.admin.companies.heading"),
      description: t("features.admin.companies.description"),
      image: "companies",
    });
    return () => setHeader();
  }, [setHeader, t]);

  // Render
  if (isPending) {
    return (
      <div className="p-admin-companies">
        <div className="p-admin-companies__loading">
          <Loader />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-admin-companies">
        <div className="p-admin-companies__error">
          <EmptyState
            description={t("common.error")}
            hideImageOnMobile
            image="companies--error"
          />
        </div>
      </div>
    );
  }

  const companyFilters = (
    <>
      <FilterSelect
        ariaLabel={t("common.filters.allStatuses")}
        onChange={handleStatusFilter}
        options={[
          { value: FILTER_ALL, label: t("common.filters.allStatuses") },
          {
            value: COMPANY_STATUSES.ACTIVE,
            label: t("features.admin.companies.list.active"),
          },
          {
            value: COMPANY_STATUSES.SUSPENDED,
            label: t("features.admin.companies.list.suspended"),
          },
          {
            value: COMPANY_STATUSES.INACTIVE,
            label: t("features.admin.companies.list.inactive"),
          },
        ]}
        value={statusFilter}
      />
      <FilterSelect
        ariaLabel={t("common.filters.allCategories")}
        onChange={handleCategoryFilter}
        options={[
          { value: FILTER_ALL, label: t("common.filters.allCategories") },
          ...COMPANY_CATEGORIES.map((key) => ({
            value: key,
            label: t(`constants.companyCategories.${key}`),
          })),
        ]}
        value={categoryFilter}
      />
      <FilterSelect
        ariaLabel={t("common.filters.allStatuses")}
        onChange={handlePaymentFilter}
        options={[
          { value: FILTER_ALL, label: t("common.filters.allStatuses") },
          { value: "unpaid", label: t("features.admin.companies.list.unpaid") },
          { value: "paid", label: t("features.admin.companies.list.paid") },
        ]}
        value={paymentFilter}
      />
    </>
  );

  const actions = [
    {
      label: t("features.admin.companies.create.heading"),
      icon: IconPlus,
      onClick: handleCreate,
    },
  ];

  return (
    <div className="p-admin-companies">
      <Datatable
        actions={actions}
        columns={columns}
        data={companies}
        filters={companyFilters}
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

export default AdminCompaniesIndex;
