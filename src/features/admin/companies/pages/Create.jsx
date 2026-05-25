import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'

import Button from '@/components/Button'
import Form from '@/components/forms/Form'
import FormActions from '@/components/forms/FormActions'
import FormFields from '@/components/forms/FormFields'
import Input from '@/components/forms/Input'
import Select from '@/components/forms/Select'
import { COMPANY_CATEGORIES } from '@/constants/company-categories'
import { adminCompanyPath } from '@/constants/routes'
import { useQueryClient } from '@tanstack/react-query'

import { useMain } from '@/hooks/useMain'
import { useModal } from '@/hooks/useModal'
import { useToast } from '@/hooks/useToast'
import { post } from '@/services/api'

/**
 * Component: AdminCompanyCreate
 * Form for creating a new company (store). Super admin only.
 * @component
 * @returns {JSX.Element}
 */
const AdminCompanyCreate = () => {
  // Hooks
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { setHeader: setMainHeader } = useMain()
  const { setHeader: setModalHeader, isModal } = useModal()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const { register, handleSubmit, control, formState: { errors } } = useForm()

  // State
  const [serverError, setServerError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Derived State
  const title = t('features.admin.companies.create.heading')
  const description = t('features.admin.companies.create.description')
  const setHeader = isModal ? setModalHeader : setMainHeader
  const categoryOptions = COMPANY_CATEGORIES.map((key) => ({
    value: key,
    label: t(`constants.companyCategories.${key}`),
  }))

  // Handlers
  const onSubmit = useCallback(async (values) => {
    setServerError(null)
    setIsSubmitting(true)

    try {
      const { data: { store } } = await post('/api/admin/companies', values)
      queryClient.invalidateQueries({ queryKey: ['admin', 'companies'] })
      addToast(t('features.admin.companies.create.success'), 'success')
      const backgroundLocation = location.state?.backgroundLocation || location
      navigate(adminCompanyPath(store.id), {
        replace: true,
        state: { backgroundLocation },
      })
    } catch (error) {
      setServerError(error.message || t('features.admin.companies.create.error.generic'))
    } finally {
      setIsSubmitting(false)
    }
  }, [addToast, location, navigate, t, queryClient])

  // Effects
  useEffect(() => {
    setHeader({ title, description })
    return () => setHeader()
  }, [title, description, setHeader])

  // Render
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
      </FormFields>
      <FormActions>
        <Button isProcessing={isSubmitting} type="submit">
          {t('features.admin.companies.create.submit')}
        </Button>
        <Button onClick={() => navigate(-1)} variant="ghost">
          {t('common.cancel')}
        </Button>
      </FormActions>
    </Form>
  )
}

export default AdminCompanyCreate
