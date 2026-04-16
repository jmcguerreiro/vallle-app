import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";

import {
  Settings2 as IconSettings,
  HouseHeart as IconDashboard,
  ReceiptText as IconCommissions,
  Mailbox as IconVouchers,
  ChartNoAxesCombined as IconStats,
  Users as IconUsers,
} from "lucide-react";

import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/hooks/useAuth";

/**
 * Layout: Navigation
 * Main navigation menu with role-aware links.
 * @component
 * @returns {JSX.Element}
 */
const Navigation = () => {
  // Hooks
  const { t } = useTranslation();
  const { isSuperAdmin } = useAuth();

  // Derived State
  const navItems = useMemo(
    () =>
      isSuperAdmin
        ? [
            { to: ROUTES.HOME, label: t("nav.dashboard"), icon: IconDashboard },
            {
              to: ROUTES.ADMIN_COMPANIES,
              label: t("nav.adminCompanies"),
              icon: IconSettings,
            },
            {
              to: ROUTES.ADMIN_USERS,
              label: t("nav.adminUsers"),
              icon: IconUsers,
            },
            {
              to: ROUTES.ADMIN_COMMISSIONS,
              label: t("nav.adminCommissions"),
              icon: IconCommissions,
            },
          ]
        : [
            { to: ROUTES.HOME, label: t("nav.dashboard"), icon: IconDashboard },
            {
              to: ROUTES.VOUCHERS,
              label: t("nav.vouchers"),
              icon: IconVouchers,
            },
            { to: ROUTES.STATS, label: t("nav.stats"), icon: IconStats },
            { to: ROUTES.COMPANY, label: t("nav.company"), icon: IconSettings },
          ],
    [isSuperAdmin, t],
  );

  // Render
  return (
    <nav aria-label={t("nav.mainMenu")} className="s-navigation">
      <ul className="s-navigation__items">
        {navItems.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              aria-label={label}
              className={({ isActive }) =>
                `s-navigation__item${isActive ? " is-active" : ""}`
              }
              to={to}
            >
              <Icon
                aria-hidden="true"
                className="s-navigation__item-icon"
                strokeWidth="1.5"
              />
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Navigation;
