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

const AVATAR_NAMES = [
  'paper-bag-head',
  'alien-cap',
  'cat-glasses',
  'chef-bearded',
  'cow-glasses-suit',
  'crocodile-cap',
  'deer-sunglasses',
  'duck-in-suit',
  'elder-man-glasses',
  'elephant-beret',
  'fishbowl-head',
  'fox-glasses-tie',
  'grandma-scarf',
  'horse-in-suit',
  'lion-beanie',
  'man-astronaut',
  'man-curly-rainbow-tee',
  'man-curly-stubble',
  'man-curly-tie',
  'man-dark-scarf',
  'man-dark-turtleneck',
  'man-flat-cap',
  'man-glasses-tie',
  'man-heart-necklace',
  'man-heart-tattoo',
  'man-mohawk',
  'man-swept-hair',
  'man-wavy-scarf',
  'person-balaclava',
  'person-curly-glasses',
  'person-half-up-hair',
  'person-hoodie',
  'person-ponytail',
  'pig-in-blazer',
  'rabbit-in-suit',
  'rhino-sunglasses',
  'robot-heart',
  'robot-lightning',
  'rooster-sunglasses',
  'vulture-cowboy-hat',
  'woman-astronaut',
  'woman-athletic-knot',
  'woman-bob',
  'woman-bowl-cut',
  'woman-bowtie',
  'woman-curly-updo',
  'woman-dark-blazer',
  'woman-dark-lob',
  'woman-heart-top',
  'woman-shaved-head',
]

const AVATAR_OPTIONS = AVATAR_NAMES.map((name) => ({
  value: name,
  label: name.replaceAll('-', ' '),
  src: `/images/avatars/${name}.svg`,
}))

const formatAvatarOption = ({ src, label }) => (
  <span className="c-avatar-option">
    <img alt={label} className="c-avatar-option__img" src={src} />
    <span className="c-avatar-option__label">{label}</span>
  </span>
)

/**
 * Component: Profile
 * User profile page for editing personal details, avatar, and language preference.
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
    setHeader({
      title: t('features.profile.heading'),
      description: t('features.profile.description'),
      image: 'profile',
    })
    return () => setHeader({ title: '' })
  }, [setHeader, t])

  useEffect(() => {
    get('/api/profile')
      .then(({ data }) => {
        reset({
          name: data.user.name,
          email: data.user.email,
          language: i18n.language,
          avatar: data.user.avatar || 'paper-bag-head',
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
        avatar: values.avatar,
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
        <Select
          control={control}
          error={errors.avatar}
          formatOptionLabel={formatAvatarOption}
          isSearchable
          label={t('features.profile.form.avatar')}
          name="avatar"
          options={AVATAR_OPTIONS}
        />
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
