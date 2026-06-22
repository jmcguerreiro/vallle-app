import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import { useMutation } from "@tanstack/react-query";

import Button from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import { valllePath } from "@/constants/routes";
import VallleCodeInput, {
  CODE_LENGTH,
} from "@/features/vallles/components/VallleCodeInput";
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
  const { setHeader } = useModal();

  // Derived State
  const title = t("features.vallles.view.heading");
  const description = t("features.vallles.quickLookup.description");
  const backgroundLocation = location.state?.backgroundLocation || location;

  // Mutations
  const lookupVallle = useMutation({
    mutationFn: (submittedCode) =>
      get(`/api/vallles/lookup?code=${encodeURIComponent(submittedCode)}`),
    onSuccess: ({ data }) => {
      navigate(valllePath(data.id), {
        replace: true,
        state: { backgroundLocation },
      });
    },
    onError: (error, submittedCode) => {
      setLookupResult({
        status: error.code === "VALLLE_NOT_FOUND" ? "not-found" : "error",
        code: submittedCode,
      });
    },
  });

  // State
  const [code, setCode] = useState("");
  const [lookupResult, setLookupResult] = useState(null);

  // Handlers
  const handleCodeChange = useCallback((raw) => {
    setCode(raw);
  }, []);

  const handleLookup = useCallback(() => {
    lookupVallle.mutate(code);
  }, [code, lookupVallle]);

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
          isProcessing={lookupVallle.isPending}
          onClick={handleLookup}
        >
          {t("features.vallles.quickLookup.submit")}
        </Button>
      </div>
    </div>
  );
};

export default QuickLookup;
