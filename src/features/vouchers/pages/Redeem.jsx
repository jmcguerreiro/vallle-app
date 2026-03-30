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
  const { addToast } = useToast()
  const { register, handleSubmit, formState: { errors } } = useForm()

  // State
  const [voucher, setVoucher] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [serverError, setServerError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Derived State
  const title = t('features.vouchers.redeem.heading')
  const setHeader = isModal ? setModalHeader : setMainHeader

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
  }, [addToast, id, navigate, t])

  // Effects
  useEffect(() => {
    setHeader({ title })
    return () => setHeader()
  }, [title, setHeader])

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
        onSubmit={onSubmit}
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
