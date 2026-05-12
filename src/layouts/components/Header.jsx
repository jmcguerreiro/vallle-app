import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import {
  EllipsisVertical as IconEllipsisVertical,
  CircleHelp as IconHelp,
  LogOut as IconLogOut,
  Pencil as IconPencil,
  Store as IconStore,
  X as IconX,
} from "lucide-react";

import Button from "@/components/Button";
import StoreSelect from "@/components/StoreSelect";
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
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Refs
  const switcherRef = useRef(null);
  const userMenuRef = useRef(null);

  // Derived State
  const hasMultipleStores = (user?.stores?.length ?? 0) > 1;
  const otherStores = user?.stores?.filter(
    (store) => store.store_id !== activeStore?.store_id,
  );

  // Handlers
  const handleOpenSwitcher = useCallback(() => {
    setSwitcherOpen(true);
    setTimeout(() => switcherRef.current?.showModal(), 0);
  }, []);

  const handleCloseSwitcher = useCallback(() => {
    switcherRef.current?.close();
    setSwitcherOpen(false);
  }, []);

  const handleSelectStore = useCallback(
    (store) => {
      selectStore(store);
      handleCloseSwitcher();
    },
    [selectStore, handleCloseSwitcher],
  );

  const handleSwitcherBackdropClick = useCallback(
    (event) => {
      if (event.target === switcherRef.current) {
        handleCloseSwitcher();
      }
    },
    [handleCloseSwitcher],
  );

  const handleOpenUserMenu = useCallback(() => {
    setUserMenuOpen(true);
    setTimeout(() => userMenuRef.current?.showModal(), 0);
  }, []);

  const handleCloseUserMenu = useCallback(() => {
    userMenuRef.current?.close();
    setUserMenuOpen(false);
  }, []);

  const handleUserMenuBackdropClick = useCallback(
    (event) => {
      if (event.target === userMenuRef.current) {
        handleCloseUserMenu();
      }
    },
    [handleCloseUserMenu],
  );

  const handleEditProfile = useCallback(() => {
    handleCloseUserMenu();
    navigate(ROUTES.PROFILE);
  }, [handleCloseUserMenu, navigate]);

  const handleLogout = useCallback(async () => {
    handleCloseUserMenu();
    await logout();
    navigate(ROUTES.LOGIN);
  }, [handleCloseUserMenu, logout, navigate]);

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
              onClick={handleOpenUserMenu}
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
          </div>
        </div>

        {switcherOpen && (
          <dialog
            ref={switcherRef}
            className="c-modal c-store-switcher"
            onClick={handleSwitcherBackdropClick}
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
                <StoreSelect
                  onSelect={handleSelectStore}
                  renderMeta={(store) => store.role}
                  stores={otherStores}
                />
              </div>
            </div>
          </dialog>
        )}

        {userMenuOpen && (
          <dialog
            ref={userMenuRef}
            className="s-header__user-modal"
            onClick={handleUserMenuBackdropClick}
            onClose={handleCloseUserMenu}
          >
            <div className="s-header__user-modal-content">
              <button
                aria-label="Close"
                className="s-header__user-modal-close"
                onClick={handleCloseUserMenu}
                type="button"
              >
                <IconX size={18} strokeWidth="1.5" />
              </button>
              <img
                alt={user?.name}
                className="s-header__user-modal-avatar"
                src={`/images/avatars/${user?.avatar || "paper-bag-head"}.svg`}
              />
              <p className="s-header__user-modal-name">{user?.name}</p>
              {user?.role && (
                <p className="s-header__user-modal-role">
                  {t(`roles.${user.role}`)}
                </p>
              )}
              <div className="s-header__user-modal-actions">
                <Button
                  fullWidth={true}
                  iconLeft={IconPencil}
                  onClick={handleEditProfile}
                  variant="outline"
                >
                  {t("nav.editProfile")}
                </Button>
                <Button
                  fullWidth={true}
                  iconLeft={IconLogOut}
                  onClick={handleLogout}
                  variant="fill"
                >
                  {t("nav.logout")}
                </Button>
              </div>
            </div>
          </dialog>
        )}
      </div>
    </header>
  );
};

export default Header;
