import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import Modal from "@/components/Modal";
import StoreSelect from "@/components/StoreSelect";
import { useAuth } from "@/hooks/useAuth";
import { IconChevronDown, IconHatGlasses, IconStore } from "@/utils/icons";

/**
 * Component: Store
 * Header element showing the active store. When the user belongs to multiple
 * stores it renders a button that opens a modal to switch between them;
 * otherwise it shows the store name as static text.
 * @component
 * @returns {JSX.Element|null}
 */
const Store = () => {
  // Hooks
  const { t } = useTranslation();
  const { user, isSuperAdmin, activeStore, selectStore } = useAuth();

  // State
  const [switcherOpen, setSwitcherOpen] = useState(false);

  // Derived State
  const hasMultipleStores = (user?.stores?.length ?? 0) > 1;
  const otherStores = user?.stores?.filter(
    (store) => store.store_id !== activeStore?.store_id,
  );

  // Handlers
  const handleOpenSwitcher = useCallback(() => {
    setSwitcherOpen(true);
  }, []);

  const handleCloseSwitcher = useCallback(() => {
    setSwitcherOpen(false);
  }, []);

  const handleSelectStore = useCallback(
    (store) => {
      // selectStore persists the choice and hard-reloads the app.
      selectStore(store);
    },
    [selectStore],
  );

  // Render
  if (isSuperAdmin) {
    return (
      <div className="s-header__store">
        <span className="s-header__admin-badge">
          <IconHatGlasses
            className="s-header__store-switch-icon"
            strokeWidth={1.5}
          />
          {t("nav.adminBadge")}
        </span>
      </div>
    );
  }

  if (!activeStore) return null;

  return (
    <div className="s-header__store">
      {hasMultipleStores ? (
        <>
          <button
            aria-label={t("nav.switchStore")}
            className="s-header__store-switch"
            onClick={handleOpenSwitcher}
            type="button"
          >
            <IconStore
              className="s-header__store-switch-icon"
              strokeWidth={1.5}
            />
            {activeStore.store_name}
            <IconChevronDown
              className="s-header__store-switch-chevron"
              size={16}
              strokeWidth={1.5}
            />
          </button>
          <div className="s-header__store-modal-wrapper">
            <Modal
              description={t("nav.switchStoreModal.description")}
              onClose={handleCloseSwitcher}
              open={switcherOpen}
              title={t("nav.switchStoreModal.heading")}
            >
              <div className="s-header__store-modal">
                <img
                  className="s-header__store-modal__image"
                  src="/images/modals/store-switch.svg"
                />
                <div className="s-header__store-modal__switcher">
                  <StoreSelect
                    onSelect={handleSelectStore}
                    renderMeta={(store) => t(`roles.${store.role}`)}
                    stores={otherStores}
                  />
                </div>
              </div>
            </Modal>
          </div>
        </>
      ) : (
        <div className="s-header__store-label">
          <IconStore className="s-header__store-label-icon" strokeWidth={1.5} />
          <span className="s-header__store-label-name">
            {activeStore.store_name}
          </span>
        </div>
      )}
    </div>
  );
};

export default Store;
