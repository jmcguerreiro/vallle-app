import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'

import Badge from '@/components/Badge'
import Button from '@/components/Button'
import Form from '@/components/forms/Form'
import FormActions from '@/components/forms/FormActions'
import FormFields from '@/components/forms/FormFields'
import Input from '@/components/forms/Input'
import { isVallleExpired } from '@/features/vallles/utils'
import { useQueryClient } from '@tanstack/react-query'

import { useMain } from '@/hooks/useMain'
import { useModal } from '@/hooks/useModal'
import { useToast } from '@/hooks/useToast'
import { get, post } from '@/services/api'
import { formatCurrency } from '@/utils/currency'

const STATUS_VARIANTS = {
  active: 'success',
  expired: 'danger',
}

/**
 * Component: VallleRedeem
 * Form for redeeming (partially or fully) a vallle.
 * Shows the vallle code and current balance, then accepts
 * an amount and optional description.
 * @component
 * @returns {JSX.Element}
 */
const VallleRedeem = () => {
  // Hooks
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams()
  const { setHeader: setMainHeader } = useMain()
  const { setHeader: setModalHeader, isModal } = useModal()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const { register, handleSubmit, formState: { errors } } = useForm()

  // State
  const [vallle, setVallle] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [serverError, setServerError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Derived State
  const title = t('features.vallles.redeem.heading')
  const description = vallle?.code || ''
  const setHeader = isModal ? setModalHeader : setMainHeader

  const statusKey = useMemo(() => {
    if (!vallle) return 'active'
    if (isVallleExpired(vallle.expires_at)) return 'expired'
    if (vallle.balance === 0) return 'used'
    return 'active'
  }, [vallle])

  const statusLabel = useMemo(() => {
    if (!vallle) return ''
    if (isVallleExpired(vallle.expires_at)) return t('features.vallles.list.expired')
    if (vallle.balance === 0) return t('features.vallles.list.used')
    return t('features.vallles.list.active')
  }, [vallle, t])

  const remainingLabel = useMemo(() => {
    if (!vallle) return ''
    return t('features.vallles.redeem.remaining', { balance: formatCurrency(vallle.balance) })
  }, [vallle, t])

  // Handlers
  const fetchVallle = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data } = await get(`/api/vallles/${id}`)
      setVallle(data)
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

      await post(`/api/vallles/${id}/redeem`, payload)
      queryClient.invalidateQueries({ queryKey: ['vallles'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      addToast(t('features.vallles.redeem.success'), 'success')
      navigate(-1)
    } catch (error) {
      const codeMap = {
        VALLLE_EXPIRED: t('features.vallles.redeem.error.expired'),
        VALLLE_INSUFFICIENT_BALANCE: t('features.vallles.redeem.error.insufficientBalance'),
      }
      setServerError(codeMap[error.code] || error.message || t('features.vallles.redeem.error.generic'))
    } finally {
      setIsSubmitting(false)
    }
  }, [addToast, id, navigate, t, queryClient])

  // Effects
  useEffect(() => {
    setHeader({ title, description })
    return () => setHeader()
  }, [title, description, setHeader])

  useEffect(() => {
    fetchVallle()
  }, [fetchVallle])

  // Render
  if (isLoading) {
    return <p>{t('common.loading')}</p>
  }

  if (!vallle) {
    return <p>{t('common.error')}</p>
  }

  return (
    <div className="p-vallle-redeem">
      <Form
        error={serverError}
        handleSubmit={handleSubmit}
        onSubmit={onSubmit}
      >
        <div className="p-vallle-redeem__hero">
          <div className="p-vallle-redeem__balance">
            <input
              aria-label={t('features.vallles.redeem.amount')}
              className="p-vallle-redeem__balance-value"
              inputMode="decimal"
              placeholder={t('features.vallles.create.amountPlaceholder')}
              type="text"
              {...register('amount', {
                required: t('features.vallles.create.error.amountRequired'),
                validate: {
                  positive: (v) =>
                    Number.parseFloat(v) > 0 || t('features.vallles.create.error.amountPositive'),
                  max: (v) =>
                    Math.round(Number.parseFloat(v) * 100) <= vallle.balance ||
                    t('features.vallles.redeem.error.insufficientBalance'),
                },
              })}
            />
            <span className="p-vallle-redeem__balance-currency">{'€'}</span>
          </div>
          {errors.amount && (
            <p className="p-vallle-redeem__error">{errors.amount.message}</p>
          )}
          <p className="p-vallle-redeem__total">{remainingLabel}</p>
          <Badge variant={STATUS_VARIANTS[statusKey]}>{statusLabel}</Badge>
        </div>

        <FormFields>
          <Input
            error={errors.description}
            label={t('features.vallles.redeem.description')}
            name="description"
            register={register}
          />
        </FormFields>
        <FormActions>
          <Button
            isProcessing={isSubmitting}
            type="submit"
          >
            {t('features.vallles.redeem.submit')}
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

export default VallleRedeem
