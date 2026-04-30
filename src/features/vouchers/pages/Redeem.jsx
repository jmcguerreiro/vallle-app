import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'

import Button from '@/components/Button'
import Form from '@/components/forms/Form'
import FormActions from '@/components/forms/FormActions'
import FormFields from '@/components/forms/FormFields'
import Input from '@/components/forms/Input'
import { isVoucherExpired } from '@/features/vouchers/utils'
import { useMain } from '@/hooks/useMain'
import { useModal } from '@/hooks/useModal'
import { useRefresh } from '@/hooks/useRefresh'
import { useToast } from '@/hooks/useToast'
import { get, post } from '@/services/api'
import { formatCurrency } from '@/utils/currency'

/**
 * Component: VoucherRedeem
 * Form for redeeming (partially or fully) a voucher.
 * Shows the voucher code and current balance, then accepts
 * an amount and optional description.
 * @component
 * @returns {JSX.Element}
 */
const VoucherRedeem = () => {
  // Hooks
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams()
  const { setHeader: setMainHeader } = useMain()
  const { setHeader: setModalHeader, isModal } = useModal()
  const { triggerRefresh } = useRefresh()
  const { addToast } = useToast()
  const { register, handleSubmit, formState: { errors } } = useForm()

  // State
  const [voucher, setVoucher] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [serverError, setServerError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Derived State
  const title = t('features.vouchers.redeem.heading')
  const description = voucher?.code || ''
  const setHeader = isModal ? setModalHeader : setMainHeader

  const statusKey = useMemo(() => {
    if (!voucher) return 'active'
    if (isVoucherExpired(voucher.expires_at)) return 'expired'
    if (voucher.balance === 0) return 'used'
    return 'active'
  }, [voucher])

  const statusLabel = useMemo(() => {
    if (!voucher) return ''
    if (isVoucherExpired(voucher.expires_at)) return t('features.vouchers.list.expired')
    if (voucher.balance === 0) return t('features.vouchers.list.used')
    return t('features.vouchers.list.active')
  }, [voucher, t])

  const remainingLabel = useMemo(() => {
    if (!voucher) return ''
    return t('features.vouchers.redeem.remaining', { balance: formatCurrency(voucher.balance) })
  }, [voucher, t])

  // Handlers
  const fetchVoucher = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data } = await get(`/api/vouchers/${id}`)
      setVoucher(data)
    } catch {
      setServerError(t('common.error'))
    } finally {
      setIsLoading(false)
    }
  }, [id, t])

  const onSubmit = useCallback(async (values) => {
    setServerError(null)
    setIsSubmitting(true)

    try {
      const payload = {
        amount: Math.round(Number.parseFloat(values.amount) * 100),
        description: values.description || null,
      }

      await post(`/api/vouchers/${id}/redeem`, payload)
      triggerRefresh()
      addToast(t('features.vouchers.redeem.success'), 'success')
      navigate(-1)
    } catch (error) {
      const codeMap = {
        VOUCHER_EXPIRED: t('features.vouchers.redeem.error.expired'),
        VOUCHER_INSUFFICIENT_BALANCE: t('features.vouchers.redeem.error.insufficientBalance'),
      }
      setServerError(codeMap[error.code] || error.message || t('features.vouchers.redeem.error.generic'))
    } finally {
      setIsSubmitting(false)
    }
  }, [addToast, id, navigate, t, triggerRefresh])

  // Effects
  useEffect(() => {
    setHeader({ title, description })
    return () => setHeader()
  }, [title, description, setHeader])

  useEffect(() => {
    fetchVoucher()
  }, [fetchVoucher])

  // Render
  if (isLoading) {
    return <p>{t('common.loading')}</p>
  }

  if (!voucher) {
    return <p>{t('common.error')}</p>
  }

  return (
    <div className="p-voucher-redeem">
      <Form
        error={serverError}
        handleSubmit={handleSubmit}
        onSubmit={onSubmit}
      >
        <div className="p-voucher-redeem__hero">
          <div className="p-voucher-redeem__balance">
            <input
              aria-label={t('features.vouchers.redeem.amount')}
              className="p-voucher-redeem__balance-value"
              inputMode="decimal"
              placeholder={t('features.vouchers.create.amountPlaceholder')}
              type="text"
              {...register('amount', {
                required: t('features.vouchers.create.error.amountRequired'),
                validate: {
                  positive: (v) =>
                    Number.parseFloat(v) > 0 || t('features.vouchers.create.error.amountPositive'),
                  max: (v) =>
                    Math.round(Number.parseFloat(v) * 100) <= voucher.balance ||
                    t('features.vouchers.redeem.error.insufficientBalance'),
                },
              })}
            />
            <span className="p-voucher-redeem__balance-currency">{'€'}</span>
          </div>
          {errors.amount && (
            <p className="p-voucher-redeem__error">{errors.amount.message}</p>
          )}
          <p className="p-voucher-redeem__total">{remainingLabel}</p>
          <span className={`c-voucher-status c-voucher-status--${statusKey}`}>{statusLabel}</span>
        </div>

        <FormFields>
          <Input
            error={errors.description}
            label={t('features.vouchers.redeem.description')}
            name="description"
            register={register}
          />
        </FormFields>
        <FormActions>
          <Button
            isProcessing={isSubmitting}
            type="submit"
          >
            {t('features.vouchers.redeem.submit')}
          </Button>
          <Button
            onClick={() => navigate(-1)}
            variant="ghost"
          >
            {t('common.cancel')}
          </Button>
        </FormActions>
      </Form>
    </div>
  )
}

export default VoucherRedeem
