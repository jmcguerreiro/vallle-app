import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'

import Button from '@/components/Button'
import { ROUTES, voucherPath } from '@/constants/routes'
import { useAuth } from '@/hooks/useAuth'
import { useMain } from '@/hooks/useMain'
import { useModal } from '@/hooks/useModal'
import { useRefresh } from '@/hooks/useRefresh'
import { useToast } from '@/hooks/useToast'
import { post } from '@/services/api'

/**
 * Component: VoucherCreate
 * Creates a voucher with a hero amount input, a minimal buyer field, and a
 * fixed expiry derived from the store's default voucher expiry setting.
 * @component
 * @returns {JSX.Element}
 */
const VoucherCreate = () => {
  // Hooks
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { isStoreSuspended, activeStore } = useAuth()
  const { setHeader: setMainHeader } = useMain()
  const { setHeader: setModalHeader, isModal } = useModal()
  const { triggerRefresh } = useRefresh()
  const { addToast } = useToast()

  const { register, handleSubmit, formState: { errors } } = useForm()

  // State
  const [serverError, setServerError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Derived State
  const title = t('features.vouchers.create.heading')
  const description = t('features.vouchers.create.description')
  const setHeader = isModal ? setModalHeader : setMainHeader

  const expiryDate = useMemo(() => {
    const days = activeStore?.default_voucher_expiry_days || 365
    return new Date(Date.now() + days * 86_400_000)
  }, [activeStore])

  const expiryLabel = useMemo(() => {
    const formatted = expiryDate.toLocaleDateString(i18n.language === 'en' ? 'en-GB' : 'pt-PT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    return t('features.vouchers.create.validUntil', { date: formatted })
  }, [expiryDate, i18n.language, t])

  // Handlers
  const onSubmit = useCallback(async (values) => {
    setServerError(null)
    setIsSubmitting(true)

    try {
      const payload = {
        amount: Math.round(Number.parseFloat(values.amount) * 100),
        buyer: values.buyer?.trim() || null,
        expires_at: expiryDate.toISOString(),
      }

      const { data: voucher } = await post('/api/vouchers', payload)
      triggerRefresh()
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
  }, [addToast, expiryDate, location, navigate, t, triggerRefresh])

  // Effects
  useEffect(() => {
    if (isStoreSuspended) navigate(ROUTES.VOUCHERS, { replace: true })
  }, [isStoreSuspended, navigate])

  useEffect(() => {
    setHeader({ title, description })
    return () => setHeader()
  }, [title, description, setHeader])

  // Render
  return (
    <form
      className="c-voucher-create"
      noValidate
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className="c-voucher-create__amount">
        <input
          aria-label={t('features.vouchers.create.amount')}
          className={`c-voucher-create__amount-input${errors.amount ? ' c-voucher-create__amount-input--error' : ''}`}
          inputMode="decimal"
          placeholder={t('features.vouchers.create.amountPlaceholder')}
          size="3"
          type="text"
          {...register('amount', {
            required: t('features.vouchers.create.error.amountRequired'),
            validate: {
              positive: (v) =>
                Number.parseFloat(v) > 0 || t('features.vouchers.create.error.amountPositive'),
            },
          })}
        />
        <span className="c-voucher-create__amount-currency">€</span>
      </div>

      {errors.amount && (
        <p className="c-voucher-create__error">{errors.amount.message}</p>
      )}

      <input
        aria-label={t('features.vouchers.create.buyer')}
        className="c-voucher-create__buyer"
        placeholder={t('features.vouchers.create.buyerPlaceholder')}
        type="text"
        {...register('buyer')}
      />

      <p className="c-voucher-create__expiry">{expiryLabel}</p>

      {serverError && <div className="c-form__error">{serverError}</div>}

      <div className="c-voucher-create__actions">
        <Button isProcessing={isSubmitting} type="submit">
          {t('features.vouchers.create.submit')}
        </Button>
      </div>
    </form>
  )
}

export default VoucherCreate
