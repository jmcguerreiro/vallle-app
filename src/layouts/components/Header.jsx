import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { ArrowLeftRight as IconSwitch } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";

/**
 * Layout: Header
 * Top bar displaying the app logo and the active store name with a switcher.
 * @component
 * @returns {JSX.Element}
 */
const Header = () => {
  // Hooks
  const { t } = useTranslation();
  const { user, isSuperAdmin, activeStore, selectStore } = useAuth();

  // State
  const [switcherOpen, setSwitcherOpen] = useState(false);

  // Refs
  const dialogRef = useRef(null);

  // Derived State
  const hasMultipleStores = (user?.stores?.length ?? 0) > 1;

  // Handlers
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
      <h1 className="s-header__logo">
        <img
          alt={t("common.appName")}
          className="s-header__logo"
          src="/images/logo.svg"
        />
      </h1>

      {activeStore && !isSuperAdmin && (
        <div className="s-header__store">
          <span className="s-header__store-name">{activeStore.store_name}</span>
          {hasMultipleStores && (
            <button
              aria-label={t("nav.switchStore")}
              className="s-header__store-switch"
              onClick={handleOpenSwitcher}
              type="button"
            >
              <IconSwitch size={14} />
            </button>
          )}
        </div>
      )}

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
    </header>
  );
};

export default Header;
