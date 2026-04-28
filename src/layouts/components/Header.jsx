import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, useNavigate } from "react-router-dom";

import {
  EllipsisVertical as IconEllipsisVertical,
  CircleHelp as IconHelp,
  Store as IconStore,
  ChevronDown as IconSwitch,
} from "lucide-react";

import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/hooks/useAuth";

/**
 * Layout: Header
 * Top bar displaying the app logo, navigation menu, store switcher, help link, and user menu.
 * @component
 * @returns {JSX.Element}
 */
const Header = () => {
  // Hooks
  const { t } = useTranslation();
  const { user, isSuperAdmin, activeStore, selectStore, logout } = useAuth();
  const navigate = useNavigate();

  // State
  const [switcherOpen, setSwitcherOpen] = useState(false);

  // Refs
  const dialogRef = useRef(null);

  // Derived State
  const hasMultipleStores = (user?.stores?.length ?? 0) > 1;

  // Handlers
  const handleLogout = useCallback(async () => {
    await logout();
    navigate(ROUTES.LOGIN);
  }, [logout, navigate]);

  const handleClosePopover = useCallback(() => {
    document.querySelector("#user-menu-popover")?.hidePopover();
  }, []);

  const handleOpenSwitcher = useCallback(() => {
    setSwitcherOpen(true);
    setTimeout(() => dialogRef.current?.showModal(), 0);
  }, []);

  const handleCloseSwitcher = useCallback(() => {
    dialogRef.current?.close();
    setSwitcherOpen(false);
  }, []);

  const handleSelectStore = useCallback(
    (store) => {
      selectStore(store);
      handleCloseSwitcher();
    },
    [selectStore, handleCloseSwitcher],
  );

  const handleBackdropClick = useCallback(
    (event) => {
      if (event.target === dialogRef.current) {
        handleCloseSwitcher();
      }
    },
    [handleCloseSwitcher],
  );

  // Render
  return (
    <header className="s-header">
      <div className="s-header__wrapper">
        {activeStore && !isSuperAdmin && (
          <div className="s-header__store">
            {hasMultipleStores ? (
              <button
                aria-label={t("nav.switchStore")}
                className="s-header__store-switch"
                onClick={handleOpenSwitcher}
                type="button"
              >
                <IconStore
                  className="s-header__store-switch-icon"
                  strokeWidth="1.5"
                />
                {activeStore.store_name}
              </button>
            ) : (
              <span className="s-header__store-name">
                {activeStore.store_name}
              </span>
            )}
          </div>
        )}

        <div className="s-header__extra">
          <a aria-label={t("nav.help")} className="s-header__help" href="#">
            <IconHelp
              aria-hidden="true"
              className="s-header__help-icon"
              strokeWidth="1.5"
            />
          </a>

          <div className="s-header__user">
            <button
              aria-label={t("nav.userMenu")}
              className="s-header__user-button"
              popovertarget="user-menu-popover"
              type="button"
            >
              <img
                alt={user?.name}
                className="s-header__user-button-image"
                src={`/images/avatars/${user?.avatar || "paper-bag-head"}.svg`}
              />
              <IconEllipsisVertical
                className="s-header__user-button-toggle-icon"
                strokeWidth="1.5"
              />
            </button>

            <div
              className="s-header__user-popover"
              id="user-menu-popover"
              popover="auto"
            >
              <NavLink
                className="s-header__user-popover-item"
                onClick={handleClosePopover}
                to={ROUTES.PROFILE}
              >
                {t("nav.editProfile")}
              </NavLink>
              <button
                className="s-header__user-popover-item"
                onClick={handleLogout}
                type="button"
              >
                {t("nav.logout")}
              </button>
            </div>
          </div>
        </div>

        {switcherOpen && (
          <dialog
            ref={dialogRef}
            className="c-modal c-store-switcher"
            onClick={handleBackdropClick}
            onClose={handleCloseSwitcher}
          >
            <div className="c-modal__content">
              <div className="c-modal__header">
                <h2 className="c-modal__title">
                  {t("nav.switchStoreModal.heading")}
                </h2>
                <button
                  aria-label="Close"
                  className="c-modal__close"
                  onClick={handleCloseSwitcher}
                  type="button"
                >
                  &times;
                </button>
              </div>
              <div className="c-modal__body">
                <ul className="c-store-switcher__list">
                  {user?.stores?.map((store) => {
                    const isCurrent = store.store_id === activeStore?.store_id;
                    return (
                      <li key={store.store_id}>
                        <button
                          className={`c-store-switcher__option${isCurrent ? " c-store-switcher__option--current" : ""}`}
                          disabled={isCurrent}
                          onClick={() => handleSelectStore(store)}
                          type="button"
                        >
                          <span className="c-store-switcher__option-name">
                            {store.store_name}
                          </span>
                          {isCurrent && (
                            <span className="c-store-switcher__option-badge">
                              {t("nav.switchStoreModal.current")}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </dialog>
        )}
      </div>
    </header>
  );
};

export default Header;
