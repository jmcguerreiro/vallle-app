import { useState, useCallback, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'

import Form from '@/components/forms/Form'
import Input from '@/components/forms/Input'
import Select from '@/components/forms/Select'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/hooks/useAuth'
import { useMain } from '@/hooks/useMain'
import { get, put } from '@/services/api'

const LANGUAGE_OPTIONS = [
  { value: 'pt', label: 'Português' },
  { value: 'en', label: 'English' },
]

/**
 * Component: Profile
 * User profile page for editing personal details and language preference.
 * @component
 * @returns {JSX.Element}
 */
const Profile = () => {
  // Hooks
  const { t, i18n } = useTranslation()
  const { setUser } = useAuth()
  const { setHeader } = useMain()
  const location = useLocation()
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm()

  // State
  const [serverError, setServerError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(true)

  // Effects
  useEffect(() => {
    setHeader({ title: t('features.profile.heading') })
    return () => setHeader({ title: '' })
  }, [setHeader, t])

  useEffect(() => {
    get('/api/profile')
      .then(({ data }) => {
        reset({
          name: data.user.name,
          email: data.user.email,
          language: i18n.language,
        })
      })
      .catch(() => {
        setServerError(t('features.profile.error.loadFailed'))
      })
      .finally(() => setLoading(false))
  }, [reset, i18n.language, t])

  // Handlers
  const handleSave = useCallback(async (values) => {
    setServerError('')
    setSuccess(false)

    try {
      const { data } = await put('/api/profile', {
        name: values.name,
        email: values.email,
      })

      setUser((previous) => ({ ...previous, ...data.user }))

      if (values.language !== i18n.language) {
        i18n.changeLanguage(values.language)
        localStorage.setItem('vallle_language', values.language)
      }

      setSuccess(true)
    } catch (error) {
      if (error.code === 'EMAIL_TAKEN') {
        setServerError(t('features.profile.error.emailTaken'))
      } else {
        setServerError(t('features.profile.error.generic'))
      }
    }
  }, [setUser, i18n, t])

  // Render
  if (loading) {
    return <p>{t('common.loading')}</p>
  }

  return (
    <div className="c-profile">
      <Form
        className="c-profile__form"
        error={serverError}
        handleSubmit={handleSubmit}
        onSubmit={handleSave}
      >
        <Input
          autoComplete="name"
          error={errors.name}
          label={t('features.profile.form.name')}
          name="name"
          register={register}
          required={t('features.profile.form.error.nameRequired')}
        />
        <Input
          autoComplete="email"
          error={errors.email}
          label={t('features.profile.form.email')}
          name="email"
          register={register}
          required={t('features.profile.form.error.emailRequired')}
          type="email"
        />
        <Select
          control={control}
          error={errors.language}
          label={t('features.profile.form.language')}
          name="language"
          options={LANGUAGE_OPTIONS}
        />
        <button
          className="c-btn c-btn--primary"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? t('common.loading') : t('common.save')}
        </button>
        {success && (
          <p className="c-form__success">{t('features.profile.success')}</p>
        )}
      </Form>

      <fieldset className="c-profile__fieldset">
        <legend className="c-profile__fieldset-legend">
          {t('features.profile.password.heading')}
        </legend>
        <p className="c-profile__fieldset-description">
          {t('features.profile.password.description')}
        </p>
        <Link
          className="c-btn c-btn--secondary"
          state={{ backgroundLocation: location }}
          to={ROUTES.PROFILE_MODAL_CHANGE_PASSWORD}
        >
          {t('features.profile.password.submit')}
        </Link>
      </fieldset>
    </div>
  )
}

export default Profile
