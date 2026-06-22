import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import Badge from "@/components/Badge";
import Datatable from "@/components/Datatable";
import EmptyState from "@/components/EmptyState";
import FilterSelect from "@/components/forms/FilterSelect";
import Loader from "@/components/Loader";
import {
  settingsUserCreatePath,
  settingsUserEditPath,
} from "@/constants/routes";
import { USER_STATUSES } from "@/constants/user-statuses";
import { get } from "@/services/api";
import { formatDateTime } from "@/utils/dates";
import { IconUserPlus } from "@/utils/icons";

/**
 * Maps store-membership status values to Badge variants. Statuses without a
 * mapping render with the neutral base style.
 */
const STATUS_VARIANTS = {
  active: "success",
};

/**
 * Component: CompanyUserList
 * Lists users belonging to the active store. Allows admins to create and edit
 * users. Pagination, search, sorting, and the status filter are server-side.
 * @component
 * @returns {JSX.Element}
 */
const CompanyUserList = () => {
  // Constants
  const STATUS_ALL = "all";
  const PAGE_SIZE = 20;

  // Hooks
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // State
  const [statusFilter, setStatusFilter] = useState(STATUS_ALL);
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
      "company",
      "users",
      {
        page: pageIndex,
        pageSize: PAGE_SIZE,
        status: statusFilter,
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
      if (statusFilter !== STATUS_ALL) params.set("status", statusFilter);
      if (search) params.set("search", search);
      return get(`/api/company/users?${params.toString()}`, { signal });
    },
    placeholderData: keepPreviousData,
  });

  const totalCount = response?.meta?.total ?? 0;

  // Derived State
  const users = useMemo(() => response?.data ?? [], [response]);

  const columns = useMemo(
    () => [
      {
        accessorKey: "name",
        header: t("features.company.users.list.name"),
        meta: { tdClassName: "c-datatable__td--text-highlight" },
      },
      {
        accessorKey: "email",
        header: t("features.company.users.list.email"),
        meta: { hideOnMobile: true },
      },
      {
        accessorKey: "role",
        header: t("features.company.users.list.role"),
        enableSorting: false,
        cell: ({ getValue }) => (
          <Badge>{t(`roles.${getValue()}`)}</Badge>
        ),
      },
      {
        accessorKey: "status",
        header: t("features.company.users.list.status"),
        enableSorting: false,
        cell: ({ getValue }) => {
          const status = getValue();
          return (
            <Badge variant={STATUS_VARIANTS[status]}>
              {t(`features.company.users.list.${status}`)}
            </Badge>
          );
        },
      },
      {
        accessorKey: "updated_at",
        header: t("features.company.users.list.updatedAt"),
        cell: ({ getValue }) => formatDateTime(getValue()),
        meta: { hideOnMobile: true },
      },
    ],
    [t],
  );

  // Handlers
  const handleRowClick = useCallback(
    (row) => {
      navigate(settingsUserEditPath(row.id), {
        state: { backgroundLocation: location },
      });
    },
    [navigate, location],
  );

  const handleCreate = useCallback(() => {
    navigate(settingsUserCreatePath(), {
      state: { backgroundLocation: location },
    });
  }, [navigate, location]);

  const handleStatusFilter = useCallback((event) => {
    setStatusFilter(event.target.value);
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

  // Render
  if (isPending) {
    return (
      <div className="p-company-users">
        <div className="p-company-users__loading">
          <Loader />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-company-users">
        <div className="p-company-users__error">
          <EmptyState
            description={t("common.error")}
            hideImageOnMobile
            image="company-users--error"
          />
        </div>
      </div>
    );
  }

  const userFilters = (
    <FilterSelect
      ariaLabel={t("common.filters.allStatuses")}
      onChange={handleStatusFilter}
      options={[
        { value: STATUS_ALL, label: t("common.filters.allStatuses") },
        {
          value: USER_STATUSES.ACTIVE,
          label: t("features.company.users.list.active"),
        },
        {
          value: USER_STATUSES.INACTIVE,
          label: t("features.company.users.list.inactive"),
        },
      ]}
      value={statusFilter}
    />
  );

  return (
    <div className="p-company-users">
      <Datatable
        actions={[
          {
            label: t("features.company.users.create.heading"),
            icon: IconUserPlus,
            onClick: handleCreate,
          },
        ]}
        columns={columns}
        data={users}
        filters={userFilters}
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

export default CompanyUserList;
