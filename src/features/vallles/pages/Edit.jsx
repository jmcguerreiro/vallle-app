import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Badge from "@/components/Badge";
import EmptyState from "@/components/EmptyState";
import Form from "@/components/forms/Form";
import FormFields from "@/components/forms/FormFields";
import Input from "@/components/forms/Input";
import MinRedemptionFields from "@/components/forms/MinRedemptionFields";
import Loader from "@/components/Loader";
import { MIN_REDEMPTION_MODES } from "@/constants/redemption";
import { valllePath } from "@/constants/routes";
import { VALLLE_STATUSES } from "@/constants/vallle-statuses";
import { formatVallleCode, isVallleExpired } from "@/features/vallles/utils";
import { useModal } from "@/hooks/useModal";
import { useToast } from "@/hooks/useToast";
import { get, put } from "@/services/api";
import { centsToEuros, eurosToCents, formatCurrency } from "@/utils/currency";

const STATUS_VARIANTS = {
  active: "success",
  expired: "danger",
};

/**
 * Component: VallleEdit
 * Form for editing an existing vallle. Only buyer and expiry date
 * are editable; amount is shown read-only. The save button lives in the
 * modal/drawer footer (via the header actions), not in the form body.
 * Archive/restore lives on the vallle View screen.
 * @component
 * @returns {JSX.Element}
 */
const VallleEdit = () => {
  // Hooks
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { setHeader } = useModal();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
    reset,
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
  const updateVallle = useMutation({
    mutationFn: (payload) => put(`/api/vallles/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vallles"] });
      addToast(t("features.vallles.edit.success"), "success");
      navigate(-1);
    },
    onError: (error) => {
      setServerError(error.message || t("features.vallles.edit.error.generic"));
    },
  });

  // The mutation result object is a fresh reference every render; only the
  // stable mutate function may be a hook dependency, otherwise the header
  // effect (setHeader → context update → re-render) loops forever.
  const { mutate: update } = updateVallle;

  // State
  const [serverError, setServerError] = useState(null);

  // Derived State
  const title = t("features.vallles.edit.heading");
  const description = t("features.vallles.edit.description");

  const statusKey = useMemo(() => {
    if (!vallle) return VALLLE_STATUSES.ACTIVE;
    if (vallle.status === VALLLE_STATUSES.ARCHIVED)
      return VALLLE_STATUSES.ARCHIVED;
    if (isVallleExpired(vallle.expires_at)) return VALLLE_STATUSES.EXPIRED;
    if (vallle.balance === 0) return VALLLE_STATUSES.USED;
    return VALLLE_STATUSES.ACTIVE;
  }, [vallle]);

  const statusLabel = useMemo(() => {
    if (!vallle) return "";
    if (vallle.status === VALLLE_STATUSES.ARCHIVED)
      return t("features.vallles.list.archived");
    if (isVallleExpired(vallle.expires_at))
      return t("features.vallles.list.expired");
    if (vallle.balance === 0) return t("features.vallles.list.used");
    return t("features.vallles.list.active");
  }, [vallle, t]);

  const heroSubtitle = useMemo(() => {
    if (!vallle) return "";
    return t("features.vallles.view.balanceSummary", {
      total: formatCurrency(vallle.amount),
      balance: formatCurrency(vallle.balance),
    });
  }, [vallle, t]);

  // Editable only while there's a balance to act on and it isn't archived —
  // mirrors the gate on the View screen. Used and archived vallles get bounced
  // back to View (handles someone hitting the edit URL directly).
  const canEdit =
    vallle && vallle.status !== VALLLE_STATUSES.ARCHIVED && vallle.balance > 0;

  // Handlers
  const onSubmit = useCallback(
    (values) => {
      setServerError(null);
      update({
        buyer: values.buyer || null,
        expires_at: new Date(values.expires_at).toISOString(),
        min_redemption_mode: values.minRedemptionMode,
        min_redemption_cents:
          values.minRedemptionMode === MIN_REDEMPTION_MODES.CUSTOM
            ? eurosToCents(values.minRedemptionAmount)
            : 0,
      });
    },
    [update],
  );

  // Effects
  useEffect(() => {
    if (vallle && !canEdit) {
      navigate(valllePath(id), {
        replace: true,
        state: {
          backgroundLocation: location.state?.backgroundLocation || location,
        },
      });
    }
  }, [vallle, canEdit, id, navigate, location]);

  useEffect(() => {
    if (vallle) {
      reset({
        buyer: vallle.buyer || "",
        expires_at: vallle.expires_at ? vallle.expires_at.slice(0, 10) : "",
        minRedemptionMode: vallle.min_redemption_mode,
        minRedemptionAmount: vallle.min_redemption_cents
          ? centsToEuros(vallle.min_redemption_cents)
          : "",
      });
    }
  }, [vallle, reset]);

  useEffect(() => {
    setHeader({
      title,
      description,
      actions: vallle
        ? [
            {
              label: t("features.vallles.edit.submit"),
              onClick: handleSubmit(onSubmit),
              skin: "primary",
              isProcessing: updateVallle.isPending,
            },
          ]
        : [],
    });
    return () => setHeader();
  }, [
    title,
    description,
    setHeader,
    vallle,
    handleSubmit,
    onSubmit,
    updateVallle.isPending,
    t,
  ]);

  // Render
  if (isPending) {
    return (
      <div className="p-vallle-edit">
        <div className="p-vallle-edit__loading">
          <Loader />
        </div>
      </div>
    );
  }

  if (isError || !vallle) {
    return (
      <div className="p-vallle-edit">
        <div className="p-vallle-edit__error">
          <EmptyState
            description={t("common.error")}
            hideImageOnMobile
            image="vallles--error"
          />
        </div>
      </div>
    );
  }

  // Not editable — the effect above is redirecting to View; show the loader
  // rather than flashing the form for a frame.
  if (!canEdit) {
    return (
      <div className="p-vallle-edit">
        <div className="p-vallle-edit__loading">
          <Loader />
        </div>
      </div>
    );
  }

  return (
    <div className="p-vallle-edit">
      <Form error={serverError} handleSubmit={handleSubmit} onSubmit={onSubmit}>
        <div className="p-vallle-edit__hero">
          <Badge variant={STATUS_VARIANTS[statusKey]}>{statusLabel}</Badge>
          <h2
            className={`p-vallle-edit__code${statusKey === VALLLE_STATUSES.ACTIVE ? "" : " p-vallle-edit__code--inactive"}`}
          >
            {formatVallleCode(vallle.code)}
          </h2>
          <p className="p-vallle-edit__subtitle">{heroSubtitle}</p>
        </div>

        <FormFields>
          <Input
            error={errors.buyer}
            label={t("features.vallles.edit.buyer")}
            name="buyer"
            register={register}
          />
          <Input
            error={errors.expires_at}
            label={t("features.vallles.edit.expiresAt")}
            name="expires_at"
            register={register}
            required={t("features.vallles.create.error.expiresAtRequired")}
            type="date"
            validate={{
              future: (v) =>
                new Date(v) > new Date() ||
                t("features.vallles.create.error.expiresAtFuture"),
            }}
          />
          <MinRedemptionFields
            amountName="minRedemptionAmount"
            control={control}
            errors={errors}
            modeName="minRedemptionMode"
            register={register}
            watch={watch}
          />
        </FormFields>
      </Form>
    </div>
  );
};

export default VallleEdit;
