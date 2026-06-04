import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import Button from "@/components/Button";
import { ROUTES, valllePath } from "@/constants/routes";
import { useAuth } from "@/hooks/useAuth";
import { useConfetti } from "@/hooks/useConfetti";
import { useModal } from "@/hooks/useModal";
import { useToast } from "@/hooks/useToast";
import { post } from "@/services/api";

/**
 * Component: VallleCreate
 * Creates a vallle with a hero amount input, a minimal buyer field, and a
 * fixed expiry derived from the store's default vallle expiry setting.
 * @component
 * @returns {JSX.Element}
 */
const VallleCreate = () => {
  // Hooks
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { isStoreSuspended, activeStore } = useAuth();
  const { setHeader } = useModal();
  const { addToast } = useToast();
  const { fire: fireConfetti } = useConfetti();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  // State
  const [serverError, setServerError] = useState(null);

  // Derived State
  const title = t("features.vallles.create.heading");
  const description = t("features.vallles.create.description");

  const expiryDate = useMemo(() => {
    const days = activeStore?.default_vallle_expiry_days || 365;
    return new Date(Date.now() + days * 86_400_000);
  }, [activeStore]);

  const expiryLabel = useMemo(() => {
    const formatted = expiryDate.toLocaleDateString(
      i18n.language === "en" ? "en-GB" : "pt-PT",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      },
    );
    return t("features.vallles.create.validUntil", { date: formatted });
  }, [expiryDate, i18n.language, t]);

  // Mutations
  const createVallle = useMutation({
    mutationFn: (payload) => post("/api/vallles", payload),
    onSuccess: ({ data: vallle }) => {
      queryClient.invalidateQueries({ queryKey: ["vallles"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      addToast(t("features.vallles.create.success"), "success");
      fireConfetti();
      const backgroundLocation = location.state?.backgroundLocation || location;
      navigate(valllePath(vallle.id), {
        replace: true,
        state: { backgroundLocation },
      });
    },
    onError: (error) => {
      setServerError(
        error.message || t("features.vallles.create.error.generic"),
      );
    },
  });

  // Handlers
  const onSubmit = useCallback(
    (values) => {
      setServerError(null);
      createVallle.mutate({
        amount: Math.round(Number.parseFloat(values.amount) * 100),
        buyer: values.buyer?.trim() || null,
        expires_at: expiryDate.toISOString(),
      });
    },
    [createVallle, expiryDate],
  );

  // Effects
  useEffect(() => {
    if (isStoreSuspended) navigate(ROUTES.VALLLES, { replace: true });
  }, [isStoreSuspended, navigate]);

  useEffect(() => {
    setHeader({ title, description });
    return () => setHeader();
  }, [title, description, setHeader]);

  // Render
  return (
    <form
      className="p-vallle-create"
      noValidate
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className="p-vallle-create__amount">
        <div className="p-vallle-create__amount-input">
          <input
            aria-label={t("features.vallles.create.amount")}
            autoComplete="off"
            autoFocus={true}
            className="p-vallle-create__amount-input-amount"
            inputMode="decimal"
            placeholder={t("features.vallles.create.amountPlaceholder")}
            size="3"
            type="text"
            {...register("amount", {
              required: t("features.vallles.create.error.amountRequired"),
              validate: {
                positive: (v) =>
                  Number.parseFloat(v) > 0 ||
                  t("features.vallles.create.error.amountPositive"),
              },
            })}
          />
          <span className="p-vallle-create__amount-input-currency">€</span>
        </div>
        {errors.amount && (
          <div className="p-vallle-create__amount-error">
            {errors.amount.message}
          </div>
        )}
      </div>

      <div className="p-vallle-create__buyer">
        <label className="p-vallle-create__buyer-label" htmlFor="buyer">
          {t("features.vallles.create.buyer")}
        </label>
        <input
          autoComplete="off"
          className={`p-vallle-create__buyer-input${errors.buyer ? " p-vallle-create__buyer-input--error" : ""}`}
          id="buyer"
          placeholder={t("features.vallles.create.buyerPlaceholder")}
          type="text"
          {...register("buyer", {
            required: t("features.vallles.create.error.buyerRequired"),
          })}
        />
        {errors.buyer && (
          <div className="p-vallle-create__buyer-error">
            {errors.buyer.message}
          </div>
        )}
      </div>

      <div className="p-vallle-create__expiry">{expiryLabel}</div>

      {serverError && <div className="c-form__error">{serverError}</div>}

      <div className="p-vallle-create__actions">
        <Button
          display="block"
          isProcessing={createVallle.isPending}
          type="submit"
        >
          {t("features.vallles.create.submit")}
        </Button>
      </div>
    </form>
  );
};

export default VallleCreate;
