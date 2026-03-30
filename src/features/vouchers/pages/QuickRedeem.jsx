import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import Button from '@/components/Button'
import Form from '@/components/forms/Form'
import FormActions from '@/components/forms/FormActions'
import FormFields from '@/components/forms/FormFields'
import Input from '@/components/forms/Input'
import VoucherCodeInput, { CODE_LENGTH } from '@/features/vouchers/components/VoucherCodeInput'
import { useMain } from '@/hooks/useMain'
import { useModal } from '@/hooks/useModal'
import { useToast } from '@/hooks/useToast'
import { get, post } from '@/services/api'
import { formatCurrency } from '@/utils/currency'

/**
 * Component: QuickRedeem
 * Two-step modal: first enter a voucher code (auto-formatted with dashes),
 * then fill in amount + description to redeem.
 * @component
 * @returns {JSX.Element}
 */
const QuickRedeem = () => {
  // Hooks
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { setHeader: setMainHeader } = useMain()
  const { setHeader: setModalHeader, isModal } = useModal()
  const { addToast } = useToast()
  const { register, handleSubmit, formState: { errors }, reset } = useForm()

  // State
  const [code, setCode] = useState('')
  const [voucher, setVoucher] = useState(null)
  const [lookupError, setLookupError] = useState(null)
  const [isLooking, setIsLooking] = useState(false)
  const [serverError, setServerError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Derived State
  const title = t('features.vouchers.redeem.heading')
  const setHeader = isModal ? setModalHeader : setMainHeader

  // Handlers
  const handleCodeChange = useCallback((raw) => {
    setCode(raw)
    setLookupError(null)
  }, [])

  const handleLookup = useCallback(async () => {
    setLookupError(null)
    setIsLooking(true)

    try {
      const formatted = `${code.slice(0, 3)}-${code.slice(3, 6)}-${code.slice(6, 9)}`
      const { data } = await get(`/api/vouchers/lookup?code=${encodeURIComponent(formatted)}`)

      if (new Date(data.expires_at) < new Date()) {
        setLookupError(t('features.vouchers.redeem.error.expired'))
        return
      }

      if (data.balance === 0) {
        setLookupError(t('features.vouchers.redeem.error.insufficientBalance'))
        return
      }

      setVoucher(data)
      reset()
    } catch (error) {
      setLookupError(
        error.code === 'VOUCHER_NOT_FOUND'
          ? t('features.vouchers.redeem.error.notFound')
          : error.message || t('common.error'),
      )
    } finally {
      setIsLooking(false)
    }
  }, [code, reset, t])

  const handleRedeem = useCallback(async (values) => {
    setServerError(null)
    setIsSubmitting(true)

    try {
      const payload = {
        amount: Math.round(Number.parseFloat(values.amount) * 100),
        description: values.description || null,
      }

      await post(`/api/vouchers/${voucher.id}/redeem`, payload)
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
  }, [addToast, navigate, t, voucher])

  const handleBack = useCallback(() => {
    setCode('')
    setVoucher(null)
    setServerError(null)
    reset()
  }, [reset])

  // Effects
  useEffect(() => {
    setHeader({ title })
    return () => setHeader()
  }, [title, setHeader])

  // Render
  if (!voucher) {
    return (
      <div className="c-voucher-lookup">
        <VoucherCodeInput
          error={lookupError}
          onChange={handleCodeChange}
          value={code}
        />
        <div className="c-voucher-lookup__actions">
          <Button
            disabled={code.length !== CODE_LENGTH}
            isProcessing={isLooking}
            onClick={handleLookup}
          >
            {t('common.search')}
          </Button>
          <Button onClick={() => navigate(-1)} variant="ghost">
            {t('common.cancel')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="c-voucher-redeem">
      <div className="c-voucher-redeem__info">
        <span className="c-voucher-redeem__code">{voucher.code}</span>
        <span className="c-voucher-redeem__balance">
          {t('features.vouchers.view.balance')}: {formatCurrency(voucher.balance)}
        </span>
      </div>

      <Form
        error={serverError}
        handleSubmit={handleSubmit}
        onSubmit={handleRedeem}
      >
        <FormFields>
          <Input
            error={errors.amount}
            label={t('features.vouchers.redeem.amount')}
            name="amount"
            register={register}
            required={t('features.vouchers.create.error.amountRequired')}
            type="number"
            validate={{
              positive: (v) =>
                Number.parseFloat(v) > 0 || t('features.vouchers.create.error.amountPositive'),
              max: (v) =>
                Math.round(Number.parseFloat(v) * 100) <= voucher.balance ||
                t('features.vouchers.redeem.error.insufficientBalance'),
            }}
          />
          <Input
            error={errors.description}
            label={t('features.vouchers.redeem.description')}
            name="description"
            register={register}
          />
        </FormFields>
        <FormActions>
          <Button isProcessing={isSubmitting} type="submit">
            {t('features.vouchers.redeem.submit')}
          </Button>
          <Button onClick={handleBack} variant="ghost">
            {t('common.back')}
          </Button>
        </FormActions>
      </Form>
    </div>
  )
}

export default QuickRedeem
