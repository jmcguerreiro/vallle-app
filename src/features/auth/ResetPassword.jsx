import { useCallback, useMemo, useState } from 'react'

import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'

import Form from '@/components/forms/Form'
import Input from '@/components/forms/Input'
import { ROUTES } from '@/constants/routes'
import { post } from '@/services/api'

/**
 * Component: ResetPassword
 * Allows the user to set a new password using a reset token from the URL.
 * @component
 * @returns {JSX.Element}
 */
const ResetPassword = () => {
  // Hooks
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const { register, handleSubmit, formState: { errors } } = useForm()

  // State
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  // Derived State
  const token = useMemo(() => searchParams.get('token'), [searchParams])

  // Handlers
  const onSubmit = useCallback(async ({ password }) => {
    setServerError('')
    setSubmitting(true)

    try {
      await post('/api/auth/reset-password', { token, password })
      setSuccess(true)
    } catch (error) {
      if (error.code === 'PASSWORD_RESET_INVALID_TOKEN') {
        setServerError(t('features.resetPassword.form.error.invalidToken'))
      } else {
        setServerError(t('features.resetPassword.form.error.generic'))
      }
    } finally {
      setSubmitting(false)
    }
  }, [token, t])

  // Render
  if (!token) {
    return (
      <div className="c-login">
        <div className="c-login__card">
          <h1 className="c-login__heading">{t('features.resetPassword.errorState.heading')}</h1>
          <p className="c-login__text">{t('features.resetPassword.errorState.invalidLink')}</p>
          <Link className="c-login__link" to={ROUTES.FORGOT_PASSWORD}>
            {t('features.resetPassword.errorState.requestNewLink')}
          </Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="c-login">
        <div className="c-login__card">
          <h1 className="c-login__heading">{t('features.resetPassword.successState.heading')}</h1>
          <p className="c-login__text">{t('features.resetPassword.successState.message')}</p>
          <Link className="c-login__link" to={ROUTES.LOGIN}>
            {t('features.resetPassword.successState.backToLogin')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="c-login">
      <div className="c-login__card">
        <h1 className="c-login__heading">{t('features.resetPassword.heading')}</h1>

        <Form
          className="c-login__form"
          error={serverError}
          handleSubmit={handleSubmit}
          onSubmit={onSubmit}
        >
          <Input
            autoComplete="new-password"
            error={errors.password}
            label={t('features.resetPassword.form.password')}
            name="password"
            register={register}
            required={t('features.resetPassword.form.error.passwordRequired')}
            type="password"
          />

          <button
            className="c-login__submit"
            disabled={submitting}
            type="submit"
          >
            {submitting ? t('common.loading') : t('features.resetPassword.form.submit')}
          </button>
        </Form>
      </div>
    </div>
  )
}

export default ResetPassword
