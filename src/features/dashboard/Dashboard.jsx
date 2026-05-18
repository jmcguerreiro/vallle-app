import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import { ArrowUpFromDot, ArrowDownToDot, View } from "lucide-react";

import { ROUTES, voucherCreatePath } from "@/constants/routes";
import { useAuth } from "@/hooks/useAuth";
import { useMain } from "@/hooks/useMain";
import { get } from "@/services/api";

/**
 * Component: Dashboard
 * Welcome screen with active voucher count and three quick-action buttons:
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
  const { setHeader } = useMain();

  // State
  const [activeCount, setActiveCount] = useState(null);

  // Derived State
  const firstName = user?.name?.split(' ')[0] ?? user?.name

  const subtitle =
    activeCount === null
      ? null
      : activeCount > 0
        ? t("features.dashboard.subtitle", { count: activeCount })
        : t("features.dashboard.subtitleNone");

  // Handlers
  const handleCreate = useCallback(() => {
    navigate(voucherCreatePath(), { state: { backgroundLocation: location } });
  }, [navigate, location]);

  const handleRedeem = useCallback(() => {
    navigate(ROUTES.VOUCHERS_MODAL_QUICK_REDEEM, {
      state: { backgroundLocation: location },
    });
  }, [navigate, location]);

  const handleLookup = useCallback(() => {
    navigate(ROUTES.VOUCHERS_MODAL_QUICK_LOOKUP, {
      state: { backgroundLocation: location },
    });
  }, [navigate, location]);

  // Effects
  useEffect(() => {
    setHeader();
  }, [setHeader]);

  useEffect(() => {
    let cancelled = false;

    const fetchCount = async () => {
      try {
        const { data } = await get("/api/stats");
        if (!cancelled) setActiveCount(data.activeVouchers);
      } catch {
        if (!cancelled) setActiveCount(0);
      }
    };

    fetchCount();
    return () => {
      cancelled = true;
    };
  }, []);

  // Render
  return (
    <div className="p-dashboard">
      <div className="p-dashboard__welcome">
        <img
          alt=""
          className="p-dashboard__welcome-image"
          src="/images/test.svg"
        />
        <h1 className="p-dashboard__welcome-title">
          {t("features.dashboard.welcome", { name: firstName })}
        </h1>
        {subtitle && (
          <p className="p-dashboard__welcome-subtitle">{subtitle}</p>
        )}
      </div>
      <div className="p-dashboard__actions">
        <button
          className="p-dashboard__action"
          disabled={isStoreSuspended}
          onClick={handleCreate}
          type="button"
        >
          <span className="p-dashboard__action-label">
            {t("features.dashboard.actions.create")}
          </span>
          <ArrowUpFromDot
            className="p-dashboard__action-icon"
            strokeWidth="1.5"
          />
        </button>
        <button
          className="p-dashboard__action"
          onClick={handleRedeem}
          type="button"
        >
          <span className="p-dashboard__action-label">
            {t("features.dashboard.actions.redeem")}
          </span>
          <ArrowDownToDot
            className="p-dashboard__action-icon"
            strokeWidth="1.5"
          />
        </button>
        <button
          className="p-dashboard__action"
          onClick={handleLookup}
          type="button"
        >
          <span className="p-dashboard__action-label">
            {t("features.dashboard.actions.lookup")}
          </span>
          <View className="p-dashboard__action-icon" strokeWidth="1.5" />
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
