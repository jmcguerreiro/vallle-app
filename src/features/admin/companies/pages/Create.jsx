import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import Form from "@/components/forms/Form";
import FormFields from "@/components/forms/FormFields";
import Input from "@/components/forms/Input";
import MinRedemptionFields from "@/components/forms/MinRedemptionFields";
import Select from "@/components/forms/Select";
import { COMPANY_CATEGORIES } from "@/constants/company-categories";
import { PLAN_IDS } from "@/constants/plans";
import { MIN_REDEMPTION_MODES } from "@/constants/redemption";
import { adminCompanyPath } from "@/constants/routes";
import { useModal } from "@/hooks/useModal";
import { useToast } from "@/hooks/useToast";
import { post } from "@/services/api";
import { eurosToCents } from "@/utils/currency";
import { slugify } from "@/utils/slug";

/**
 * Component: AdminCompanyCreate
 * Form for creating a new company (store). Super admin only.
 * @component
 * @returns {JSX.Element}
 */
const AdminCompanyCreate = () => {
  // Hooks
  const { t } = useTranslation();
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
  } = useForm({
    defaultValues: {
      country: "PT",
      default_vallle_expiry_days: 365,
      default_min_redemption_mode: MIN_REDEMPTION_MODES.NONE,
      plan: "starter",
      is_founding_member: "0",
    },
  });

  // Mutations
  const createCompany = useMutation({
    mutationFn: (values) => post("/api/admin/companies", values),
    onSuccess: ({ data: { store } }) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "companies"] });
      addToast(t("features.admin.companies.create.success"), "success");
      const backgroundLocation = location.state?.backgroundLocation || location;
      navigate(adminCompanyPath(store.id), {
        replace: true,
        state: { backgroundLocation },
      });
    },
    onError: (error) => {
      setServerError(
        error.message || t("features.admin.companies.create.error.generic"),
      );
    },
  });

  // State
  const [serverError, setServerError] = useState(null);

  // Derived State
  const title = t("features.admin.companies.create.heading");
  const description = t("features.admin.companies.create.description");
  const categoryOptions = COMPANY_CATEGORIES.map((key) => ({
    value: key,
    label: t(`constants.companyCategories.${key}`),
  }));
  const countryOptions = [{ value: "PT", label: t("constants.countries.PT") }];
  const planOptions = PLAN_IDS.map((planId) => ({
    value: planId,
    label: t(`constants.plans.${planId}`),
  }));
  const foundingOptions = [
    { value: "1", label: t("features.admin.companies.form.foundingMemberYes") },
    { value: "0", label: t("features.admin.companies.form.foundingMemberNo") },
  ];
  const slugPreview = slugify(watch("name"));

  // Handlers
  const onSubmit = useCallback(
    (values) => {
      setServerError(null);
      const { minRedemptionAmount, ...rest } = values;
      createCompany.mutate({
        ...rest,
        default_min_redemption_cents:
          values.default_min_redemption_mode === MIN_REDEMPTION_MODES.CUSTOM
            ? eurosToCents(minRedemptionAmount)
            : 0,
      });
    },
    [createCompany],
  );

  // Effects
  useEffect(() => {
    setHeader({
      title,
      description,
      actions: [
        {
          label: t("features.admin.companies.create.submit"),
          onClick: handleSubmit(onSubmit),
          skin: "primary",
          isProcessing: createCompany.isPending,
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
    createCompany.isPending,
  ]);

  // Render
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
        <div className="c-form__field">
          <label className="c-form__field-label" htmlFor="slug-preview">
            {t("features.admin.companies.form.slug")}
          </label>
          <input
            className="c-form__field-input c-form__field-input--readonly"
            id="slug-preview"
            readOnly
            tabIndex={-1}
            value={slugPreview}
          />
        </div>
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
          error={errors.plan}
          label={t("features.admin.companies.form.plan")}
          name="plan"
          options={planOptions}
          placeholder={t("features.admin.companies.form.plan")}
        />
        <Input
          error={errors.plan_renews_at}
          hint={t("features.admin.companies.form.planRenewsAtHint")}
          label={t("features.admin.companies.form.planRenewsAt")}
          name="plan_renews_at"
          register={register}
          type="date"
        />
        <Select
          control={control}
          error={errors.is_founding_member}
          label={t("features.admin.companies.form.isFoundingMember")}
          name="is_founding_member"
          options={foundingOptions}
          placeholder={t("features.admin.companies.form.isFoundingMember")}
        />
      </FormFields>
    </Form>
  );
};

export default AdminCompanyCreate;
