import { useState, useCallback, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import Form from '@/components/forms/Form'
import Input from '@/components/forms/Input'
import { useAuth } from '@/hooks/useAuth'
import { get, put } from '@/services/api'

/**
 * Component: CompanyDetails
 * Form for editing the active store's details (general, contact, address, voucher settings).
 * @component
 * @returns {JSX.Element}
 */
const CompanyDetails = () => {
  // Hooks
  const { t } = useTranslation()
  const { activeStore } = useAuth()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm()

  // State
  const [serverError, setServerError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(true)

  // Derived State
  const storeId = activeStore?.store_id

  // Effects
  useEffect(() => {
    if (!storeId) return

    let cancelled = false

    const fetchStore = async () => {
      setLoading(true)
      try {
        const { data } = await get('/api/company')
        if (!cancelled) {
          setServerError('')
          setSuccess(false)
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
            defaultVoucherExpiryDays: data.store.default_voucher_expiry_days,
          })
        }
      } catch {
        if (!cancelled) {
          setServerError(t('features.company.error.loadFailed'))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchStore()

    return () => { cancelled = true }
  }, [storeId, reset, t])

  // Handlers
  const handleSave = useCallback(async (values) => {
    setServerError('')
    setSuccess(false)

    try {
      await put('/api/company', {
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
        default_voucher_expiry_days: parseInt(values.defaultVoucherExpiryDays, 10),
      })

      setSuccess(true)
    } catch {
      setServerError(t('features.company.error.generic'))
    }
  }, [t])

  // Render
  if (loading) {
    return <p>{t('common.loading')}</p>
  }

  return (
    <Form
      className="c-company__form"
      error={serverError}
      handleSubmit={handleSubmit}
      onSubmit={handleSave}
    >
      <fieldset className="c-company__fieldset">
        <legend className="c-company__fieldset-legend">
          {t('features.company.sections.general')}
        </legend>
        <Input
          error={errors.name}
          label={t('features.company.form.name')}
          name="name"
          register={register}
          required={t('features.company.form.error.nameRequired')}
        />
        <Input
          error={errors.category}
          label={t('features.company.form.category')}
          name="category"
          register={register}
        />
      </fieldset>

      <fieldset className="c-company__fieldset">
        <legend className="c-company__fieldset-legend">
          {t('features.company.sections.contact')}
        </legend>
        <Input
          autoComplete="email"
          error={errors.email}
          label={t('features.company.form.email')}
          name="email"
          register={register}
          type="email"
        />
        <Input
          autoComplete="tel"
          error={errors.phone}
          label={t('features.company.form.phone')}
          name="phone"
          register={register}
          type="tel"
        />
        <Input
          error={errors.vatId}
          label={t('features.company.form.vatId')}
          name="vatId"
          register={register}
        />
      </fieldset>

      <fieldset className="c-company__fieldset">
        <legend className="c-company__fieldset-legend">
          {t('features.company.sections.address')}
        </legend>
        <Input
          autoComplete="address-line1"
          error={errors.address1}
          label={t('features.company.form.address1')}
          name="address1"
          register={register}
        />
        <Input
          autoComplete="address-line2"
          error={errors.address2}
          label={t('features.company.form.address2')}
          name="address2"
          register={register}
        />
        <Input
          autoComplete="address-level2"
          error={errors.city}
          label={t('features.company.form.city')}
          name="city"
          register={register}
        />
        <Input
          autoComplete="postal-code"
          error={errors.postalCode}
          label={t('features.company.form.postalCode')}
          name="postalCode"
          register={register}
        />
        <Input
          error={errors.region}
          label={t('features.company.form.region')}
          name="region"
          register={register}
        />
        <Input
          autoComplete="country-name"
          error={errors.country}
          label={t('features.company.form.country')}
          name="country"
          register={register}
        />
      </fieldset>

      <fieldset className="c-company__fieldset">
        <legend className="c-company__fieldset-legend">
          {t('features.company.sections.vouchers')}
        </legend>
        <Input
          error={errors.defaultVoucherExpiryDays}
          hint={t('features.company.form.defaultVoucherExpiryDaysHint')}
          label={t('features.company.form.defaultVoucherExpiryDays')}
          name="defaultVoucherExpiryDays"
          register={register}
          required={t('features.company.form.error.expiryDaysRequired')}
          type="number"
          validate={{
            range: (v) => {
              const n = parseInt(v, 10)
              return (n >= 1 && n <= 1825) || t('features.company.form.error.expiryDaysRange')
            },
          }}
        />
      </fieldset>

      <button
        className="c-btn c-btn--primary"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? t('common.loading') : t('common.save')}
      </button>
      {success && (
        <p className="c-form__success">{t('features.company.success')}</p>
      )}
    </Form>
  )
}

export default CompanyDetails
