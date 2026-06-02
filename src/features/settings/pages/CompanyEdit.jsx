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
import Loader from "@/components/Loader";
import { useAuth } from "@/hooks/useAuth";
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
  const { activeStore } = useAuth();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  // Derived State
  const storeId = activeStore?.store_id;

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
      }),
    onSuccess: () => {
      setSuccess(true);
    },
    onError: () => {
      setServerError(t("features.company.error.generic"));
    },
  });

  // State
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState(false);

  // Handlers
  const handleSave = useCallback(
    (values) => {
      setServerError("");
      setSuccess(false);
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
            <Input
              error={errors.category}
              label={t("features.company.form.category")}
              name="category"
              register={register}
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
        </Fieldset>

        <Button
          display="block"
          isProcessing={saveCompany.isPending}
          type="submit"
        >
          {t("common.save")}
        </Button>
        {success && (
          <p className="c-form__success">{t("features.company.success")}</p>
        )}
      </Form>
    </div>
  );
};

export default CompanyEdit;
