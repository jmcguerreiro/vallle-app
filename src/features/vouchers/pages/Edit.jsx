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
import { get, put } from '@/services/api'
import { formatCurrency } from '@/utils/currency'

/**
 * Component: VoucherEdit
 * Form for editing an existing voucher. Only buyer and expiry date
 * are editable; amount is shown as read-only.
 * @component
 * @returns {JSX.Element}
 */
const VoucherEdit = () => {
  // Hooks
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const { setHeader: setMainHeader } = useMain()
  const { setHeader: setModalHeader, isModal } = useModal()
  const { addToast } = useToast()
  const { register, handleSubmit, formState: { errors }, reset } = useForm()

  // State
  const [voucher, setVoucher] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [serverError, setServerError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Derived State
  const title = t('features.vouchers.edit.heading')
  const setHeader = isModal ? setModalHeader : setMainHeader

  // Handlers
  const fetchVoucher = useCallback(async () => {
    setIsLoading(true)
    setFetchError(null)

    try {
      const { data } = await get(`/api/vouchers/${id}`)
      setVoucher(data)
      reset({
        buyer: data.buyer || '',
        expires_at: data.expires_at ? data.expires_at.slice(0, 10) : '',
      })
    } catch (error) {
      setFetchError(error.message || t('features.vouchers.edit.error.loadFailed'))
    } finally {
      setIsLoading(false)
    }
  }, [id, t, reset])

  const onSubmit = useCallback(async (values) => {
    setServerError(null)
    setIsSubmitting(true)

    try {
      await put(`/api/vouchers/${id}`, {
        buyer: values.buyer || null,
        expires_at: new Date(values.expires_at).toISOString(),
      })
      addToast(t('features.vouchers.edit.success'), 'success')
      navigate(-1)
    } catch (error) {
      setServerError(error.message || t('features.vouchers.edit.error.generic'))
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

  if (fetchError || !voucher) {
    return <p>{t('common.error')}</p>
  }

  return (
    <div className="c-voucher-edit">
      <p className="c-voucher-edit__amount">
        {t('features.vouchers.edit.currentAmount')}: {formatCurrency(voucher.amount)}
      </p>
      <Form
        error={serverError}
        handleSubmit={handleSubmit}
        onSubmit={onSubmit}
      >
        <FormFields>
          <Input
            error={errors.buyer}
            label={t('features.vouchers.edit.buyer')}
            name="buyer"
            register={register}
          />
          <Input
            error={errors.expires_at}
            label={t('features.vouchers.edit.expiresAt')}
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
            {t('features.vouchers.edit.submit')}
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

export default VoucherEdit
