import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import { useQuery } from "@tanstack/react-query";

import Badge from "@/components/Badge";
import Datatable from "@/components/Datatable";
import FilterSelect from "@/components/forms/FilterSelect";
import {
  settingsUserCreatePath,
  settingsUserEditPath,
} from "@/constants/routes";
import { useToast } from "@/hooks/useToast";
import { get } from "@/services/api";
import { formatDateTime } from "@/utils/dates";
import { IconUserPlus } from "@/utils/icons";

/**
 * Maps user status values to Badge variants. Statuses without a
 * mapping render with the neutral base style.
 */
const STATUS_VARIANTS = {
  active: "success",
};

/**
 * Component: CompanyUsers
 * Lists users belonging to the active store. Allows admins to create and edit users.
 * @component
 * @returns {JSX.Element}
 */
const CompanyUsers = () => {
  // Hooks
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();

  // State
  const [statusFilter, setStatusFilter] = useState("all");

  // Queries
  const {
    data: response,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["company", "users"],
    queryFn: ({ signal }) => get("/api/company/users", { signal }),
  });

  const users = useMemo(() => response?.data ?? [], [response]);

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
  }, []);

  // Derived State
  const filteredUsers = useMemo(() => {
    if (statusFilter === "all") return users;
    return users.filter((u) => u.status === statusFilter);
  }, [users, statusFilter]);

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
          <Badge>{t(`features.company.users.list.role_${getValue()}`)}</Badge>
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

  // Effects
  useEffect(() => {
    if (isError) addToast(t("features.company.users.error.generic"), "error");
  }, [isError, addToast, t]);

  // Render
  if (isPending) {
    return <p>{t("common.loading")}</p>;
  }

  const userFilters = (
    <FilterSelect
      ariaLabel={t("common.filters.allStatuses")}
      onChange={handleStatusFilter}
      options={[
        { value: "all", label: t("common.filters.allStatuses") },
        { value: "active", label: t("features.company.users.list.active") },
        { value: "inactive", label: t("features.company.users.list.inactive") },
      ]}
      value={statusFilter}
    />
  );

  return (
    <div className="c-company-users">
      <Datatable
        actions={[
          {
            label: t("features.company.users.create.heading"),
            icon: IconUserPlus,
            onClick: handleCreate,
          },
        ]}
        columns={columns}
        data={filteredUsers}
        filters={userFilters}
        onRowClick={handleRowClick}
      />
    </div>
  );
};

export default CompanyUsers;
