import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import { useQuery } from "@tanstack/react-query";

import Badge from "@/components/Badge";
import Datatable from "@/components/Datatable";
import EmptyState from "@/components/EmptyState";
import FilterSelect from "@/components/forms/FilterSelect";
import Loader from "@/components/Loader";
import { ROUTES, adminUserPath } from "@/constants/routes";
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
 * Lists all users across all companies for the super admin.
 * @component
 * @returns {JSX.Element}
 */
const AdminUsersIndex = () => {
  // Hooks
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { setHeader } = useMain();

  // State
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");

  // Queries
  const {
    data: response,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: ({ signal }) => get("/api/admin/users", { signal }),
  });

  const users = useMemo(() => response?.data ?? [], [response]);

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
  }, []);

  const handleRoleFilter = useCallback((event) => {
    setRoleFilter(event.target.value);
  }, []);

  // Derived State
  const filteredUsers = useMemo(() => {
    let result = users;
    if (statusFilter !== "all") {
      result = result.filter((u) => u.status === statusFilter);
    }
    if (roleFilter !== "all") {
      result = result.filter((u) => u.role === roleFilter);
    }
    return result;
  }, [users, statusFilter, roleFilter]);

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
          { value: "all", label: t("common.filters.allRoles") },
          { value: "user", label: t("features.admin.users.list.role_user") },
          { value: "admin", label: t("features.admin.users.list.role_admin") },
          {
            value: "super_admin",
            label: t("features.admin.users.list.role_super_admin"),
          },
        ]}
        value={roleFilter}
      />
      <FilterSelect
        ariaLabel={t("common.filters.allStatuses")}
        onChange={handleStatusFilter}
        options={[
          { value: "all", label: t("common.filters.allStatuses") },
          { value: "active", label: t("features.admin.users.list.active") },
          { value: "inactive", label: t("features.admin.users.list.inactive") },
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
        data={filteredUsers}
        filters={userFilters}
        onRowClick={handleRowClick}
      />
    </div>
  );
};

export default AdminUsersIndex;
