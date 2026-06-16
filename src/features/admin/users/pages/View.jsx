import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Badge from "@/components/Badge";
import Card from "@/components/Card";
import DefinitionList from "@/components/DefinitionList";
import EmptyState from "@/components/EmptyState";
import List from "@/components/List";
import Loader from "@/components/Loader";
import { adminCompanyPath, adminUserEditPath } from "@/constants/routes";
import { USER_STATUSES } from "@/constants/user-statuses";
import { useAuth } from "@/hooks/useAuth";
import { useModal } from "@/hooks/useModal";
import { useToast } from "@/hooks/useToast";
import { get, put } from "@/services/api";
import { formatDate } from "@/utils/dates";

/**
 * Maps user status values to Badge variants. Statuses without a
 * mapping render with the neutral base style.
 */
const STATUS_VARIANTS = {
  active: "success",
};

/**
 * Component: AdminUserView
 * Displays all details for a single user, including role, status, and assigned companies.
 * @component
 * @returns {JSX.Element}
 */
const AdminUserView = () => {
  // Hooks
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useAuth();
  const { setHeader } = useModal();
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  // Queries
  const {
    data: response,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["admin", "users", id],
    queryFn: ({ signal }) => get(`/api/admin/users/${id}`, { signal }),
  });

  const user = response?.data?.user;

  // Mutations
  const toggleStatus = useMutation({
    mutationFn: (newStatus) =>
      put(`/api/admin/users/${id}`, { ...user, status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      addToast(t("features.admin.users.view.statusUpdated"), "success");
    },
    onError: () => {
      addToast(t("features.admin.users.error.generic"), "error");
    },
  });

  // The mutation result object is a fresh reference every render; only the
  // stable mutate function may be a hook dependency, otherwise the header
  // effect (setHeader → context update → re-render) loops forever.
  const { mutate: toggleUserStatus } = toggleStatus;

  // Derived State
  const isSelf = currentUser?.id === id;

  // Handlers
  const handleEdit = useCallback(() => {
    const backgroundLocation = location.state?.backgroundLocation || location;
    navigate(adminUserEditPath(id), { state: { backgroundLocation } });
  }, [id, navigate, location]);

  const handleToggleStatus = useCallback(() => {
    if (!user) return;
    toggleUserStatus(
      user.status === USER_STATUSES.ACTIVE
        ? USER_STATUSES.INACTIVE
        : USER_STATUSES.ACTIVE,
    );
  }, [user, toggleUserStatus]);

  // Effects
  useEffect(() => {
    const actions = [
      { label: t("features.admin.users.view.edit"), onClick: handleEdit },
    ];
    if (user && !isSelf) {
      const isActive = user.status === USER_STATUSES.ACTIVE;
      actions.push({
        label: isActive
          ? t("features.admin.users.view.disable")
          : t("features.admin.users.view.enable"),
        onClick: handleToggleStatus,
        skin: isActive ? "danger" : "primary",
      });
    }
    setHeader({
      title: t("features.admin.users.view.heading"),
      description: t("features.admin.users.view.description"),
      actions,
    });
    return () => setHeader();
  }, [setHeader, t, handleEdit, handleToggleStatus, user, isSelf]);

  // Render
  if (isPending) {
    return (
      <div className="c-page-state">
        <Loader />
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="c-page-state">
        <EmptyState
          description={t("common.error")}
          hideImageOnMobile
          image="users--error"
        />
      </div>
    );
  }

  const details = [
    { label: t("features.admin.users.form.name"), value: user.name },
    { label: t("features.admin.users.form.email"), value: user.email },
    {
      label: t("features.admin.users.list.role"),
      value: <Badge>{t(`features.admin.users.list.role_${user.role}`)}</Badge>,
    },
    {
      label: t("features.admin.users.list.status"),
      value: (
        <Badge variant={STATUS_VARIANTS[user.status]}>
          {t(`features.admin.users.list.${user.status}`)}
        </Badge>
      ),
    },
    {
      label: t("features.admin.users.list.createdAt"),
      value: formatDate(user.created_at),
    },
  ];

  return (
    <div className="c-admin-user-view">
      <DefinitionList className="c-admin-detail-list" items={details} />

      {user.stores?.length > 0 && (
        <Card
          description={t("features.admin.users.view.companiesDescription")}
          title={t("features.admin.users.view.companies")}
        >
          <List>
            {user.stores.map((s) => (
              <List.Item
                key={s.store_id}
                state={{
                  backgroundLocation:
                    location.state?.backgroundLocation || location,
                }}
                to={adminCompanyPath(s.store_id)}
              >
                {s.store_name}
              </List.Item>
            ))}
          </List>
        </Card>
      )}
    </div>
  );
};

export default AdminUserView;
