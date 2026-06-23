import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import EmptyState from "@/components/EmptyState";
import Form from "@/components/forms/Form";
import FormFields from "@/components/forms/FormFields";
import Input from "@/components/forms/Input";
import MinRedemptionFields from "@/components/forms/MinRedemptionFields";
import Select from "@/components/forms/Select";
import Loader from "@/components/Loader";
import { COMPANY_CATEGORIES } from "@/constants/company-categories";
import { COMPANY_STATUSES } from "@/constants/company-statuses";
import { MIN_REDEMPTION_MODES } from "@/constants/redemption";
import { useModal } from "@/hooks/useModal";
import { useToast } from "@/hooks/useToast";
import { get, put } from "@/services/api";

/**
 * Component: AdminCompanyEdit
 * Form for editing a company (store). Super admin only.
 * @component
 * @returns {JSX.Element}
 */
const AdminCompanyEdit = () => {
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
    watch,
    formState: { errors },
  } = useForm();

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
  const updateCompany = useMutation({
    mutationFn: (values) => put(`/api/admin/companies/${id}`, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "companies"] });
      addToast(t("features.admin.companies.edit.success"), "success");
      navigate(-1);
    },
    onError: (error) => {
      setServerError(
        error.message || t("features.admin.companies.edit.error.generic"),
      );
    },
  });

  // The mutation result object is a fresh reference every render; only the
  // stable mutate function may be a hook dependency, otherwise the header
  // effect (setHeader → context update → re-render) loops forever.
  const { mutate: update } = updateCompany;

  // State
  const [serverError, setServerError] = useState(null);

  // Derived State
  const categoryOptions = COMPANY_CATEGORIES.map((key) => ({
    value: key,
    label: t(`constants.companyCategories.${key}`),
  }));
  const countryOptions = [{ value: "PT", label: t("constants.countries.PT") }];
  const statusOptions = [
    {
      value: COMPANY_STATUSES.ACTIVE,
      label: t("features.admin.companies.list.active"),
    },
    {
      value: COMPANY_STATUSES.SUSPENDED,
      label: t("features.admin.companies.list.suspended"),
    },
    {
      value: COMPANY_STATUSES.INACTIVE,
      label: t("features.admin.companies.list.inactive"),
    },
  ];

  // Handlers
  const onSubmit = useCallback(
    (values) => {
      setServerError(null);
      const { minRedemptionAmount, ...rest } = values;
      update({
        ...rest,
        default_min_redemption_cents:
          values.default_min_redemption_mode === MIN_REDEMPTION_MODES.CUSTOM
            ? Math.round(Number.parseFloat(minRedemptionAmount) * 100)
            : 0,
      });
    },
    [update],
  );

  // Effects
  useEffect(() => {
    setHeader({
      title: t("features.admin.companies.edit.heading"),
      description: t("features.admin.companies.edit.description"),
      actions: response?.data
        ? [
            {
              label: t("features.admin.companies.edit.submit"),
              onClick: handleSubmit(onSubmit),
              skin: "primary",
              isProcessing: updateCompany.isPending,
            },
          ]
        : [],
    });
    return () => setHeader();
  }, [setHeader, t, response, handleSubmit, onSubmit, updateCompany.isPending]);

  useEffect(() => {
    if (response?.data) {
      const { store } = response.data;
      reset({
        name: store.name,
        category: store.category,
        email: store.email,
        phone: store.phone,
        vat_id: store.vat_id,
        address1: store.address1,
        address2: store.address2,
        city: store.city,
        postal_code: store.postal_code,
        region: store.region,
        country: store.country,
        status: store.status,
        default_vallle_expiry_days: store.default_vallle_expiry_days,
        default_min_redemption_mode: store.default_min_redemption_mode,
        minRedemptionAmount: store.default_min_redemption_cents
          ? (store.default_min_redemption_cents / 100).toFixed(2)
          : "",
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

  if (isError) {
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
        <Input
          error={errors.name}
          label={t("features.admin.companies.form.name")}
          name="name"
          register={register}
          required={t("features.admin.companies.form.error.nameRequired")}
        />
        <Select
          control={control}
          error={errors.category}
          label={t("features.admin.companies.form.category")}
          name="category"
          options={categoryOptions}
          placeholder={t("features.admin.companies.form.category")}
        />
        <Input
          autoComplete="off"
          error={errors.email}
          label={t("features.admin.companies.form.email")}
          name="email"
          register={register}
          type="email"
        />
        <Input
          autoComplete="off"
          error={errors.phone}
          label={t("features.admin.companies.form.phone")}
          name="phone"
          register={register}
        />
        <Input
          error={errors.vat_id}
          label={t("features.admin.companies.form.vatId")}
          name="vat_id"
          register={register}
        />
        <Input
          autoComplete="off"
          error={errors.address1}
          label={t("features.admin.companies.form.address1")}
          name="address1"
          register={register}
        />
        <Input
          autoComplete="off"
          error={errors.address2}
          label={t("features.admin.companies.form.address2")}
          name="address2"
          register={register}
        />
        <Input
          autoComplete="off"
          error={errors.city}
          label={t("features.admin.companies.form.city")}
          name="city"
          register={register}
        />
        <Input
          autoComplete="off"
          error={errors.postal_code}
          label={t("features.admin.companies.form.postalCode")}
          name="postal_code"
          register={register}
        />
        <Input
          autoComplete="off"
          error={errors.region}
          label={t("features.admin.companies.form.region")}
          name="region"
          register={register}
        />
        <Select
          control={control}
          error={errors.country}
          label={t("features.admin.companies.form.country")}
          name="country"
          options={countryOptions}
          placeholder={t("features.admin.companies.form.country")}
        />
        <Input
          error={errors.default_vallle_expiry_days}
          label={t("features.admin.companies.form.defaultVallleExpiryDays")}
          name="default_vallle_expiry_days"
          register={register}
          required={t("features.admin.companies.form.error.expiryDaysRequired")}
          type="number"
          validate={{
            range: (v) => {
              const n = Number.parseInt(v, 10);
              return (
                (n >= 1 && n <= 1825) ||
                t("features.admin.companies.form.error.expiryDaysRange")
              );
            },
          }}
        />
        <MinRedemptionFields
          amountName="minRedemptionAmount"
          control={control}
          errors={errors}
          modeName="default_min_redemption_mode"
          register={register}
          watch={watch}
        />
        <Select
          control={control}
          error={errors.status}
          label={t("features.admin.companies.form.status")}
          name="status"
          options={statusOptions}
          placeholder={t("features.admin.companies.form.status")}
        />
      </FormFields>
    </Form>
  );
};

export default AdminCompanyEdit;
