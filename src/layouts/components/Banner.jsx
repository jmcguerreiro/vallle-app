import { useTranslation } from "react-i18next";

import { useAuth } from "@/hooks/useAuth";

/**
 * Layout: Banner
 * Top-of-shell alert banner. Currently shown when the active store is suspended.
 * @component
 * @returns {JSX.Element|null}
 */
const Banner = () => {
  // Hooks
  const { t } = useTranslation();
  const { isStoreSuspended } = useAuth();

  // Render
  if (!isStoreSuspended) return null;

  return (
    <div className="s-banner" role="alert">
      {t("features.storeSuspended.banner")}
    </div>
  );
};

export default Banner;
