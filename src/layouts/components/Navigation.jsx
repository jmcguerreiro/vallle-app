import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, useNavigate } from "react-router-dom";

import {
  EllipsisVertical as IconEllipsisVertical,
  Settings2 as IconSettings,
  CircleHelp as IconHelp,
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
 * Horizontal nav bar with page links, a help link, and a user menu popover.
 * @component
 * @returns {JSX.Element}
 */
const Navigation = () => {
  // Hooks
  const { t } = useTranslation();
  const { user, logout, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

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

  // Handlers
  const handleLogout = useCallback(async () => {
    await logout();
    navigate(ROUTES.LOGIN);
  }, [logout, navigate]);

  const handleClosePopover = useCallback(() => {
    document.querySelector("#user-menu-popover")?.hidePopover();
  }, []);

  // Render
  return (
    <div className="s-navigation">
      <nav aria-label={t("nav.mainMenu")} className="s-navigation__menu">
        <ul className="s-navigation__menu-items">
          {navItems.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                aria-label={label}
                className={({ isActive }) =>
                  `s-navigation__menu-item${isActive ? " is-active" : ""}`
                }
                to={to}
              >
                <Icon
                  aria-hidden="true"
                  className="s-navigation__menu-item-icon"
                />
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="s-navigation__extra">
        <a aria-label={t("nav.help")} className="s-navigation__help" href="#">
          <IconHelp aria-hidden="true" className="s-navigation__help-icon" />
        </a>

        <div className="s-navigation__user">
          <button
            aria-label={t("nav.userMenu")}
            className="s-navigation__user-button"
            popovertarget="user-menu-popover"
            type="button"
          >
            <img
              alt={user?.name}
              className="s-navigation__user-button-image"
              src={`/images/avatars/${user?.avatar || "paper-bag-head"}.svg`}
            />
            <IconEllipsisVertical className="s-navigation__user-button-toggle-icon" />
          </button>

          <div
            className="s-navigation__user-popover"
            id="user-menu-popover"
            popover="auto"
          >
            <NavLink
              className="s-navigation__user-popover-item"
              onClick={handleClosePopover}
              to={ROUTES.PROFILE}
            >
              {t("nav.editProfile")}
            </NavLink>
            <button
              className="s-navigation__user-popover-item"
              onClick={handleLogout}
              type="button"
            >
              {t("nav.logout")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navigation;
