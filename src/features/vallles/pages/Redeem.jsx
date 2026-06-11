import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Badge from "@/components/Badge";
import EmptyState from "@/components/EmptyState";
import Form from "@/components/forms/Form";
import FormFields from "@/components/forms/FormFields";
import Input from "@/components/forms/Input";
import Loader from "@/components/Loader";
import { isVallleExpired } from "@/features/vallles/utils";
import { useModal } from "@/hooks/useModal";
import { useToast } from "@/hooks/useToast";
import { get, post } from "@/services/api";
import { formatCurrency } from "@/utils/currency";

const STATUS_VARIANTS = {
  active: "success",
  expired: "danger",
};

/**
 * Component: VallleRedeem
 * Form for redeeming (partially or fully) a vallle.
 * Shows the vallle code and status, then accepts an amount and a
 * mandatory description. The submit button lives in the modal/drawer
 * footer (via the header actions), not in the form body.
 * @component
 * @returns {JSX.Element}
 */
const VallleRedeem = () => {
  // Hooks
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const { setHeader } = useModal();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  // Queries
  const {
    data: response,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["vallles", id],
    queryFn: ({ signal }) => get(`/api/vallles/${id}`, { signal }),
  });

  const vallle = response?.data;

  // Mutations
  const redeemVallle = useMutation({
    mutationFn: (payload) => post(`/api/vallles/${id}/redeem`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vallles"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      addToast(t("features.vallles.redeem.success"), "success");
      navigate(-1);
    },
    onError: (error) => {
      const codeMap = {
        VALLLE_EXPIRED: t("features.vallles.redeem.error.expired"),
        VALLLE_INSUFFICIENT_BALANCE: t(
          "features.vallles.redeem.error.insufficientBalance",
        ),
      };
      setServerError(
        codeMap[error.code] ||
          error.message ||
          t("features.vallles.redeem.error.generic"),
      );
    },
  });

  // The mutation result object is a fresh reference every render; only the
  // stable mutate function may be a hook dependency, otherwise the header
  // effect (setHeader → context update → re-render) loops forever.
  const { mutate: redeem } = redeemVallle;

  // State
  const [serverError, setServerError] = useState(null);

  // Derived State
  const title = t("features.vallles.redeem.heading");
  const description = t("features.vallles.redeem.description");

  const statusKey = useMemo(() => {
    if (!vallle) return "active";
    if (isVallleExpired(vallle.expires_at)) return "expired";
    if (vallle.balance === 0) return "used";
    return "active";
  }, [vallle]);

  const statusLabel = useMemo(() => {
    if (!vallle) return "";
    if (isVallleExpired(vallle.expires_at))
      return t("features.vallles.list.expired");
    if (vallle.balance === 0) return t("features.vallles.list.used");
    return t("features.vallles.list.active");
  }, [vallle, t]);

  const amountHint = useMemo(() => {
    if (!vallle) return "";
    return t("features.vallles.redeem.amountHint", {
      balance: formatCurrency(vallle.balance),
    });
  }, [vallle, t]);

  // Handlers
  const onSubmit = useCallback(
    (values) => {
      setServerError(null);
      redeem({
        amount: Math.round(Number.parseFloat(values.amount) * 100),
        description: values.description.trim(),
      });
    },
    [redeem],
  );

  // Effects
  useEffect(() => {
    const actions = vallle
      ? [
          {
            label: t("features.vallles.redeem.submit"),
            onClick: handleSubmit(onSubmit),
            skin: "primary",
            isProcessing: redeemVallle.isPending,
          },
        ]
      : [];

    setHeader({ title, description, actions });
    return () => setHeader();
  }, [
    title,
    description,
    setHeader,
    vallle,
    handleSubmit,
    onSubmit,
    redeemVallle.isPending,
    t,
  ]);

  // Render
  if (isPending) {
    return (
      <div className="p-vallle-redeem">
        <div className="p-vallle-redeem__loading">
          <Loader />
        </div>
      </div>
    );
  }

  if (isError || !vallle) {
    return (
      <div className="p-vallle-redeem">
        <div className="p-vallle-redeem__error">
          <EmptyState
            description={t("common.error")}
            hideImageOnMobile
            image="vallles--error"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-vallle-redeem">
      <Form error={serverError} handleSubmit={handleSubmit} onSubmit={onSubmit}>
        <div className="p-vallle-redeem__hero">
          <Badge variant={STATUS_VARIANTS[statusKey]}>{statusLabel}</Badge>
          <h2
            className={`p-vallle-redeem__code${statusKey === "active" ? "" : " p-vallle-redeem__code--inactive"}`}
          >
            {vallle.code}
          </h2>
        </div>

        <FormFields>
          <Input
            autoComplete="off"
            error={errors.amount}
            hint={amountHint}
            inputMode="decimal"
            label={t("features.vallles.redeem.amount")}
            name="amount"
            placeholder={t("features.vallles.redeem.amountPlaceholder")}
            register={register}
            required={t("features.vallles.create.error.amountRequired")}
            validate={{
              positive: (v) =>
                Number.parseFloat(v) > 0 ||
                t("features.vallles.create.error.amountPositive"),
              max: (v) =>
                Math.round(Number.parseFloat(v) * 100) <= vallle.balance ||
                t("features.vallles.redeem.error.insufficientBalance"),
            }}
          />
          <Input
            error={errors.description}
            hint={t("features.vallles.redeem.descriptionHint")}
            label={t("features.vallles.redeem.descriptionLabel")}
            multiline
            name="description"
            register={register}
            required={t("features.vallles.redeem.error.descriptionRequired")}
            validate={{
              notBlank: (v) =>
                v.trim().length > 0 ||
                t("features.vallles.redeem.error.descriptionRequired"),
            }}
          />
        </FormFields>
      </Form>
    </div>
  );
};

export default VallleRedeem;
