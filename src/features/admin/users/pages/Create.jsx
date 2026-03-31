import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'

import Button from '@/components/Button'
import Form from '@/components/forms/Form'
import FormActions from '@/components/forms/FormActions'
import FormFields from '@/components/forms/FormFields'
import Input from '@/components/forms/Input'
import { useMain } from '@/hooks/useMain'
import { useModal } from '@/hooks/useModal'
import { useRefresh } from '@/hooks/useRefresh'
import { useToast } from '@/hooks/useToast'
import { get, post } from '@/services/api'
import { validatePassword } from '@/utils/password'

/**
 * Component: AdminUserCreate
 * Form for creating a new user and optionally assigning them to a company.
 * Super admin only.
 * @component
 * @returns {JSX.Element}
 */
const AdminUserCreate = () => {
  // Hooks
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { setHeader: setMainHeader } = useMain()
  const { setHeader: setModalHeader, isModal } = useModal()
  const { triggerRefresh } = useRefresh()
  const { addToast } = useToast()
  const { register, handleSubmit, formState: { errors } } = useForm()

  // State
  const [serverError, setServerError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [companies, setCompanies] = useState([])

  // Derived State
  const title = t('features.admin.users.create.heading')
  const setHeader = isModal ? setModalHeader : setMainHeader

  // Handlers
  const onSubmit = useCallback(async (values) => {
    setServerError(null)
    setIsSubmitting(true)

    try {
      await post('/api/admin/users', {
        ...values,
        store_id: values.store_id || null,
      })
      triggerRefresh()
      addToast(t('features.admin.users.create.success'), 'success')
      navigate(-1)
    } catch (error) {
      if (error.code === 'EMAIL_TAKEN') {
        setServerError(t('features.admin.users.error.emailTaken'))
      } else {
        setServerError(error.message || t('features.admin.users.create.error.generic'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [addToast, navigate, t, triggerRefresh])

  // Effects
  useEffect(() => {
    setHeader({ title })
    return () => setHeader()
  }, [title, setHeader])

  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const response = await get('/api/admin/companies')
        setCompanies(response.data)
      } catch {
        // Non-fatal — company select will just be empty
      }
    }

    loadCompanies()
  }, [])

  // Render
  return (
    <Form error={serverError} handleSubmit={handleSubmit} onSubmit={onSubmit}>
      <FormFields>
        <Input
          error={errors.name}
          label={t('features.admin.users.form.name')}
          name="name"
          register={register}
          required={t('features.admin.users.form.error.nameRequired')}
        />
        <Input
          error={errors.email}
          label={t('features.admin.users.form.email')}
          name="email"
          register={register}
          required={t('features.admin.users.form.error.emailRequired')}
          type="email"
        />
        <Input
          error={errors.password}
          label={t('features.admin.users.form.password')}
          name="password"
          register={register}
          required={t('features.admin.users.form.error.passwordRequired')}
          type="password"
          validate={validatePassword(t)}
        />
        <div className="c-form__field">
          <label className="c-form__field-label" htmlFor="role">
            {t('features.admin.users.form.role')}
          </label>
          <select
            className="c-form__field-input"
            id="role"
            {...register('role')}
          >
            <option value="user">{t('features.admin.users.list.role_user')}</option>
            <option value="admin">{t('features.admin.users.list.role_admin')}</option>
            <option value="super_admin">{t('features.admin.users.list.role_super_admin')}</option>
          </select>
        </div>
        {companies.length > 0 && (
          <div className="c-form__field">
            <label className="c-form__field-label" htmlFor="store_id">
              {t('features.admin.users.form.company')}
            </label>
            <select
              className="c-form__field-input"
              id="store_id"
              {...register('store_id')}
            >
              <option value="">{t('features.admin.users.form.noCompany')}</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
      </FormFields>
      <FormActions>
        <Button isProcessing={isSubmitting} type="submit">
          {t('features.admin.users.create.submit')}
        </Button>
        <Button onClick={() => navigate(-1)} variant="ghost">
          {t('common.cancel')}
        </Button>
      </FormActions>
    </Form>
  )
}

export default AdminUserCreate
