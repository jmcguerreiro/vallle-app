import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import Button from "@/components/Button";
import Modal from "@/components/Modal";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/hooks/useAuth";
import { IconEllipsisVertical } from "@/utils/icons";

/**
 * Component: User
 * Header avatar button that opens a modal with the user's name, role, and
 * account actions (edit profile, logout).
 * @component
 * @returns {JSX.Element}
 */
const User = () => {
  // Hooks
  const { t } = useTranslation();
  const { user, logout, isSuperAdmin, activeStore } = useAuth();
  const navigate = useNavigate();

  // State
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Derived State
  // Role is store-scoped: show the active store's role, except for platform
  // super_admins (a global account role).
  const displayRole = isSuperAdmin
    ? user?.role
    : activeStore?.role || user?.role;

  // Handlers
  const handleOpenUserMenu = useCallback(() => {
    setUserMenuOpen(true);
  }, []);

  const handleCloseUserMenu = useCallback(() => {
    setUserMenuOpen(false);
  }, []);

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
          size="20"
          strokeWidth="1.5"
        />
      </button>
      <div className="s-header__user-modal">
        <Modal onClose={handleCloseUserMenu} open={userMenuOpen}>
          <div className="s-header__user-menu">
            <img
              alt={user?.name}
              className="s-header__user-menu-avatar"
              src={`/images/avatars/${user?.avatar || "paper-bag-head"}.svg`}
            />
            <p className="s-header__user-menu-name">{user?.name}</p>
            {displayRole && (
              <p className="s-header__user-menu-role">
                {t(`roles.${displayRole}`)}
              </p>
            )}
            <div className="s-header__user-menu-actions">
              <Button display="block" onClick={handleEditProfile} skin="sand">
                {t("nav.editProfile")}
              </Button>
              <Button display="block" onClick={handleLogout}>
                {t("nav.logout")}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default User;
