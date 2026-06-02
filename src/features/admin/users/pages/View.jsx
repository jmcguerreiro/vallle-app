import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Badge from "@/components/Badge";
import EmptyState from "@/components/EmptyState";
import Loader from "@/components/Loader";
import { adminCompanyPath, adminUserEditPath } from "@/constants/routes";
import { useAuth } from "@/hooks/useAuth";
import { useMain } from "@/hooks/useMain";
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
  const { setHeader: setMainHeader } = useMain();
  const { setHeader: setModalHeader, isModal } = useModal();
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

  // Derived State
  const setHeader = isModal ? setModalHeader : setMainHeader;
  const isSelf = currentUser?.id === id;

  // Handlers
  const handleEdit = useCallback(() => {
    const backgroundLocation = location.state?.backgroundLocation || location;
    navigate(adminUserEditPath(id), { state: { backgroundLocation } });
  }, [id, navigate, location]);

  const handleToggleStatus = useCallback(() => {
    if (!user) return;
    toggleStatus.mutate(user.status === "active" ? "inactive" : "active");
  }, [user, toggleStatus]);

  // Effects
  useEffect(() => {
    const actions = [
      { label: t("features.admin.users.view.edit"), onClick: handleEdit },
    ];
    if (user && !isSelf) {
      const isActive = user.status === "active";
      actions.push({
        label: isActive
          ? t("features.admin.users.view.disable")
          : t("features.admin.users.view.enable"),
        onClick: handleToggleStatus,
        variant: isActive ? "danger" : "primary",
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

  return (
    <div className="c-admin-user-view">
      <div className="c-admin-detail-grid">
        <div className="c-admin-detail__row">
          <span className="c-admin-detail__label">
            {t("features.admin.users.form.name")}
          </span>
          <span className="c-admin-detail__value">{user.name}</span>
        </div>
        <div className="c-admin-detail__row">
          <span className="c-admin-detail__label">
            {t("features.admin.users.form.email")}
          </span>
          <span className="c-admin-detail__value">{user.email}</span>
        </div>
        <div className="c-admin-detail__row">
          <span className="c-admin-detail__label">
            {t("features.admin.users.list.role")}
          </span>
          <Badge>{t(`features.admin.users.list.role_${user.role}`)}</Badge>
        </div>
        <div className="c-admin-detail__row">
          <span className="c-admin-detail__label">
            {t("features.admin.users.list.status")}
          </span>
          <Badge variant={STATUS_VARIANTS[user.status]}>
            {t(`features.admin.users.list.${user.status}`)}
          </Badge>
        </div>
        <div className="c-admin-detail__row">
          <span className="c-admin-detail__label">
            {t("features.admin.users.list.createdAt")}
          </span>
          <span className="c-admin-detail__value">
            {formatDate(user.created_at)}
          </span>
        </div>
      </div>

      {user.stores?.length > 0 && (
        <div className="c-admin-company-users">
          <h3 className="c-admin-company-users__heading">
            {t("features.admin.users.view.companies")}
          </h3>
          <ul className="c-admin-company-users__list">
            {user.stores.map((s) => (
              <li key={s.store_id} className="c-admin-company-users__item">
                <Link
                  className="c-admin-company-users__link"
                  state={{
                    backgroundLocation:
                      location.state?.backgroundLocation || location,
                  }}
                  to={adminCompanyPath(s.store_id)}
                >
                  <span className="c-admin-company-users__name">
                    {s.store_name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AdminUserView;
