import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router-dom";

import Loader from "@/components/Loader";
import StoreSelect from "@/components/StoreSelect";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/hooks/useAuth";

/**
 * Component: SelectStore
 * Intermediate page shown after login when a user has multiple stores.
 * Lets the user pick which store to work with.
 * @component
 * @returns {JSX.Element}
 */
const SelectStore = () => {
  // Hooks
  const { t } = useTranslation();
  const { user, isAuthenticated, isLoading, selectStore } = useAuth();
  const navigate = useNavigate();

  // Handlers
  const handleSelect = useCallback(
    (store) => {
      selectStore(store);
      navigate(ROUTES.HOME);
    },
    [selectStore, navigate],
  );

  // Render
  if (isLoading) {
    return <Loader />;
  }

  if (!isAuthenticated) {
    return <Navigate replace to={ROUTES.LOGIN} />;
  }

  return (
    <div className="p-auth-select-store">
      <div className="p-auth-select-store__header">
        <h1 className="p-auth-select-store__header-title">
          {t("features.selectStore.heading")}
        </h1>
        <div className="p-auth-select-store__header-description">
          {t("features.selectStore.description")}
        </div>
      </div>
      <div className="p-auth-select-store__body">
        <div className="p-auth-select-store__body-picker">
          <StoreSelect
            onSelect={handleSelect}
            renderMeta={(store) => store.role}
            stores={user?.stores}
          />
        </div>
      </div>
    </div>
  );
};

export default SelectStore;
