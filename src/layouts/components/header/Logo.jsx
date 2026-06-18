import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { ROUTES } from "@/constants/routes";

/**
 * Component: Logo
 * Header element linking to the dashboard root, displaying the Vallle logo.
 * @component
 * @returns {JSX.Element}
 */
const Logo = () => {
  // Hooks
  const { t } = useTranslation();

  // Render
  return (
    <Link aria-label={t("nav.home")} className="s-header-logo" to={ROUTES.HOME}>
      <img
        alt={t("nav.home")}
        className="s-header-logo__image"
        src="/images/logo.svg"
      />
    </Link>
  );
};

export default Logo;
