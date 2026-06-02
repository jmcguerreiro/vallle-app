import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Outlet } from "react-router-dom";

import Tabs from "@/components/Tabs";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/hooks/useAuth";
import { useMain } from "@/hooks/useMain";

/**
 * Component: SettingsIndex
 * Settings shell with route-driven tabs (Company, Users).
 * Sets the page header once and renders the active tab via Outlet.
 * Users tab is admin-only.
 * @component
 * @returns {JSX.Element}
 */
const SettingsIndex = () => {
  // Hooks
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const { setHeader } = useMain();

  // Derived State
  const tabs = useMemo(
    () => [
      {
        to: ROUTES.SETTINGS_COMPANY,
        label: t("features.settings.tabs.company"),
      },
      ...(isAdmin
        ? [
            {
              to: ROUTES.SETTINGS_USERS,
              label: t("features.settings.tabs.users"),
            },
          ]
        : []),
    ],
    [isAdmin, t],
  );

  // Effects
  useEffect(() => {
    setHeader({
      title: t("features.settings.heading"),
      description: t("features.settings.description"),
      image: "settings",
    });
    return () => setHeader();
  }, [setHeader, t]);

  // Render
  return (
    <Tabs tabs={tabs}>
      <Outlet />
    </Tabs>
  );
};

export default SettingsIndex;
