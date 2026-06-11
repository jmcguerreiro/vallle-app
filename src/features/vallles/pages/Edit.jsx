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
import { get, put } from "@/services/api";
import { formatCurrency } from "@/utils/currency";

const STATUS_VARIANTS = {
  active: "success",
  expired: "danger",
};

/**
 * Component: VallleEdit
 * Form for editing an existing vallle. Only buyer and expiry date
 * are editable; amount is shown read-only. The save and archive/restore
 * buttons live in the modal/drawer footer (via the header actions),
 * not in the form body.
 * @component
 * @returns {JSX.Element}
 */
const VallleEdit = () => {
  // Hooks
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { setHeader } = useModal();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const {
    register,
    handleSubmit,
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

  const toggleArchive = useMutation({
    mutationFn: (nextStatus) =>
      put(`/api/vallles/${id}`, { status: nextStatus }),
    onSuccess: (_data, nextStatus) => {
      queryClient.invalidateQueries({ queryKey: ["vallles"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      addToast(
        t(
          `features.vallles.edit.${nextStatus === "archived" ? "archiveSuccess" : "restoreSuccess"}`,
        ),
        "success",
      );
    },
    onError: (error) => {
      addToast(
        error.message || t("features.vallles.edit.error.generic"),
        "error",
      );
    },
  });

  // The mutation result objects are fresh references every render; only the
  // stable mutate functions may be hook dependencies, otherwise the header
  // effect (setHeader → context update → re-render) loops forever.
  const { mutate: update } = updateVallle;
  const { mutate: toggleArchiveStatus } = toggleArchive;

  // State
  const [serverError, setServerError] = useState(null);

  // Derived State
  const title = t("features.vallles.edit.heading");
  const description = t("features.vallles.edit.description");

  const statusKey = useMemo(() => {
    if (!vallle) return "active";
    if (vallle.status === "archived") return "archived";
    if (isVallleExpired(vallle.expires_at)) return "expired";
    if (vallle.balance === 0) return "used";
    return "active";
  }, [vallle]);

  const statusLabel = useMemo(() => {
    if (!vallle) return "";
    if (vallle.status === "archived")
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

  const isArchived = vallle?.status === "archived";
  const canToggleArchive =
    vallle?.status === "active" || vallle?.status === "archived";

  // Handlers
  const onSubmit = useCallback(
    (values) => {
      setServerError(null);
      update({
        buyer: values.buyer || null,
        expires_at: new Date(values.expires_at).toISOString(),
      });
    },
    [update],
  );

  const handleToggleArchive = useCallback(() => {
    const nextStatus = isArchived ? "active" : "archived";
    const confirmKey = isArchived ? "restoreConfirm" : "archiveConfirm";
    if (!globalThis.confirm(t(`features.vallles.edit.${confirmKey}`))) return;
    toggleArchiveStatus(nextStatus);
  }, [isArchived, t, toggleArchiveStatus]);

  // Effects
  useEffect(() => {
    if (vallle) {
      reset({
        buyer: vallle.buyer || "",
        expires_at: vallle.expires_at ? vallle.expires_at.slice(0, 10) : "",
      });
    }
  }, [vallle, reset]);

  useEffect(() => {
    const actions = [];

    if (canToggleArchive) {
      actions.push({
        label: t(`features.vallles.edit.${isArchived ? "restore" : "archive"}`),
        onClick: handleToggleArchive,
      });
    }

    if (vallle) {
      actions.push({
        label: t("features.vallles.edit.submit"),
        onClick: handleSubmit(onSubmit),
        skin: "primary",
        isProcessing: updateVallle.isPending,
      });
    }

    setHeader({ title, description, actions });
    return () => setHeader();
  }, [
    title,
    description,
    setHeader,
    vallle,
    canToggleArchive,
    isArchived,
    handleToggleArchive,
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

  return (
    <div className="p-vallle-edit">
      <Form error={serverError} handleSubmit={handleSubmit} onSubmit={onSubmit}>
        <div className="p-vallle-edit__hero">
          <Badge variant={STATUS_VARIANTS[statusKey]}>{statusLabel}</Badge>
          <h2
            className={`p-vallle-edit__code${statusKey === "active" ? "" : " p-vallle-edit__code--inactive"}`}
          >
            {vallle.code}
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
        </FormFields>
      </Form>
    </div>
  );
};

export default VallleEdit;
