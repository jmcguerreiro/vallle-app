import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import EmptyState from "@/components/EmptyState";
import Form from "@/components/forms/Form";
import FormFields from "@/components/forms/FormFields";
import Input from "@/components/forms/Input";
import Select from "@/components/forms/Select";
import Loader from "@/components/Loader";
import { PLAN_IDS } from "@/constants/plans";
import { useConfirm } from "@/hooks/useConfirm";
import { useModal } from "@/hooks/useModal";
import { useToast } from "@/hooks/useToast";
import { del, get, put } from "@/services/api";

import { plusOneYear } from "../utils";

/**
 * Component: AdminSubscriptionEdit
 * Form for editing a subscription period: dates, plan, amount, paid date
 * (clearable — corrects a mistaken mark-as-paid), and notes. The start date
 * is only editable on the company's first period — every later start is
 * anchored to the previous period — and moving it pulls the end along to one
 * year later. Unpaid periods recorded by mistake can be deleted. Super admin
 * only.
 * @component
 * @returns {JSX.Element}
 */
const AdminSubscriptionEdit = () => {
  // Hooks
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { setHeader } = useModal();
  const { confirm } = useConfirm();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm();

  // Queries
  const {
    data: response,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["admin", "subscriptions", id],
    queryFn: ({ signal }) =>
      get(`/api/admin/subscriptions/periods/${id}`, { signal }),
  });

  // Mutations
  const updatePeriod = useMutation({
    mutationFn: (payload) =>
      put(`/api/admin/subscriptions/periods/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "companies"] });
      addToast(t("features.admin.subscriptions.periodEdit.success"), "success");
      navigate(-1);
    },
    onError: (error) => {
      setServerError(
        error.message ||
          t("features.admin.subscriptions.periodEdit.error.generic"),
      );
    },
  });

  const deletePeriod = useMutation({
    mutationFn: () => del(`/api/admin/subscriptions/periods/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "companies"] });
      addToast(
        t("features.admin.subscriptions.periodEdit.deleteSuccess"),
        "success",
      );
      navigate(-1);
    },
    onError: (error) => {
      setServerError(
        error.message ||
          t("features.admin.subscriptions.periodEdit.error.delete"),
      );
    },
  });

  // The mutation result object is a fresh reference every render; only the
  // stable mutate function may be a hook dependency, otherwise the header
  // effect (setHeader → context update → re-render) loops forever.
  const { mutate: update } = updatePeriod;
  const { mutate: remove } = deletePeriod;

  // State
  const [serverError, setServerError] = useState(null);

  // Refs
  // The start date the end was last derived from, so the auto-shift below
  // only fires on a user edit, not on the initial reset.
  const appliedStartRef = useRef(null);

  // Derived State
  const period = response?.data?.period;
  const isFirst = Boolean(response?.data?.is_first);
  const planOptions = PLAN_IDS.map((planId) => ({
    value: planId,
    label: t(`constants.plans.${planId}`),
  }));
  const periodStart = watch("period_start");

  // Handlers
  const onSubmit = useCallback(
    (values) => {
      setServerError(null);
      update({
        plan: values.plan,
        period_start: values.period_start,
        period_end: values.period_end,
        amount: Math.round(Number.parseFloat(values.amount) * 100),
        paid_at: values.paid_at,
        notes: values.notes,
      });
    },
    [update],
  );

  const handleDelete = useCallback(async () => {
    const confirmed = await confirm({
      title: t("features.admin.subscriptions.periodEdit.deleteConfirm.title"),
      message: t(
        "features.admin.subscriptions.periodEdit.deleteConfirm.message",
      ),
      confirmLabel: t("features.admin.subscriptions.periodEdit.delete"),
    });
    if (!confirmed) return;
    setServerError(null);
    remove();
  }, [confirm, t, remove]);

  // Effects
  useEffect(() => {
    setHeader({
      title: t("features.admin.subscriptions.periodEdit.heading"),
      description: t("features.admin.subscriptions.periodEdit.description"),
      actions: period
        ? [
            // A paid period is part of the payment log — no delete. Clear the
            // paid date first if it really has to go.
            ...(period.paid_at
              ? []
              : [
                  {
                    label: t("features.admin.subscriptions.periodEdit.delete"),
                    onClick: handleDelete,
                    skin: "danger",
                    isProcessing: deletePeriod.isPending,
                  },
                ]),
            {
              label: t("features.admin.subscriptions.periodEdit.submit"),
              onClick: handleSubmit(onSubmit),
              skin: "primary",
              isProcessing: updatePeriod.isPending,
            },
          ]
        : [],
    });
    return () => setHeader();
  }, [
    setHeader,
    t,
    period,
    handleSubmit,
    onSubmit,
    handleDelete,
    updatePeriod.isPending,
    deletePeriod.isPending,
  ]);

  useEffect(() => {
    if (!period) return;
    appliedStartRef.current = period.period_start.slice(0, 10);
    reset({
      plan: period.plan,
      period_start: period.period_start.slice(0, 10),
      period_end: period.period_end.slice(0, 10),
      amount: (period.amount / 100).toFixed(2),
      paid_at: period.paid_at ? period.paid_at.slice(0, 10) : "",
      notes: period.notes ?? "",
    });
  }, [period, reset]);

  // Moving the start (first year only) pulls the end along to one year later
  // — the pre-fill stays a suggestion, the field remains editable.
  useEffect(() => {
    if (!periodStart || appliedStartRef.current === periodStart) return;
    appliedStartRef.current = periodStart;
    setValue("period_end", plusOneYear(periodStart));
  }, [periodStart, setValue]);

  // Render
  if (isPending) {
    return (
      <div className="c-page-state">
        <Loader />
      </div>
    );
  }

  if (isError || !period) {
    return (
      <div className="c-page-state">
        <EmptyState
          description={t("common.error")}
          hideImageOnMobile
          image="companies--error"
        />
      </div>
    );
  }

  return (
    <Form error={serverError} handleSubmit={handleSubmit} onSubmit={onSubmit}>
      <FormFields>
        <div className="c-form__field">
          <label className="c-form__field-label" htmlFor="company-readonly">
            {t("features.admin.subscriptions.form.company")}
          </label>
          <input
            className="c-form__field-input c-form__field-input--readonly"
            id="company-readonly"
            readOnly
            tabIndex={-1}
            value={period.store_name ?? ""}
          />
        </div>
        <Select
          control={control}
          error={errors.plan}
          label={t("features.admin.subscriptions.form.plan")}
          name="plan"
          options={planOptions}
          placeholder={t("features.admin.subscriptions.form.plan")}
        />
        <Input
          error={errors.period_start}
          hint={
            isFirst
              ? t("features.admin.subscriptions.form.periodStartFirstHint")
              : t("features.admin.subscriptions.form.periodStartLockedHint")
          }
          label={t("features.admin.subscriptions.form.periodStart")}
          name="period_start"
          readOnly={!isFirst}
          register={register}
          required={t(
            "features.admin.subscriptions.form.error.periodStartRequired",
          )}
          type="date"
        />
        <Input
          error={errors.period_end}
          hint={t("features.admin.subscriptions.form.periodEndHint")}
          label={t("features.admin.subscriptions.form.periodEnd")}
          name="period_end"
          register={register}
          required={t(
            "features.admin.subscriptions.form.error.periodEndRequired",
          )}
          type="date"
          validate={{
            afterStart: (v) =>
              !v ||
              !periodStart ||
              v > periodStart ||
              t("features.admin.subscriptions.form.error.periodEndAfterStart"),
          }}
        />
        <Input
          error={errors.amount}
          hint={t("features.admin.subscriptions.form.amountHint")}
          inputMode="decimal"
          label={t("features.admin.subscriptions.form.amount")}
          name="amount"
          register={register}
          required={t("features.admin.subscriptions.form.error.amountRequired")}
          type="number"
          validate={{
            nonNegative: (v) =>
              Number.parseFloat(v) >= 0 ||
              t("features.admin.subscriptions.form.error.amountInvalid"),
          }}
        />
        <Input
          error={errors.paid_at}
          hint={t("features.admin.subscriptions.form.paidAtEditHint")}
          label={t("features.admin.subscriptions.form.paidAt")}
          name="paid_at"
          register={register}
          type="date"
        />
        <Input
          autoComplete="off"
          error={errors.notes}
          hint={t("features.admin.subscriptions.form.notesHint")}
          label={t("features.admin.subscriptions.form.notes")}
          multiline
          name="notes"
          register={register}
        />
      </FormFields>
    </Form>
  );
};

export default AdminSubscriptionEdit;
