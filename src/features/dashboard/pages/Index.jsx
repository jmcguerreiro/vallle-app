import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import { useQuery } from "@tanstack/react-query";

import { ROUTES, vallleCreatePath } from "@/constants/routes";
import { useAuth } from "@/hooks/useAuth";
import { get } from "@/services/api";
import { IconMailMinus, IconMailPlus, IconMailSearch } from "@/utils/icons";

/**
 * Component: Dashboard
 * Welcome screen with active vallle count and three quick-action buttons:
 * Create (Emitir), Redeem (Redimir), and Look up (Consultar).
 * @component
 * @returns {JSX.Element}
 */
const Dashboard = () => {
  // Hooks
  const { t } = useTranslation();
  const { user, isStoreSuspended } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Queries
  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: ({ signal }) => get("/api/stats", { signal }),
  });

  // Derived State
  const firstName = user?.name?.split(" ")[0] ?? user?.name;

  const activeCount = stats?.data.activeVallles ?? null;

  const subtitle =
    activeCount === null
      ? null
      : activeCount > 0
        ? t("features.dashboard.subtitle", { count: activeCount })
        : t("features.dashboard.subtitleNone");

  // Handlers
  const handleCreate = useCallback(() => {
    navigate(vallleCreatePath(), { state: { backgroundLocation: location } });
  }, [navigate, location]);

  const handleRedeem = useCallback(() => {
    navigate(ROUTES.VALLLES_MODAL_QUICK_REDEEM, {
      state: { backgroundLocation: location },
    });
  }, [navigate, location]);

  const handleLookup = useCallback(() => {
    navigate(ROUTES.VALLLES_MODAL_QUICK_LOOKUP, {
      state: { backgroundLocation: location },
    });
  }, [navigate, location]);

  // Render
  return (
    <div className="p-dashboard">
      <div className="p-dashboard__header">
        <img
          alt=""
          className="p-dashboard__header-image"
          src="/images/pages/dashboard.svg"
        />
        <h1 className="p-dashboard__header-title">
          {t("features.dashboard.welcome", { name: firstName })}
        </h1>
        {subtitle && <p className="p-dashboard__header-subtitle">{subtitle}</p>}
      </div>
      <div className="p-dashboard__body">
        <div className="p-dashboard__body-actions">
          <button
            className="p-dashboard__body-actions-action"
            disabled={isStoreSuspended}
            onClick={handleCreate}
            type="button"
          >
            <span className="p-dashboard__body-actions-action-label">
              {t("features.dashboard.actions.create")}
            </span>
            <IconMailPlus
              className="p-dashboard__body-actions-action-icon"
              strokeWidth="1.5"
            />
          </button>
          <button
            className="p-dashboard__body-actions-action"
            onClick={handleRedeem}
            type="button"
          >
            <span className="p-dashboard__body-actions-action-label">
              {t("features.dashboard.actions.redeem")}
            </span>
            <IconMailMinus
              className="p-dashboard__body-actions-action-icon"
              strokeWidth="1.5"
            />
          </button>
          <button
            className="p-dashboard__body-actions-action"
            onClick={handleLookup}
            type="button"
          >
            <span className="p-dashboard__body-actions-action-label">
              {t("features.dashboard.actions.lookup")}
            </span>
            <IconMailSearch
              className="p-dashboard__body-actions-action-icon"
              strokeWidth="1.5"
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
