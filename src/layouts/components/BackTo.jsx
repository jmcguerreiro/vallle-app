import { useTranslation } from "react-i18next";

import { EXTERNAL_LINKS } from "@/constants/external-links";
import { IconArrowLeft } from "@/utils/icons";

/**
 * Component: BackTo
 * Renders a link back to the main Vallle website.
 * Used in unauthenticated layouts (e.g. login, forgot password).
 * @component
 * @returns {JSX.Element}
 */
const BackTo = () => {
  // Hooks
  const { t } = useTranslation();

  // Render
  return (
    <div className="s-back-to">
      <a
        className="s-back-to__link"
        href={EXTERNAL_LINKS.WEBSITE}
        title={t("layouts.backTo.website")}
      >
        <IconArrowLeft className="s-back-to__link-icon" size={16} />
      </a>
    </div>
  );
};

export default BackTo;
