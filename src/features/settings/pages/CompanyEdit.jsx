import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { useMutation, useQuery } from "@tanstack/react-query";

import Button from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import Fieldset from "@/components/forms/Fieldset";
import Form from "@/components/forms/Form";
import FormFields from "@/components/forms/FormFields";
import Input from "@/components/forms/Input";
import MinRedemptionFields from "@/components/forms/MinRedemptionFields";
import Select from "@/components/forms/Select";
import Loader from "@/components/Loader";
import { COMPANY_CATEGORIES } from "@/constants/company-categories";
import { MIN_REDEMPTION_MODES } from "@/constants/redemption";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { get, put } from "@/services/api";

/**
 * Component: CompanyEdit
 * Form for editing the active store's details (general, contact, address, vallle settings).
 * @component
 * @returns {JSX.Element}
 */
const CompanyEdit = () => {
  // Hooks
  const { t } = useTranslation();
  const { activeStore, updateActiveStore } = useAuth();
  const { addToast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm();

  // Derived State
  const storeId = activeStore?.store_id;
  const categoryOptions = COMPANY_CATEGORIES.map((key) => ({
    value: key,
    label: t(`constants.companyCategories.${key}`),
  }));

  // Queries
  const {
    data: response,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["company"],
    queryFn: ({ signal }) => get("/api/company", { signal }),
    enabled: !!storeId,
  });

  // Mutations
  const saveCompany = useMutation({
    mutationFn: (values) =>
      put("/api/company", {
        name: values.name,
        category: values.category,
        email: values.email,
        vat_id: values.vatId,
        phone: values.phone,
        address1: values.address1,
        address2: values.address2,
        city: values.city,
        postal_code: values.postalCode,
        region: values.region,
        country: values.country,
        default_vallle_expiry_days: Number.parseInt(
          values.defaultVallleExpiryDays,
          10,
        ),
        default_min_redemption_mode: values.minRedemptionMode,
        default_min_redemption_cents:
          values.minRedemptionMode === MIN_REDEMPTION_MODES.CUSTOM
            ? Math.round(Number.parseFloat(values.minRedemptionAmount) * 100)
            : 0,
      }),
    onSuccess: (response) => {
      // Keep the auth context's activeStore in sync so the create-vallle expiry
      // and minimum-redemption labels reflect the new settings without a reload.
      const store = response?.data?.store;
      if (store) {
        updateActiveStore({
          default_vallle_expiry_days: store.default_vallle_expiry_days,
          default_min_redemption_mode: store.default_min_redemption_mode,
          default_min_redemption_cents: store.default_min_redemption_cents,
        });
      }
      addToast(t("features.company.success"), "success");
    },
    onError: () => {
      setServerError(t("features.company.error.generic"));
    },
  });

  // State
  const [serverError, setServerError] = useState("");

  // Handlers
  const handleSave = useCallback(
    (values) => {
      setServerError("");
      saveCompany.mutate(values);
    },
    [saveCompany],
  );

  // Effects
  useEffect(() => {
    if (response?.data) {
      reset({
        name: response.data.store.name,
        category: response.data.store.category,
        email: response.data.store.email,
        vatId: response.data.store.vat_id,
        phone: response.data.store.phone,
        address1: response.data.store.address1,
        address2: response.data.store.address2,
        city: response.data.store.city,
        postalCode: response.data.store.postal_code,
        region: response.data.store.region,
        country: response.data.store.country,
        defaultVallleExpiryDays: response.data.store.default_vallle_expiry_days,
        minRedemptionMode: response.data.store.default_min_redemption_mode,
        minRedemptionAmount: response.data.store.default_min_redemption_cents
          ? (response.data.store.default_min_redemption_cents / 100).toFixed(2)
          : "",
      });
    }
  }, [response, reset]);

  // Render
  if (isPending) {
    return (
      <div className="p-company">
        <div className="p-company__loading">
          <Loader />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-company">
        <div className="p-company__error">
          <EmptyState
            description={t("common.error")}
            hideImageOnMobile
            image="company--error"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-company">
      <Form
        error={serverError}
        handleSubmit={handleSubmit}
        onSubmit={handleSave}
      >
        <Fieldset legend={t("features.company.sections.general")}>
          <FormFields>
            <Input
              error={errors.name}
              label={t("features.company.form.name")}
              name="name"
              register={register}
              required={t("features.company.form.error.nameRequired")}
            />
            <Select
              control={control}
              error={errors.category}
              label={t("features.company.form.category")}
              name="category"
              options={categoryOptions}
              placeholder={t("features.company.form.category")}
            />
          </FormFields>
        </Fieldset>

        <Fieldset legend={t("features.company.sections.contact")}>
          <FormFields>
            <Input
              autoComplete="email"
              error={errors.email}
              label={t("features.company.form.email")}
              name="email"
              register={register}
              type="email"
            />
            <Input
              autoComplete="tel"
              error={errors.phone}
              label={t("features.company.form.phone")}
              name="phone"
              register={register}
              type="tel"
            />
            <Input
              error={errors.vatId}
              label={t("features.company.form.vatId")}
              name="vatId"
              register={register}
            />
          </FormFields>
        </Fieldset>

        <Fieldset legend={t("features.company.sections.address")}>
          <FormFields>
            <Input
              autoComplete="address-line1"
              error={errors.address1}
              label={t("features.company.form.address1")}
              name="address1"
              register={register}
            />
            <Input
              autoComplete="address-line2"
              error={errors.address2}
              label={t("features.company.form.address2")}
              name="address2"
              register={register}
            />
            <Input
              autoComplete="address-level2"
              error={errors.city}
              label={t("features.company.form.city")}
              name="city"
              register={register}
            />
            <Input
              autoComplete="postal-code"
              error={errors.postalCode}
              label={t("features.company.form.postalCode")}
              name="postalCode"
              register={register}
            />
            <Input
              error={errors.region}
              label={t("features.company.form.region")}
              name="region"
              register={register}
            />
            <Input
              autoComplete="country-name"
              error={errors.country}
              label={t("features.company.form.country")}
              name="country"
              register={register}
            />
          </FormFields>
        </Fieldset>

        <Fieldset legend={t("features.company.sections.vallles")}>
          <FormFields>
            <Input
              error={errors.defaultVallleExpiryDays}
              hint={t("features.company.form.defaultVallleExpiryDaysHint")}
              label={t("features.company.form.defaultVallleExpiryDays")}
              name="defaultVallleExpiryDays"
              register={register}
              required={t("features.company.form.error.expiryDaysRequired")}
              type="number"
              validate={{
                range: (v) => {
                  const n = Number.parseInt(v, 10);
                  return (
                    (n >= 1 && n <= 1825) ||
                    t("features.company.form.error.expiryDaysRange")
                  );
                },
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
        </Fieldset>

        <Button
          display="block"
          isProcessing={saveCompany.isPending}
          type="submit"
        >
          {t("common.save")}
        </Button>
      </Form>
    </div>
  );
};

export default CompanyEdit;
