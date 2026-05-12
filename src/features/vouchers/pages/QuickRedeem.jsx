import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import Button from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import { voucherPath, voucherRedeemPath } from "@/constants/routes";
import VoucherCodeInput, {
  CODE_LENGTH,
} from "@/features/vouchers/components/VoucherCodeInput";
import { formatVoucherCode, isVoucherExpired } from "@/features/vouchers/utils";
import { useMain } from "@/hooks/useMain";
import { useModal } from "@/hooks/useModal";
import { get } from "@/services/api";

/**
 * Component: QuickRedeem
 * Modal that looks up a voucher by code and redirects to the full
 * redeem flow on success, or shows an empty state if the code isn't
 * found, the voucher has expired, or it has no balance left.
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
  const title = t("features.vouchers.redeem.heading");
  const description = t("features.vouchers.quickRedeem.description");
  const setHeader = isModal ? setModalHeader : setMainHeader;
  const backgroundLocation = location.state?.backgroundLocation || location;

  // Handlers
  const handleCodeChange = useCallback((raw) => {
    setCode(raw);
  }, []);

  const handleLookup = useCallback(async () => {
    setIsLooking(true);

    const formatted = formatVoucherCode(code);

    try {
      const { data } = await get(
        `/api/vouchers/lookup?code=${encodeURIComponent(formatted)}`,
      );

      if (isVoucherExpired(data.expires_at)) {
        setLookupResult({
          status: "expired",
          code: formatted,
          voucherId: data.id,
        });
        return;
      }

      if (data.balance === 0) {
        setLookupResult({
          status: "used-up",
          code: formatted,
          voucherId: data.id,
        });
        return;
      }

      navigate(voucherRedeemPath(data.id), {
        replace: true,
        state: { backgroundLocation },
      });
    } catch (error) {
      if (error.code === "VOUCHER_NOT_FOUND") {
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
      <div className="p-voucher-quick-redeem">
        <div className="p-voucher-quick-redeem__empty-state">
          {lookupResult.status === "not-found" && (
            <EmptyState
              action={{
                text: t("common.tryAgain"),
                onClick: handleTryAgain,
              }}
              description={t("features.vouchers.quickRedeem.notFound", {
                code: lookupResult.code,
              })}
              image="redeem-voucher--not-found"
            />
          )}

          {lookupResult.status === "expired" && (
            <EmptyState
              action={{
                text: t("features.vouchers.quickRedeem.viewVoucher"),
                to: voucherPath(lookupResult.voucherId),
                state: { backgroundLocation },
              }}
              description={t("features.vouchers.quickRedeem.expired", {
                code: lookupResult.code,
              })}
              image="redeem-voucher--expired"
            />
          )}

          {lookupResult.status === "used-up" && (
            <EmptyState
              action={{
                text: t("features.vouchers.quickRedeem.viewVoucher"),
                to: voucherPath(lookupResult.voucherId),
                state: { backgroundLocation },
              }}
              description={t("features.vouchers.quickRedeem.usedUp", {
                code: lookupResult.code,
              })}
              image="redeem-voucher--used-up"
            />
          )}

          {lookupResult.status === "error" && (
            <EmptyState
              action={{
                text: t("common.tryAgain"),
                onClick: handleTryAgain,
              }}
              description={t("features.vouchers.quickRedeem.error")}
              image="redeem-voucher--error"
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-voucher-quick-redeem">
      <div className="p-voucher-quick-redeem__input">
        <VoucherCodeInput autoFocus onChange={handleCodeChange} value={code} />
      </div>

      <div className="p-voucher-quick-redeem__actions">
        <Button
          disabled={code.length !== CODE_LENGTH}
          display="block"
          isProcessing={isLooking}
          onClick={handleLookup}
        >
          {t("features.vouchers.quickRedeem.submit")}
        </Button>
      </div>
    </div>
  );
};

export default QuickRedeem;
