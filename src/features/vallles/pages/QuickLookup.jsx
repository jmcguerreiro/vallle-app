import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import Button from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import { valllePath } from "@/constants/routes";
import VallleCodeInput, {
  CODE_LENGTH,
} from "@/features/vallles/components/VallleCodeInput";
import { formatVallleCode } from "@/features/vallles/utils";
import { useMain } from "@/hooks/useMain";
import { useModal } from "@/hooks/useModal";
import { get } from "@/services/api";

/**
 * Component: QuickLookup
 * Modal that looks up a vallle by code and redirects to the full
 * vallle view on success, or shows an empty state if the code
 * isn't found or the lookup fails.
 * @component
 * @returns {JSX.Element}
 */
const QuickLookup = () => {
  // Hooks
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { setHeader: setMainHeader } = useMain();
  const { setHeader: setModalHeader, isModal } = useModal();

  // State
  const [code, setCode] = useState("");
  const [isLooking, setIsLooking] = useState(false);
  const [lookupResult, setLookupResult] = useState(null);

  // Derived State
  const title = t("features.vallles.view.heading");
  const description = t("features.vallles.quickLookup.description");
  const setHeader = isModal ? setModalHeader : setMainHeader;
  const backgroundLocation = location.state?.backgroundLocation || location;

  // Handlers
  const handleCodeChange = useCallback((raw) => {
    setCode(raw);
  }, []);

  const handleLookup = useCallback(async () => {
    setIsLooking(true);

    const formatted = formatVallleCode(code);

    try {
      const { data } = await get(
        `/api/vallles/lookup?code=${encodeURIComponent(formatted)}`,
      );

      navigate(valllePath(data.id), {
        replace: true,
        state: { backgroundLocation },
      });
    } catch (error) {
      if (error.code === "VALLLE_NOT_FOUND") {
        setLookupResult({ status: "not-found", code: formatted });
      } else {
        setLookupResult({ status: "error", code: formatted });
      }
    } finally {
      setIsLooking(false);
    }
  }, [code, navigate, backgroundLocation]);

  const handleTryAgain = useCallback(() => {
    setLookupResult(null);
    setCode("");
  }, []);

  // Effects
  useEffect(() => {
    setHeader({ title, description });
    return () => setHeader();
  }, [title, description, setHeader]);

  // Render
  if (lookupResult) {
    return (
      <div className="p-vallle-quick-lookup">
        <div className="p-vallle-quick-lookup__empty-state">
          {lookupResult.status === "not-found" && (
            <EmptyState
              action={{
                text: t("common.tryAgain"),
                onClick: handleTryAgain,
              }}
              description={t("features.vallles.quickLookup.notFound", {
                code: lookupResult.code,
              })}
              image="lookup-vallle--not-found"
            />
          )}

          {lookupResult.status === "error" && (
            <EmptyState
              action={{
                text: t("common.tryAgain"),
                onClick: handleTryAgain,
              }}
              description={t("features.vallles.quickLookup.error")}
              image="lookup-vallle--error"
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-vallle-quick-lookup">
      <div className="p-vallle-quick-lookup__input">
        <VallleCodeInput autoFocus onChange={handleCodeChange} value={code} />
      </div>

      <div className="p-vallle-quick-lookup__actions">
        <Button
          disabled={code.length !== CODE_LENGTH}
          display="block"
          isProcessing={isLooking}
          onClick={handleLookup}
        >
          {t("features.vallles.quickLookup.submit")}
        </Button>
      </div>
    </div>
  );
};

export default QuickLookup;
