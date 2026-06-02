import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import { useQuery } from "@tanstack/react-query";

import Badge from "@/components/Badge";
import Datatable from "@/components/Datatable";
import EmptyState from "@/components/EmptyState";
import FilterSelect from "@/components/forms/FilterSelect";
import Loader from "@/components/Loader";
import { COMPANY_CATEGORIES } from "@/constants/company-categories";
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
 * Maps commission payment states to Badge variants.
 */
const COMMISSION_VARIANTS = {
  paid: "success",
  unpaid: "warning",
};

/**
 * Component: AdminCompaniesIndex
 * Lists all companies (stores) for the super admin.
 * Each row links to the company view modal.
 * @component
 * @returns {JSX.Element}
 */
const AdminCompaniesIndex = () => {
  // Hooks
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { setHeader } = useMain();

  // State
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Queries
  const {
    data: response,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["admin", "companies"],
    queryFn: ({ signal }) => get("/api/admin/companies", { signal }),
  });

  const companies = useMemo(() => response?.data ?? [], [response]);

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
  }, []);

  const handleCategoryFilter = useCallback((event) => {
    setCategoryFilter(event.target.value);
  }, []);

  // Derived State
  const filteredCompanies = useMemo(() => {
    let result = companies;
    if (statusFilter !== "all") {
      result = result.filter((c) => c.status === statusFilter);
    }
    if (categoryFilter !== "all") {
      result = result.filter((c) => c.category === categoryFilter);
    }
    return result;
  }, [companies, statusFilter, categoryFilter]);

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
        accessorKey: "total_commission",
        header: t("features.admin.companies.list.commission"),
        cell: ({ getValue }) => formatCurrency(getValue()),
        meta: { hideOnMobile: true },
      },
      {
        accessorKey: "unpaid_commission",
        header: t("features.admin.companies.list.commissionStatus"),
        enableSorting: false,
        cell: ({ getValue }) => {
          const status = getValue() > 0 ? "unpaid" : "paid";
          return (
            <Badge variant={COMMISSION_VARIANTS[status]}>
              {t(`features.admin.companies.list.${status}`)}
            </Badge>
          );
        },
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
          { value: "all", label: t("common.filters.allStatuses") },
          { value: "active", label: t("features.admin.companies.list.active") },
          {
            value: "suspended",
            label: t("features.admin.companies.list.suspended"),
          },
          {
            value: "inactive",
            label: t("features.admin.companies.list.inactive"),
          },
        ]}
        value={statusFilter}
      />
      <FilterSelect
        ariaLabel={t("common.filters.allCategories")}
        onChange={handleCategoryFilter}
        options={[
          { value: "all", label: t("common.filters.allCategories") },
          ...COMPANY_CATEGORIES.map((key) => ({
            value: key,
            label: t(`constants.companyCategories.${key}`),
          })),
        ]}
        value={categoryFilter}
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
        data={filteredCompanies}
        filters={companyFilters}
        onRowClick={handleRowClick}
      />
    </div>
  );
};

export default AdminCompaniesIndex;
