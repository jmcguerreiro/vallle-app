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
import { useModal } from "@/hooks/useModal";
import { useToast } from "@/hooks/useToast";
import { get, post } from "@/services/api";

import { planAnnualValue, plusOneYear } from "../utils";

/**
 * Component: AdminSubscriptionRenew
 * Records the company's next subscription period (or its first billing
 * year). The start is pre-filled with the end of the current period — paying
 * early never shifts the anniversary — the end with one year later, the plan
 * with the suggested tier (explained under the picker), and the amount with
 * the plan's annual price (0 for a founding member's free first year).
 * Super admin only.
 * @component
 * @returns {JSX.Element}
 */
const AdminSubscriptionRenew = () => {
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
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      plan: "",
      period_start: "",
      period_end: "",
      amount: "",
      paid_at: "",
      notes: "",
    },
  });

  // Queries
  const {
    data: response,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["admin", "companies", id],
    queryFn: ({ signal }) => get(`/api/admin/companies/${id}`, { signal }),
  });

  // Mutations
  const createPeriod = useMutation({
    mutationFn: (payload) => post("/api/admin/subscriptions/periods", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "companies"] });
      addToast(t("features.admin.subscriptions.renew.success"), "success");
      navigate(-1);
    },
    onError: (error) => {
      setServerError(
        error.message || t("features.admin.subscriptions.renew.error.generic"),
      );
    },
  });

  // The mutation result object is a fresh reference every render; only the
  // stable mutate function may be a hook dependency, otherwise the header
  // effect (setHeader → context update → re-render) loops forever.
  const { mutate: create } = createPeriod;

  // State
  const [serverError, setServerError] = useState(null);

  // Refs
  // Tracks the plan the amount was last derived from, so switching plans
  // refreshes the price without clobbering the pre-fill (e.g. a founding
  // member's free first year) on unrelated re-renders.
  const appliedPlanRef = useRef(null);
  // Whether the form was already pre-filled, so the effect runs once instead
  // of on every refetch.
  const prefilledRef = useRef(false);

  // Derived State
  const detail = response?.data;
  const selectedPlan = watch("plan");
  const periodStart = watch("period_start");
  const planOptions = PLAN_IDS.map((planId) => ({
    value: planId,
    label: t(`constants.plans.${planId}`),
  }));
  const planHint = detail
    ? t("features.admin.subscriptions.renew.planHint", {
        plan: t(`constants.plans.${detail.subscription.suggested_plan}`),
        count: detail.subscription.vallles_period,
      })
    : undefined;

  // Handlers
  const onSubmit = useCallback(
    (values) => {
      setServerError(null);
      create({
        store_id: id,
        plan: values.plan,
        period_start: values.period_start,
        period_end: values.period_end,
        amount: Math.round(Number.parseFloat(values.amount) * 100),
        paid_at: values.paid_at,
        notes: values.notes,
      });
    },
    [create, id],
  );

  // Effects
  useEffect(() => {
    setHeader({
      title: t("features.admin.subscriptions.renew.heading"),
      description: detail?.store.name ?? "",
      actions: [
        {
          label: t("features.admin.subscriptions.renew.submit"),
          onClick: handleSubmit(onSubmit),
          skin: "primary",
          isProcessing: createPeriod.isPending,
        },
      ],
    });
    return () => setHeader();
  }, [setHeader, t, detail, handleSubmit, onSubmit, createPeriod.isPending]);

  useEffect(() => {
    if (!detail || prefilledRef.current) return;
    prefilledRef.current = true;

    const { store, subscription } = detail;
    // Periods come sorted by period_start DESC — [0] is the latest. The next
    // period starts where it ended, whatever today's date is.
    const lastPeriod = subscription.periods[0];
    const start = lastPeriod
      ? lastPeriod.period_end.slice(0, 10)
      : new Date().toISOString().slice(0, 10);
    const plan = lastPeriod ? subscription.suggested_plan : store.plan;
    const isFreeFirstYear = !lastPeriod && Boolean(store.is_founding_member);

    appliedPlanRef.current = plan;
    setValue("plan", plan);
    setValue("period_start", start);
    setValue("period_end", plusOneYear(start));
    setValue("amount", isFreeFirstYear ? "0.00" : planAnnualValue(plan));
  }, [detail, setValue]);

  useEffect(() => {
    if (!selectedPlan || selectedPlan === appliedPlanRef.current) return;
    appliedPlanRef.current = selectedPlan;
    setValue("amount", planAnnualValue(selectedPlan));
  }, [selectedPlan, setValue]);

  // Render
  if (isPending) {
    return (
      <div className="c-page-state">
        <Loader />
      </div>
    );
  }

  if (isError || !detail) {
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
        <Select
          control={control}
          error={errors.plan}
          hint={planHint}
          label={t("features.admin.subscriptions.form.plan")}
          name="plan"
          options={planOptions}
          placeholder={t("features.admin.subscriptions.form.plan")}
          required={t("features.admin.subscriptions.form.error.planRequired")}
        />
        <Input
          error={errors.period_start}
          hint={t("features.admin.subscriptions.form.periodStartHint")}
          label={t("features.admin.subscriptions.form.periodStart")}
          name="period_start"
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
          hint={t("features.admin.subscriptions.form.paidAtHint")}
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

export default AdminSubscriptionRenew;
