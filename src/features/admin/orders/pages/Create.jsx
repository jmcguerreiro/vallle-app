import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Form from "@/components/forms/Form";
import FormFields from "@/components/forms/FormFields";
import Input from "@/components/forms/Input";
import Select from "@/components/forms/Select";
import { ORDER_ITEMS, ORDER_TYPES } from "@/constants/orders";
import { adminOrderPath } from "@/constants/routes";
import { useModal } from "@/hooks/useModal";
import { useToast } from "@/hooks/useToast";
import { get, post } from "@/services/api";
import { eurosToCents } from "@/utils/currency";

import { buildOrderItems } from "../utils";

/**
 * Component: AdminOrderCreate
 * Form for recording a fulfilment order (welcome pack or refill) requested
 * by a store via email/phone. A `?store=` query param pre-selects the
 * company (used by the company orders modal's add button). Super admin only.
 * @component
 * @returns {JSX.Element}
 */
const AdminOrderCreate = () => {
  // Hooks
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { setHeader } = useModal();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: {
      store_id: searchParams.get("store") ?? "",
      type: ORDER_TYPES.REFILL,
      requested_at: new Date().toISOString().slice(0, 10),
      quantities: {},
    },
  });

  // Queries
  const { data: companiesResponse } = useQuery({
    queryKey: ["admin", "companies"],
    queryFn: ({ signal }) => get("/api/admin/companies?limit=200", { signal }),
  });

  const companies = companiesResponse?.data ?? [];

  // Mutations
  const createOrder = useMutation({
    mutationFn: (payload) => post("/api/admin/orders", payload),
    onSuccess: ({ data: { order } }) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      // The company detail carries the order list shown in its modals.
      queryClient.invalidateQueries({ queryKey: ["admin", "companies"] });
      addToast(t("features.admin.orders.create.success"), "success");
      const backgroundLocation = location.state?.backgroundLocation || location;
      navigate(adminOrderPath(order.id), {
        replace: true,
        state: { backgroundLocation },
      });
    },
    onError: (error) => {
      setServerError(
        error.message || t("features.admin.orders.create.error.generic"),
      );
    },
  });

  // State
  const [serverError, setServerError] = useState(null);

  // Derived State
  const title = t("features.admin.orders.create.heading");
  const description = t("features.admin.orders.create.description");
  const companyOptions = companies.map((c) => ({ value: c.id, label: c.name }));
  const typeOptions = Object.values(ORDER_TYPES).map((type) => ({
    value: type,
    label: t(`constants.orderTypes.${type}`),
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

      createOrder.mutate({
        store_id: values.store_id,
        type: values.type,
        items,
        amount: values.amount ? eurosToCents(values.amount) : 0,
        notes: values.notes,
        requested_at: values.requested_at,
      });
    },
    [createOrder, setServerError, t],
  );

  // Effects
  useEffect(() => {
    setHeader({
      title,
      description,
      actions: [
        {
          label: t("features.admin.orders.create.submit"),
          onClick: handleSubmit(onSubmit),
          skin: "primary",
          isProcessing: createOrder.isPending,
        },
      ],
    });
    return () => setHeader();
  }, [
    title,
    description,
    setHeader,
    t,
    handleSubmit,
    onSubmit,
    createOrder.isPending,
  ]);

  // Render
  return (
    <Form error={serverError} handleSubmit={handleSubmit} onSubmit={onSubmit}>
      <FormFields>
        <Select
          control={control}
          error={errors.store_id}
          isSearchable
          label={t("features.admin.orders.form.company")}
          name="store_id"
          options={companyOptions}
          placeholder={t("features.admin.orders.form.companyPlaceholder")}
          required={t("features.admin.orders.form.error.companyRequired")}
        />
        <Select
          control={control}
          error={errors.type}
          label={t("features.admin.orders.form.type")}
          name="type"
          options={typeOptions}
          placeholder={t("features.admin.orders.form.type")}
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
              positive: (v) =>
                !v ||
                Number.parseInt(v, 10) > 0 ||
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

export default AdminOrderCreate;
