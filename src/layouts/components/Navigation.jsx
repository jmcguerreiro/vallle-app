import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { NavLink, useLocation } from "react-router-dom";

import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/hooks/useAuth";
import {
  IconBuilding,
  IconChart,
  IconHandCoins,
  IconHouseHeart,
  IconMailbox,
  IconSettings,
  IconUsers,
} from "@/utils/icons";

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
  const location = useLocation();

  // State
  const [indicator, setIndicator] = useState({ x: 0, y: 0, visible: false });

  // Refs
  const listRef = useRef(null);

  // Derived State
  const navItems = useMemo(
    () =>
      isSuperAdmin
        ? [
            {
              to: ROUTES.HOME,
              label: t("nav.dashboard"),
              icon: IconHouseHeart,
            },
            {
              to: ROUTES.ADMIN_COMPANIES,
              label: t("nav.adminCompanies"),
              icon: IconBuilding,
            },
            {
              to: ROUTES.ADMIN_USERS,
              label: t("nav.adminUsers"),
              icon: IconUsers,
            },
            {
              to: ROUTES.ADMIN_COMMISSIONS,
              label: t("nav.adminCommissions"),
              icon: IconHandCoins,
            },
          ]
        : [
            {
              to: ROUTES.HOME,
              label: t("nav.dashboard"),
              icon: IconHouseHeart,
            },
            {
              to: ROUTES.VALLLES,
              label: t("nav.vallles"),
              icon: IconMailbox,
            },
            { to: ROUTES.STATS, label: t("nav.stats"), icon: IconChart },
            {
              to: ROUTES.SETTINGS,
              label: t("nav.settings"),
              icon: IconSettings,
            },
          ],
    [isSuperAdmin, t],
  );

  // Handlers
  const updateIndicator = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const activeEl = list.querySelector(".s-navigation__item.is-active");
    if (!activeEl) {
      setIndicator((prev) => ({ ...prev, visible: false }));
      return;
    }
    setIndicator({
      x: activeEl.offsetLeft,
      y: activeEl.offsetTop,
      visible: true,
    });
  }, []);

  // Effects
  useLayoutEffect(() => {
    updateIndicator();
  }, [location.pathname, navItems, updateIndicator]);

  useEffect(() => {
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [updateIndicator]);

  // Render
  return (
    <nav aria-label={t("nav.mainMenu")} className="s-navigation">
      <ul className="s-navigation__items" ref={listRef}>
        <span
          aria-hidden="true"
          className="s-navigation__indicator"
          style={{
            opacity: indicator.visible ? 1 : 0,
            transform: `translate(${indicator.x}px, ${indicator.y}px)`,
          }}
        />
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
                strokeWidth={1.5}
              />
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Navigation;
