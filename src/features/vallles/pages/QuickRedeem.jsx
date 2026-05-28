import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import Button from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import { valllePath, vallleRedeemPath } from "@/constants/routes";
import VallleCodeInput, {
  CODE_LENGTH,
} from "@/features/vallles/components/VallleCodeInput";
import { formatVallleCode, isVallleExpired } from "@/features/vallles/utils";
import { useMain } from "@/hooks/useMain";
import { useModal } from "@/hooks/useModal";
import { get } from "@/services/api";

/**
 * Component: QuickRedeem
 * Modal that looks up a vallle by code and redirects to the full
 * redeem flow on success, or shows an empty state if the code isn't
 * found, the vallle has expired, or it has no balance left.
 * @component
 * @returns {JSX.Element}
 */
const QuickRedeem = () => {
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
  const title = t("features.vallles.redeem.heading");
  const description = t("features.vallles.quickRedeem.description");
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

      if (isVallleExpired(data.expires_at)) {
        setLookupResult({
          status: "expired",
          code: formatted,
          vallleId: data.id,
        });
        return;
      }

      if (data.balance === 0) {
        setLookupResult({
          status: "used-up",
          code: formatted,
          vallleId: data.id,
        });
        return;
      }

      navigate(vallleRedeemPath(data.id), {
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
      <div className="p-vallle-quick-redeem">
        <div className="p-vallle-quick-redeem__empty-state">
          {lookupResult.status === "not-found" && (
            <EmptyState
              action={{
                text: t("common.tryAgain"),
                onClick: handleTryAgain,
              }}
              description={t("features.vallles.quickRedeem.notFound", {
                code: lookupResult.code,
              })}
              image="redeem-vallle--not-found"
            />
          )}

          {lookupResult.status === "expired" && (
            <EmptyState
              action={{
                text: t("features.vallles.quickRedeem.viewVallle"),
                to: valllePath(lookupResult.vallleId),
                state: { backgroundLocation },
              }}
              description={t("features.vallles.quickRedeem.expired", {
                code: lookupResult.code,
              })}
              image="redeem-vallle--expired"
            />
          )}

          {lookupResult.status === "used-up" && (
            <EmptyState
              action={{
                text: t("features.vallles.quickRedeem.viewVallle"),
                to: valllePath(lookupResult.vallleId),
                state: { backgroundLocation },
              }}
              description={t("features.vallles.quickRedeem.usedUp", {
                code: lookupResult.code,
              })}
              image="redeem-vallle--used-up"
            />
          )}

          {lookupResult.status === "error" && (
            <EmptyState
              action={{
                text: t("common.tryAgain"),
                onClick: handleTryAgain,
              }}
              description={t("features.vallles.quickRedeem.error")}
              image="redeem-vallle--error"
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-vallle-quick-redeem">
      <div className="p-vallle-quick-redeem__input">
        <VallleCodeInput autoFocus onChange={handleCodeChange} value={code} />
      </div>

      <div className="p-vallle-quick-redeem__actions">
        <Button
          disabled={code.length !== CODE_LENGTH}
          display="block"
          isProcessing={isLooking}
          onClick={handleLookup}
        >
          {t("features.vallles.quickRedeem.submit")}
        </Button>
      </div>
    </div>
  );
};

export default QuickRedeem;
