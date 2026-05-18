import { useTranslation } from "react-i18next";
import { Outlet } from "react-router-dom";

import Button from "@/components/Button";
import { useAuth } from "@/hooks/useAuth";
import { useMain } from "@/hooks/useMain";

/**
 * Layout: Main
 * Main content area with optional suspended banner, page-level header, and route outlet.
 * @component
 * @returns {JSX.Element}
 */
const Main = () => {
  // Hooks
  const { t } = useTranslation();
  const { isStoreSuspended } = useAuth();
  const { header } = useMain();

  // Render
  return (
    <main className="s-main">
      {isStoreSuspended && (
        <div className="s-main__banner" role="alert">
          {t("features.storeSuspended.banner")}
        </div>
      )}

      {(header.title || header.actions.length > 0 || header.image) && (
        <div className="s-main__header">
          {header.image && (
            <img
              alt=""
              className="s-main__header-image"
              src={`/images/pages/${header.image}.svg`}
            />
          )}
          {(header.title || header.description) && (
            <div className="s-main__header-titles">
              {header.title && (
                <h1 className="s-main__header-title">{header.title}</h1>
              )}
              {header.description && (
                <p className="s-main__header-description">
                  {header.description}
                </p>
              )}
            </div>
          )}
          {header.actions.length > 0 && (
            <div className="s-main__header-actions">
              {header.actions.map(({ label, icon: Icon, onClick }) => (
                <Button
                  key={label}
                  display="block"
                  iconLeft={Icon}
                  onClick={onClick}
                >
                  {label}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="s-main__content">
        <Outlet />
      </div>
    </main>
  );
};

export default Main;
