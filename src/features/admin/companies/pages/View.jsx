import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import { useQuery } from "@tanstack/react-query";

import Accordion from "@/components/Accordion";
import Badge from "@/components/Badge";
import DefinitionList from "@/components/DefinitionList";
import EmptyState from "@/components/EmptyState";
import Loader from "@/components/Loader";
import Stat from "@/components/Stat";
import { adminCompanyEditPath, adminUserPath } from "@/constants/routes";
import { useModal } from "@/hooks/useModal";
import { get } from "@/services/api";
import { formatCurrency } from "@/utils/currency";
import { formatDate } from "@/utils/dates";

/**
 * Maps company status values to Badge variants. Statuses without a
 * mapping render with the neutral base style.
 */
const STATUS_VARIANTS = {
  active: "success",
  suspended: "warning",
};

/**
 * Maps user status values to Badge variants (used in the company's user list).
 */
const USER_STATUS_VARIANTS = {
  active: "success",
};

/**
 * Component: AdminCompanyView
 * Displays all details for a single company, including commission stats and users.
 * @component
 * @returns {JSX.Element}
 */
const AdminCompanyView = () => {
  // Hooks
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { setHeader } = useModal();

  // Queries
  const {
    data: response,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["admin", "companies", id],
    queryFn: ({ signal }) => get(`/api/admin/companies/${id}`, { signal }),
  });

  // Derived State

  // Handlers
  const handleEdit = useCallback(() => {
    const backgroundLocation = location.state?.backgroundLocation || location;
    navigate(adminCompanyEditPath(id), { state: { backgroundLocation } });
  }, [id, navigate, location]);

  // Effects
  useEffect(() => {
    setHeader({
      title: t("features.admin.companies.view.heading"),
      description: t("features.admin.companies.view.description"),
      actions: [
        { label: t("features.admin.companies.view.edit"), onClick: handleEdit },
      ],
    });
    return () => setHeader();
  }, [setHeader, t, handleEdit]);

  // Render
  if (isPending) {
    return (
      <div className="c-page-state">
        <Loader />
      </div>
    );
  }

  if (isError || !response?.data) {
    return (
      <div className="c-page-state">
        <EmptyState
          description={t("common.error")}
          hideImageOnMobile
          image="companies--error"
        />
      </div>
    );
  }

  const { store, stats, users } = response.data;

  const details = [
    {
      label: t("features.admin.companies.form.category"),
      value: store.category
        ? t(`constants.companyCategories.${store.category}`)
        : "—",
    },
    {
      label: t("features.admin.companies.form.email"),
      value: store.email || "—",
    },
    {
      label: t("features.admin.companies.form.phone"),
      value: store.phone || "—",
    },
    {
      label: t("features.admin.companies.form.vatId"),
      value: store.vat_id || "—",
    },
    {
      label: t("features.admin.companies.list.status"),
      value: (
        <Badge variant={STATUS_VARIANTS[store.status]}>
          {t(`features.admin.companies.list.${store.status}`)}
        </Badge>
      ),
    },
    {
      label: t("features.admin.companies.list.createdAt"),
      value: formatDate(store.created_at),
    },
  ];

  return (
    <div className="c-admin-company-view">
      <div className="c-admin-stats-grid c-admin-stats-grid--2">
        <Stat
          label={t("features.admin.companies.view.vallles")}
          value={stats.vallle_count}
        />
        <Stat
          label={t("features.admin.companies.view.totalSales")}
          value={formatCurrency(stats.total_vallle_amount)}
        />
        <Stat
          label={t("features.admin.companies.view.totalCommission")}
          value={formatCurrency(stats.total_commission)}
        />
        <Stat
          label={t("features.admin.companies.view.unpaidCommission")}
          value={formatCurrency(stats.unpaid_commission)}
        />
      </div>

      <DefinitionList className="c-admin-detail-list" items={details} />

      <div className="c-admin-company-users">
        <Accordion title={t("features.admin.companies.view.users")}>
          {users.length === 0 ? (
            <p className="c-admin-company-users__empty">
              {t("features.admin.companies.view.usersEmpty")}
            </p>
          ) : (
            <ul className="c-admin-company-users__list">
              {users.map((u) => (
                <li key={u.id} className="c-admin-company-users__item">
                  <Link
                    className="c-admin-company-users__link"
                    state={{
                      backgroundLocation:
                        location.state?.backgroundLocation || location,
                    }}
                    to={adminUserPath(u.id)}
                  >
                    <div className="c-admin-company-users__row">
                      <span className="c-admin-company-users__name">
                        {u.name}
                      </span>
                      <Badge variant={USER_STATUS_VARIANTS[u.status]}>
                        {t(`features.admin.users.list.${u.status}`)}
                      </Badge>
                    </div>
                    <span className="c-admin-company-users__email">
                      {u.email}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Accordion>
      </div>
    </div>
  );
};

export default AdminCompanyView;
