import { useCallback, useState } from 'react'

import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import Form from '@/components/forms/Form'
import Input from '@/components/forms/Input'
import { ROUTES } from '@/constants/routes'
import { post } from '@/services/api'

/**
 * Component: ForgotPassword
 * Allows the user to request a password reset link via email.
 * @component
 * @returns {JSX.Element}
 */
const ForgotPassword = () => {
  // Hooks
  const { t } = useTranslation()
  const { register, handleSubmit, formState: { errors } } = useForm()

  // State
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  // Handlers
  const onSubmit = useCallback(async ({ email }) => {
    setServerError('')
    setSubmitting(true)

    try {
      await post('/api/auth/forgot-password', { email })
      setSent(true)
    } catch {
      setServerError(t('features.forgotPassword.form.error.generic'))
    } finally {
      setSubmitting(false)
    }
  }, [t])

  // Render
  if (sent) {
    return (
      <div className="c-login">
        <div className="c-login__card">
          <h1 className="c-login__heading">{t('features.forgotPassword.successState.heading')}</h1>
          <p className="c-login__text">{t('features.forgotPassword.successState.message')}</p>
          <Link className="c-login__link" to={ROUTES.LOGIN}>
            {t('features.forgotPassword.successState.backToLogin')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="c-login">
      <div className="c-login__card">
        <h1 className="c-login__heading">{t('features.forgotPassword.heading')}</h1>
        <p className="c-login__text">{t('features.forgotPassword.description')}</p>

        <Form
          className="c-login__form"
          error={serverError}
          handleSubmit={handleSubmit}
          onSubmit={onSubmit}
        >
          <Input
            autoComplete="email"
            error={errors.email}
            label={t('features.login.form.email')}
            name="email"
            register={register}
            required={t('features.login.form.error.invalidEmail')}
            type="email"
          />

          <button
            className="c-login__submit"
            disabled={submitting}
            type="submit"
          >
            {submitting ? t('common.loading') : t('features.forgotPassword.form.submit')}
          </button>
        </Form>

        <Link className="c-login__link" to={ROUTES.LOGIN}>
          {t('features.forgotPassword.backToLogin')}
        </Link>
      </div>
    </div>
  )
}

export default ForgotPassword
