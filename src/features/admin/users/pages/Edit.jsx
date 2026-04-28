import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'

import Button from '@/components/Button'
import Form from '@/components/forms/Form'
import FormActions from '@/components/forms/FormActions'
import FormFields from '@/components/forms/FormFields'
import Input from '@/components/forms/Input'
import { useMain } from '@/hooks/useMain'
import { useModal } from '@/hooks/useModal'
import { useRefresh } from '@/hooks/useRefresh'
import { useToast } from '@/hooks/useToast'
import { get, put } from '@/services/api'

/**
 * Component: AdminUserEdit
 * Form for editing a user's name, email, role, and status.
 * Super admin only.
 * @component
 * @returns {JSX.Element}
 */
const AdminUserEdit = () => {
  // Hooks
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const { setHeader: setMainHeader } = useMain()
  const { setHeader: setModalHeader, isModal } = useModal()
  const { triggerRefresh } = useRefresh()
  const { addToast } = useToast()
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  // State
  const [serverError, setServerError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [userStores, setUserStores] = useState([])

  // Derived State
  const setHeader = isModal ? setModalHeader : setMainHeader

  // Handlers
  const onSubmit = useCallback(async (values) => {
    setServerError(null)
    setIsSubmitting(true)

    try {
      await put(`/api/admin/users/${id}`, values)
      triggerRefresh()
      addToast(t('features.admin.users.edit.success'), 'success')
      navigate(-1)
    } catch (error) {
      if (error.code === 'EMAIL_TAKEN') {
        setServerError(t('features.admin.users.error.emailTaken'))
      } else {
        setServerError(error.message || t('features.admin.users.edit.error.generic'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [id, addToast, navigate, t, triggerRefresh])

  // Effects
  useEffect(() => {
    setHeader({
      title: t('features.admin.users.edit.heading'),
      description: t('features.admin.users.edit.description'),
    })
    return () => setHeader()
  }, [setHeader, t])

  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await get(`/api/admin/users/${id}`)
        const { user } = response.data
        setUserStores(user.stores ?? [])
        reset({
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
        })
      } catch {
        addToast(t('features.admin.users.error.loadFailed'), 'error')
      } finally {
        setIsLoading(false)
      }
    }

    loadUser()
  }, [id, reset, addToast, t])

  // Render
  if (isLoading) {
    return <div className="c-admin-user-edit"><p>{t('common.loading')}</p></div>
  }

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
        <div className="c-form__field">
          <label className="c-form__field-label" htmlFor="status">
            {t('features.admin.users.list.status')}
          </label>
          <select
            className="c-form__field-input"
            id="status"
            {...register('status')}
          >
            <option value="active">{t('features.admin.users.list.active')}</option>
            <option value="inactive">{t('features.admin.users.list.inactive')}</option>
          </select>
        </div>
      </FormFields>

      {userStores.length > 0 && (
        <div className="c-admin-user-stores">
          <p className="c-admin-user-stores__label">{t('features.admin.users.edit.assignedTo')}</p>
          <ul className="c-admin-user-stores__list">
            {userStores.map((s) => (
              <li key={s.store_id} className="c-admin-user-stores__item">{s.store_name}</li>
            ))}
          </ul>
        </div>
      )}

      <FormActions>
        <Button isProcessing={isSubmitting} type="submit">
          {t('features.admin.users.edit.submit')}
        </Button>
        <Button onClick={() => navigate(-1)} variant="ghost">
          {t('common.cancel')}
        </Button>
      </FormActions>
    </Form>
  )
}

export default AdminUserEdit
