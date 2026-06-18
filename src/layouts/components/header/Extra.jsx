import { useTranslation } from "react-i18next";

import { IconCircleHelp } from "@/utils/icons";

import User from "./User";

/**
 * Component: Extra
 * Header trailing cluster grouping the help link and the user menu.
 * @component
 * @returns {JSX.Element}
 */
const Extra = () => {
  // Hooks
  const { t } = useTranslation();

  // Render
  return (
    <div className="s-header__extra">
      <a
        aria-label={t("nav.help")}
        className="s-header__help"
        href="https://docs.vallle.com"
      >
        <IconCircleHelp
          aria-hidden="true"
          className="s-header__help-icon"
          strokeWidth={1.5}
        />
      </a>

      <User />
    </div>
  );
};

export default Extra;
