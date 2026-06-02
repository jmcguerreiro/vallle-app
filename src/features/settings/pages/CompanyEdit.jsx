import { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import Button from "@/components/Button";
import Fieldset from "@/components/forms/Fieldset";
import Form from "@/components/forms/Form";
import FormFields from "@/components/forms/FormFields";
import Input from "@/components/forms/Input";
import { useAuth } from "@/hooks/useAuth";
import { get, put } from "@/services/api";

/**
 * Component: CompanyDetails
 * Form for editing the active store's details (general, contact, address, vallle settings).
 * @component
 * @returns {JSX.Element}
 */
const CompanyDetails = () => {
  // Hooks
  const { t } = useTranslation();
  const { activeStore } = useAuth();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm();

  // State
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  // Derived State
  const storeId = activeStore?.store_id;

  // Effects
  useEffect(() => {
    if (!storeId) return;

    let cancelled = false;

    const fetchStore = async () => {
      setLoading(true);
      try {
        const { data } = await get("/api/company");
        if (!cancelled) {
          setServerError("");
          setSuccess(false);
          reset({
            name: data.store.name,
            category: data.store.category,
            email: data.store.email,
            vatId: data.store.vat_id,
            phone: data.store.phone,
            address1: data.store.address1,
            address2: data.store.address2,
            city: data.store.city,
            postalCode: data.store.postal_code,
            region: data.store.region,
            country: data.store.country,
            defaultVallleExpiryDays: data.store.default_vallle_expiry_days,
          });
        }
      } catch {
        if (!cancelled) {
          setServerError(t("features.company.error.loadFailed"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchStore();

    return () => {
      cancelled = true;
    };
  }, [storeId, reset, t]);

  // Handlers
  const handleSave = useCallback(
    async (values) => {
      setServerError("");
      setSuccess(false);

      try {
        await put("/api/company", {
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
        });

        setSuccess(true);
      } catch {
        setServerError(t("features.company.error.generic"));
      }
    },
    [t],
  );

  // Render
  if (loading) {
    return <p>{t("common.loading")}</p>;
  }

  return (
    <Form error={serverError} handleSubmit={handleSubmit} onSubmit={handleSave}>
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

      <Button display="block" isProcessing={isSubmitting} type="submit">
        {t("common.save")}
      </Button>
      {success && (
        <p className="c-form__success">{t("features.company.success")}</p>
      )}
    </Form>
  );
};

export default CompanyDetails;
