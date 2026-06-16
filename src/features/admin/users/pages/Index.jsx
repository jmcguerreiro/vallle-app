import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import Badge from "@/components/Badge";
import Datatable from "@/components/Datatable";
import EmptyState from "@/components/EmptyState";
import FilterSelect from "@/components/forms/FilterSelect";
import Loader from "@/components/Loader";
import { ROUTES, adminUserPath } from "@/constants/routes";
import { USER_ROLES } from "@/constants/user-roles";
import { USER_STATUSES } from "@/constants/user-statuses";
import { useMain } from "@/hooks/useMain";
import { get } from "@/services/api";
import { formatDateTime } from "@/utils/dates";
import { IconPlus } from "@/utils/icons";

/**
 * Maps user status values to Badge variants. Statuses without a
 * mapping render with the neutral base style.
 */
const STATUS_VARIANTS = {
  active: "success",
};

/**
 * Component: AdminUsersIndex
 * Lists all users across all companies for the super admin. Pagination,
 * search, sorting, and the status/role filters are server-side.
 * @component
 * @returns {JSX.Element}
 */
const AdminUsersIndex = () => {
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
  const [roleFilter, setRoleFilter] = useState(FILTER_ALL);
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
      "users",
      {
        page: pageIndex,
        pageSize: PAGE_SIZE,
        status: statusFilter,
        role: roleFilter,
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
      if (roleFilter !== FILTER_ALL) params.set("role", roleFilter);
      if (search) params.set("search", search);
      return get(`/api/admin/users?${params.toString()}`, { signal });
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
        header: t("features.admin.users.list.name"),
        meta: { tdClassName: "c-datatable__td--text-highlight" },
      },
      {
        accessorKey: "email",
        header: t("features.admin.users.list.email"),
        meta: { hideOnMobile: true },
      },
      {
        accessorKey: "role",
        header: t("features.admin.users.list.role"),
        enableSorting: false,
        cell: ({ getValue }) => (
          <Badge>{t(`features.admin.users.list.role_${getValue()}`)}</Badge>
        ),
      },
      {
        id: "stores",
        header: t("features.admin.users.list.companies"),
        enableSorting: false,
        cell: ({ row }) => {
          const stores = row.original.stores ?? [];
          if (stores.length === 0) return "—";
          return stores.map((s) => s.store_name).join(", ");
        },
        meta: { hideOnMobile: true },
      },
      {
        accessorKey: "status",
        header: t("features.admin.users.list.status"),
        enableSorting: false,
        cell: ({ getValue }) => {
          const status = getValue();
          return (
            <Badge variant={STATUS_VARIANTS[status]}>
              {t(`features.admin.users.list.${status}`)}
            </Badge>
          );
        },
      },
      {
        accessorKey: "updated_at",
        header: t("features.admin.users.list.updatedAt"),
        cell: ({ getValue }) => formatDateTime(getValue()),
        meta: { hideOnMobile: true },
      },
    ],
    [t],
  );

  // Handlers
  const handleRowClick = useCallback(
    (row) => {
      navigate(adminUserPath(row.id), {
        state: { backgroundLocation: location },
      });
    },
    [navigate, location],
  );

  const handleCreate = useCallback(() => {
    navigate(ROUTES.ADMIN_USERS_MODAL_CREATE, {
      state: { backgroundLocation: location },
    });
  }, [navigate, location]);

  const handleStatusFilter = useCallback((event) => {
    setStatusFilter(event.target.value);
    setPageIndex(0);
  }, []);

  const handleRoleFilter = useCallback((event) => {
    setRoleFilter(event.target.value);
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
      title: t("features.admin.users.heading"),
      description: t("features.admin.users.description"),
      image: "users",
    });
    return () => setHeader();
  }, [setHeader, t]);

  // Render
  if (isPending) {
    return (
      <div className="p-admin-users">
        <div className="p-admin-users__loading">
          <Loader />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-admin-users">
        <div className="p-admin-users__error">
          <EmptyState
            description={t("common.error")}
            hideImageOnMobile
            image="users--error"
          />
        </div>
      </div>
    );
  }

  const userFilters = (
    <>
      <FilterSelect
        ariaLabel={t("common.filters.allRoles")}
        onChange={handleRoleFilter}
        options={[
          { value: FILTER_ALL, label: t("common.filters.allRoles") },
          {
            value: USER_ROLES.USER,
            label: t("features.admin.users.list.role_user"),
          },
          {
            value: USER_ROLES.ADMIN,
            label: t("features.admin.users.list.role_admin"),
          },
          {
            value: USER_ROLES.SUPER_ADMIN,
            label: t("features.admin.users.list.role_super_admin"),
          },
        ]}
        value={roleFilter}
      />
      <FilterSelect
        ariaLabel={t("common.filters.allStatuses")}
        onChange={handleStatusFilter}
        options={[
          { value: FILTER_ALL, label: t("common.filters.allStatuses") },
          {
            value: USER_STATUSES.ACTIVE,
            label: t("features.admin.users.list.active"),
          },
          {
            value: USER_STATUSES.INACTIVE,
            label: t("features.admin.users.list.inactive"),
          },
        ]}
        value={statusFilter}
      />
    </>
  );

  const actions = [
    {
      label: t("features.admin.users.create.heading"),
      icon: IconPlus,
      onClick: handleCreate,
    },
  ];

  return (
    <div className="p-admin-users">
      <Datatable
        actions={actions}
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

export default AdminUsersIndex;
