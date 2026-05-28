import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'

import Button from '@/components/Button'
import Form from '@/components/forms/Form'
import FormActions from '@/components/forms/FormActions'
import FormFields from '@/components/forms/FormFields'
import Input from '@/components/forms/Input'
import Select from '@/components/forms/Select'
import { COMPANY_CATEGORIES } from '@/constants/company-categories'
import { useQueryClient } from '@tanstack/react-query'

import { useMain } from '@/hooks/useMain'
import { useModal } from '@/hooks/useModal'
import { useToast } from '@/hooks/useToast'
import { get, put } from '@/services/api'

/**
 * Component: AdminCompanyEdit
 * Form for editing a company (store). Super admin only.
 * @component
 * @returns {JSX.Element}
 */
const AdminCompanyEdit = () => {
  // Hooks
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const { setHeader: setMainHeader } = useMain()
  const { setHeader: setModalHeader, isModal } = useModal()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm()

  // State
  const [serverError, setServerError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Derived State
  const setHeader = isModal ? setModalHeader : setMainHeader
  const categoryOptions = COMPANY_CATEGORIES.map((key) => ({
    value: key,
    label: t(`constants.companyCategories.${key}`),
  }))
  const countryOptions = [
    { value: 'PT', label: t('constants.countries.PT') },
  ]

  // Handlers
  const onSubmit = useCallback(async (values) => {
    setServerError(null)
    setIsSubmitting(true)

    try {
      await put(`/api/admin/companies/${id}`, values)
      queryClient.invalidateQueries({ queryKey: ['admin', 'companies'] })
      addToast(t('features.admin.companies.edit.success'), 'success')
      navigate(-1)
    } catch (error) {
      setServerError(error.message || t('features.admin.companies.edit.error.generic'))
    } finally {
      setIsSubmitting(false)
    }
  }, [id, addToast, navigate, t, queryClient])

  // Effects
  useEffect(() => {
    setHeader({
      title: t('features.admin.companies.edit.heading'),
      description: t('features.admin.companies.edit.description'),
    })
    return () => setHeader()
  }, [setHeader, t])

  useEffect(() => {
    const loadCompany = async () => {
      try {
        const response = await get(`/api/admin/companies/${id}`)
        const { store } = response.data
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
        })
      } catch {
        addToast(t('features.admin.companies.error.loadFailed'), 'error')
      } finally {
        setIsLoading(false)
      }
    }

    loadCompany()
  }, [id, reset, addToast, t])

  // Render
  if (isLoading) {
    return <div className="c-admin-company-edit"><p>{t('common.loading')}</p></div>
  }

  return (
    <Form error={serverError} handleSubmit={handleSubmit} onSubmit={onSubmit}>
      <FormFields>
        <Input
          error={errors.name}
          label={t('features.admin.companies.form.name')}
          name="name"
          register={register}
          required={t('features.admin.companies.form.error.nameRequired')}
        />
        <Select
          control={control}
          error={errors.category}
          label={t('features.admin.companies.form.category')}
          name="category"
          options={categoryOptions}
          placeholder={t('features.admin.companies.form.category')}
        />
        <Input
          error={errors.email}
          label={t('features.admin.companies.form.email')}
          name="email"
          register={register}
          type="email"
        />
        <Input
          error={errors.phone}
          label={t('features.admin.companies.form.phone')}
          name="phone"
          register={register}
        />
        <Input
          error={errors.vat_id}
          label={t('features.admin.companies.form.vatId')}
          name="vat_id"
          register={register}
        />
        <Input
          error={errors.address1}
          label={t('features.admin.companies.form.address1')}
          name="address1"
          register={register}
        />
        <Input
          error={errors.address2}
          label={t('features.admin.companies.form.address2')}
          name="address2"
          register={register}
        />
        <Input
          error={errors.city}
          label={t('features.admin.companies.form.city')}
          name="city"
          register={register}
        />
        <Input
          error={errors.postal_code}
          label={t('features.admin.companies.form.postalCode')}
          name="postal_code"
          register={register}
        />
        <Input
          error={errors.region}
          label={t('features.admin.companies.form.region')}
          name="region"
          register={register}
        />
        <Select
          control={control}
          error={errors.country}
          label={t('features.admin.companies.form.country')}
          name="country"
          options={countryOptions}
          placeholder={t('features.admin.companies.form.country')}
        />
        <Input
          error={errors.default_vallle_expiry_days}
          label={t('features.admin.companies.form.defaultVallleExpiryDays')}
          name="default_vallle_expiry_days"
          register={register}
          required={t('features.admin.companies.form.error.expiryDaysRequired')}
          type="number"
          validate={{
            range: (v) => {
              const n = parseInt(v, 10)
              return (n >= 1 && n <= 1825) || t('features.admin.companies.form.error.expiryDaysRange')
            },
          }}
        />
        <div className="c-form__field">
          <label className="c-form__field-label" htmlFor="status">
            {t('features.admin.companies.form.status')}
          </label>
          <select
            className="c-form__field-input"
            id="status"
            {...register('status')}
          >
            <option value="active">{t('features.admin.companies.list.active')}</option>
            <option value="suspended">{t('features.admin.companies.list.suspended')}</option>
            <option value="inactive">{t('features.admin.companies.list.inactive')}</option>
          </select>
        </div>
      </FormFields>
      <FormActions>
        <Button isProcessing={isSubmitting} type="submit">
          {t('features.admin.companies.edit.submit')}
        </Button>
        <Button onClick={() => navigate(-1)} variant="ghost">
          {t('common.cancel')}
        </Button>
      </FormActions>
    </Form>
  )
}

export default AdminCompanyEdit
