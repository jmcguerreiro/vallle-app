import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'

import Button from '@/components/Button'
import Form from '@/components/forms/Form'
import FormActions from '@/components/forms/FormActions'
import FormFields from '@/components/forms/FormFields'
import Input from '@/components/forms/Input'
import { useQueryClient } from '@tanstack/react-query'

import { useMain } from '@/hooks/useMain'
import { useModal } from '@/hooks/useModal'
import { useToast } from '@/hooks/useToast'
import { get, put } from '@/services/api'

/**
 * Component: CompanyUserEdit
 * Modal form for editing a user belonging to the active store.
 * Available to admin role only.
 * @component
 * @returns {JSX.Element}
 */
const CompanyUserEdit = () => {
  // Hooks
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const { setHeader: setMainHeader } = useMain()
  const { setHeader: setModalHeader, isModal } = useModal()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  // State
  const [serverError, setServerError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Derived State
  const setHeader = isModal ? setModalHeader : setMainHeader

  // Handlers
  const onSubmit = useCallback(async (values) => {
    setServerError(null)
    setIsSubmitting(true)

    try {
      await put(`/api/company/users/${id}`, values)
      queryClient.invalidateQueries({ queryKey: ['company', 'users'] })
      addToast(t('features.company.users.edit.success'), 'success')
      navigate(-1)
    } catch (error) {
      if (error.code === 'EMAIL_TAKEN') {
        setServerError(t('features.company.users.error.emailTaken'))
      } else {
        setServerError(error.message || t('features.company.users.edit.error.generic'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [id, addToast, navigate, t, queryClient])

  // Effects
  useEffect(() => {
    setHeader({
      title: t('features.company.users.edit.heading'),
      description: t('features.company.users.edit.description'),
    })
    return () => setHeader()
  }, [setHeader, t])

  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await get(`/api/company/users/${id}`)
        const { user } = response.data
        reset({
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
        })
      } catch {
        addToast(t('features.company.users.error.loadFailed'), 'error')
      } finally {
        setIsLoading(false)
      }
    }

    loadUser()
  }, [id, reset, addToast, t])

  // Render
  if (isLoading) {
    return <p>{t('common.loading')}</p>
  }

  return (
    <Form error={serverError} handleSubmit={handleSubmit} onSubmit={onSubmit}>
      <FormFields>
        <Input
          error={errors.name}
          label={t('features.company.users.form.name')}
          name="name"
          register={register}
          required={t('features.company.users.form.error.nameRequired')}
        />
        <Input
          error={errors.email}
          label={t('features.company.users.form.email')}
          name="email"
          register={register}
          required={t('features.company.users.form.error.emailRequired')}
          type="email"
        />
        <div className="c-form__field">
          <label className="c-form__field-label" htmlFor="role">
            {t('features.company.users.form.role')}
          </label>
          <select
            className="c-form__field-input"
            id="role"
            {...register('role')}
          >
            <option value="user">{t('features.company.users.list.role_user')}</option>
            <option value="admin">{t('features.company.users.list.role_admin')}</option>
          </select>
        </div>
        <div className="c-form__field">
          <label className="c-form__field-label" htmlFor="status">
            {t('features.company.users.list.status')}
          </label>
          <select
            className="c-form__field-input"
            id="status"
            {...register('status')}
          >
            <option value="active">{t('features.company.users.list.active')}</option>
            <option value="inactive">{t('features.company.users.list.inactive')}</option>
          </select>
        </div>
      </FormFields>
      <FormActions>
        <Button isProcessing={isSubmitting} type="submit">
          {t('features.company.users.edit.submit')}
        </Button>
        <Button onClick={() => navigate(-1)} variant="ghost">
          {t('common.cancel')}
        </Button>
      </FormActions>
    </Form>
  )
}

export default CompanyUserEdit
