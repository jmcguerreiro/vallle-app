import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'

import Button from '@/components/Button'
import Form from '@/components/forms/Form'
import FormActions from '@/components/forms/FormActions'
import FormFields from '@/components/forms/FormFields'
import Input from '@/components/forms/Input'
import { ROUTES, voucherPath } from '@/constants/routes'
import { useAuth } from '@/hooks/useAuth'
import { useMain } from '@/hooks/useMain'
import { useModal } from '@/hooks/useModal'
import { useToast } from '@/hooks/useToast'
import { post } from '@/services/api'

/**
 * Component: VoucherCreate
 * Form for creating a new voucher. Submits amount (converted from euros to
 * cents), buyer name, and expiry date to the API.
 * @component
 * @returns {JSX.Element}
 */
const VoucherCreate = () => {
  // Hooks
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { isStoreSuspended } = useAuth()
  const { setHeader: setMainHeader } = useMain()
  const { setHeader: setModalHeader, isModal } = useModal()
  const { addToast } = useToast()
  const { register, handleSubmit, formState: { errors } } = useForm()

  // State
  const [serverError, setServerError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Redirect suspended stores away from create
  useEffect(() => {
    if (isStoreSuspended) navigate(ROUTES.VOUCHERS, { replace: true })
  }, [isStoreSuspended, navigate])

  // Derived State
  const title = t('features.vouchers.create.heading')
  const setHeader = isModal ? setModalHeader : setMainHeader

  // Handlers
  const onSubmit = useCallback(async (values) => {
    setServerError(null)
    setIsSubmitting(true)

    try {
      const payload = {
        amount: Math.round(Number.parseFloat(values.amount) * 100),
        buyer: values.buyer || null,
        expires_at: new Date(values.expires_at).toISOString(),
      }

      const { data: voucher } = await post('/api/vouchers', payload)
      addToast(t('features.vouchers.create.success'), 'success')
      const backgroundLocation = location.state?.backgroundLocation || location
      navigate(voucherPath(voucher.id), {
        replace: true,
        state: { backgroundLocation },
      })
    } catch (error) {
      setServerError(error.message || t('features.vouchers.create.error.generic'))
    } finally {
      setIsSubmitting(false)
    }
  }, [addToast, location, navigate, t])

  // Effects
  useEffect(() => {
    setHeader({ title })
    return () => setHeader()
  }, [title, setHeader])

  // Render
  return (
    <Form
      error={serverError}
      handleSubmit={handleSubmit}
      onSubmit={onSubmit}
    >
      <FormFields>
        <Input
          error={errors.amount}
          label={t('features.vouchers.create.amount')}
          name="amount"
          register={register}
          required={t('features.vouchers.create.error.amountRequired')}
          type="number"
          validate={{
            positive: (v) =>
              Number.parseFloat(v) > 0 || t('features.vouchers.create.error.amountPositive'),
          }}
        />
        <Input
          error={errors.buyer}
          label={t('features.vouchers.create.buyer')}
          name="buyer"
          register={register}
        />
        <Input
          error={errors.expires_at}
          label={t('features.vouchers.create.expiresAt')}
          name="expires_at"
          register={register}
          required={t('features.vouchers.create.error.expiresAtRequired')}
          type="date"
          validate={{
            future: (v) =>
              new Date(v) > new Date() || t('features.vouchers.create.error.expiresAtFuture'),
          }}
        />
      </FormFields>
      <FormActions>
        <Button
          isProcessing={isSubmitting}
          type="submit"
        >
          {t('features.vouchers.create.submit')}
        </Button>
        <Button
          onClick={() => navigate(-1)}
          variant="ghost"
        >
          {t('common.cancel')}
        </Button>
      </FormActions>
    </Form>
  )
}

export default VoucherCreate
