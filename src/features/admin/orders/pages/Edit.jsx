import { useCallback, useEffect, useState } from "react";
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
import { ORDER_ITEMS, ORDER_STATUSES, ORDER_TYPES } from "@/constants/orders";
import { useModal } from "@/hooks/useModal";
import { useToast } from "@/hooks/useToast";
import { get, put } from "@/services/api";

import { buildOrderItems } from "../utils";

/**
 * Component: AdminOrderEdit
 * Form for editing a fulfilment order: type, status, items, price, request
 * date, and notes. Super admin only.
 * @component
 * @returns {JSX.Element}
 */
const AdminOrderEdit = () => {
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
    reset,
    control,
    formState: { errors },
  } = useForm();

  // Queries
  const {
    data: response,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["admin", "orders", id],
    queryFn: ({ signal }) => get(`/api/admin/orders/${id}`, { signal }),
  });

  // Mutations
  const updateOrder = useMutation({
    mutationFn: (payload) => put(`/api/admin/orders/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      addToast(t("features.admin.orders.edit.success"), "success");
      navigate(-1);
    },
    onError: (error) => {
      setServerError(
        error.message || t("features.admin.orders.edit.error.generic"),
      );
    },
  });

  // The mutation result object is a fresh reference every render; only the
  // stable mutate function may be a hook dependency, otherwise the header
  // effect (setHeader → context update → re-render) loops forever.
  const { mutate: update } = updateOrder;

  // State
  const [serverError, setServerError] = useState(null);

  // Derived State
  const typeOptions = Object.values(ORDER_TYPES).map((type) => ({
    value: type,
    label: t(`constants.orderTypes.${type}`),
  }));
  const statusOptions = Object.values(ORDER_STATUSES).map((status) => ({
    value: status,
    label: t(`constants.orderStatuses.${status}`),
  }));

  // Handlers
  const onSubmit = useCallback(
    (values) => {
      setServerError(null);

      const items = buildOrderItems(values.quantities);
      if (items.length === 0) {
        setServerError(t("features.admin.orders.form.error.itemsRequired"));
        return;
      }

      update({
        type: values.type,
        status: values.status,
        items,
        amount: values.amount
          ? Math.round(Number.parseFloat(values.amount) * 100)
          : 0,
        notes: values.notes,
        requested_at: values.requested_at,
        invoiced_at: values.invoiced_at,
      });
    },
    [update, setServerError, t],
  );

  // Effects
  useEffect(() => {
    setHeader({
      title: t("features.admin.orders.edit.heading"),
      description: t("features.admin.orders.edit.description"),
      actions: response?.data
        ? [
            {
              label: t("features.admin.orders.edit.submit"),
              onClick: handleSubmit(onSubmit),
              skin: "primary",
              isProcessing: updateOrder.isPending,
            },
          ]
        : [],
    });
    return () => setHeader();
  }, [setHeader, t, response, handleSubmit, onSubmit, updateOrder.isPending]);

  useEffect(() => {
    if (response?.data) {
      const { order } = response.data;
      const quantities = {};
      for (const entry of order.items) {
        quantities[entry.item] = entry.quantity;
      }
      reset({
        type: order.type,
        status: order.status,
        quantities,
        amount: order.amount ? (order.amount / 100).toFixed(2) : "",
        requested_at: order.requested_at ? order.requested_at.slice(0, 10) : "",
        invoiced_at: order.invoiced_at ? order.invoiced_at.slice(0, 10) : "",
        notes: order.notes,
      });
    }
  }, [response, reset]);

  // Render
  if (isPending) {
    return (
      <div className="c-page-state">
        <Loader />
      </div>
    );
  }

  if (isError || !response?.data) {
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
            {t("features.admin.orders.form.company")}
          </label>
          <input
            className="c-form__field-input c-form__field-input--readonly"
            id="company-readonly"
            readOnly
            tabIndex={-1}
            value={response.data.order.store_name ?? ""}
          />
        </div>
        <Select
          control={control}
          error={errors.type}
          label={t("features.admin.orders.form.type")}
          name="type"
          options={typeOptions}
          placeholder={t("features.admin.orders.form.type")}
        />
        <Select
          control={control}
          error={errors.status}
          label={t("features.admin.orders.form.status")}
          name="status"
          options={statusOptions}
          placeholder={t("features.admin.orders.form.status")}
        />
        {ORDER_ITEMS.map((item) => (
          <Input
            key={item}
            error={errors.quantities?.[item]}
            inputMode="numeric"
            label={t(`constants.orderItems.${item}`)}
            name={`quantities.${item}`}
            register={register}
            type="number"
            validate={{
              nonNegative: (v) =>
                !v ||
                Number.parseInt(v, 10) >= 0 ||
                t("features.admin.orders.form.error.quantityInvalid"),
            }}
          />
        ))}
        <Input
          error={errors.amount}
          hint={t("features.admin.orders.form.amountHint")}
          inputMode="decimal"
          label={t("features.admin.orders.form.amount")}
          name="amount"
          register={register}
          type="number"
          validate={{
            nonNegative: (v) =>
              !v ||
              Number.parseFloat(v) >= 0 ||
              t("features.admin.orders.form.error.amountInvalid"),
          }}
        />
        <Input
          error={errors.requested_at}
          label={t("features.admin.orders.form.requestedAt")}
          name="requested_at"
          register={register}
          required={t("features.admin.orders.form.error.requestedAtRequired")}
          type="date"
        />
        <Input
          error={errors.invoiced_at}
          hint={t("features.admin.orders.form.invoicedAtHint")}
          label={t("features.admin.orders.form.invoicedAt")}
          name="invoiced_at"
          register={register}
          type="date"
        />
        <Input
          autoComplete="off"
          error={errors.notes}
          hint={t("features.admin.orders.form.notesHint")}
          label={t("features.admin.orders.form.notes")}
          multiline
          name="notes"
          register={register}
        />
      </FormFields>
    </Form>
  );
};

export default AdminOrderEdit;
