import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useNavigate } from "react-router-dom";

import { ChevronLeft as IconChevronLeft } from "lucide-react";

import Button from "@/components/Button";
import { ROUTES } from "@/constants/routes";
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
  const navigate = useNavigate();
  const { isStoreSuspended } = useAuth();
  const { header } = useMain();

  // Handlers
  const handleBack = useCallback(() => {
    const back = header.back;
    if (typeof back === "function") {
      back();
      return;
    }
    if (typeof back === "string") {
      navigate(back);
      return;
    }
    const sameOriginReferrer =
      document.referrer &&
      new URL(document.referrer).origin === globalThis.location.origin;
    if (sameOriginReferrer) {
      navigate(-1);
    } else {
      navigate(ROUTES.HOME);
    }
  }, [header, navigate]);

  // Render
  return (
    <main className="s-main">
      {isStoreSuspended && (
        <div className="s-main__banner" role="alert">
          {t("features.storeSuspended.banner")}
        </div>
      )}

      {(header.title || header.actions.length > 0 || header.back) && (
        <div className="s-main__header">
          <div className="s-main__header-lead">
            {header.back && (
              <Button
                ariaLabel={t("common.back")}
                iconLeft={IconChevronLeft}
                onClick={handleBack}
                tooltip={t("common.back")}
                variant="icon"
              />
            )}
            {header.title && (
              <div className="s-main__header-titles">
                <h1 className="s-main__header-title">{header.title}</h1>
                {header.subtitle && (
                  <p className="s-main__header-subtitle">{header.subtitle}</p>
                )}
              </div>
            )}
          </div>
          {header.actions.length > 0 && (
            <div className="s-main__header-actions">
              {header.actions.map(({ label, icon: Icon, onClick }) => (
                <Button
                  key={label}
                  ariaLabel={label}
                  iconLeft={Icon}
                  onClick={onClick}
                  tooltip={label}
                  variant="icon"
                />
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
