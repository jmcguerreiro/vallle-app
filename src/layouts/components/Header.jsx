import { useTranslation } from "react-i18next";

import { IconCircleHelp } from "@/utils/icons";

import Store from "./header/Store";
import User from "./header/User";

/**
 * Layout: Header
 * Top bar displaying the app logo, navigation menu, store switcher, help link, and user menu.
 * @component
 * @returns {JSX.Element}
 */
const Header = () => {
  // Hooks
  const { t } = useTranslation();

  // Render
  return (
    <header className="s-header">
      <div className="s-header__wrapper">
        <Store />

        <div className="s-header__extra">
          <a
            aria-label={t("nav.help")}
            className="s-header__help"
            href="https://docs.vallle.com"
          >
            <IconCircleHelp
              aria-hidden="true"
              className="s-header__help-icon"
              strokeWidth="1.5"
            />
          </a>

          <User />
        </div>
      </div>
    </header>
  );
};

export default Header;
