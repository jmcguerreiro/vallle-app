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
import { useQueryClient } from '@tanstack/react-query'

import { useMain } from '@/hooks/useMain'
import { useModal } from '@/hooks/useModal'
import { useToast } from '@/hooks/useToast'
import { get, put } from '@/services/api'
import { formatCurrency } from '@/utils/currency'
import { IconArchive, IconRotateCcw } from '@/utils/icons'

/**
 * Component: VoucherEdit
 * Form for editing an existing voucher. Only buyer and expiry date
 * are editable; amount is shown read-only. Provides an archive/restore
 * action in the modal header to toggle the voucher's status.
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
  const queryClient = useQueryClient()
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
  const description = voucher?.code || ''
  const setHeader = isModal ? setModalHeader : setMainHeader

  const statusKey = useMemo(() => {
    if (!voucher) return 'active'
    if (voucher.status === 'archived') return 'archived'
    if (isVoucherExpired(voucher.expires_at)) return 'expired'
    if (voucher.balance === 0) return 'used'
    return 'active'
  }, [voucher])

  const statusLabel = useMemo(() => {
    if (!voucher) return ''
    if (voucher.status === 'archived') return t('features.vouchers.list.archived')
    if (isVoucherExpired(voucher.expires_at)) return t('features.vouchers.list.expired')
    if (voucher.balance === 0) return t('features.vouchers.list.used')
    return t('features.vouchers.list.active')
  }, [voucher, t])

  const amountDisplay = useMemo(() => {
    if (!voucher) return '0.00'
    return (voucher.amount / 100).toFixed(2)
  }, [voucher])

  const availableLabel = useMemo(() => {
    if (!voucher) return ''
    return t('features.vouchers.view.available', { balance: formatCurrency(voucher.balance) })
  }, [voucher, t])

  const isArchived = voucher?.status === 'archived'
  const canToggleArchive = voucher?.status === 'active' || voucher?.status === 'archived'

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
      queryClient.invalidateQueries({ queryKey: ['vouchers'] })
      addToast(t('features.vouchers.edit.success'), 'success')
      navigate(-1)
    } catch (error) {
      setServerError(error.message || t('features.vouchers.edit.error.generic'))
    } finally {
      setIsSubmitting(false)
    }
  }, [addToast, id, navigate, t, queryClient])

  const handleToggleArchive = useCallback(async () => {
    const nextStatus = isArchived ? 'active' : 'archived'
    const confirmKey = isArchived ? 'restoreConfirm' : 'archiveConfirm'
    if (!window.confirm(t(`features.vouchers.edit.${confirmKey}`))) return

    try {
      const { data } = await put(`/api/vouchers/${id}`, { status: nextStatus })
      setVoucher(data)
      queryClient.invalidateQueries({ queryKey: ['vouchers'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      addToast(
        t(`features.vouchers.edit.${isArchived ? 'restoreSuccess' : 'archiveSuccess'}`),
        'success',
      )
    } catch (error) {
      addToast(error.message || t('features.vouchers.edit.error.generic'), 'error')
    }
  }, [addToast, id, isArchived, t, queryClient])

  // Effects
  useEffect(() => {
    const actions = canToggleArchive
      ? [
        {
          label: t(`features.vouchers.edit.${isArchived ? 'restore' : 'archive'}`),
          icon: isArchived ? IconRotateCcw : IconArchive,
          onClick: handleToggleArchive,
          variant: 'ghost',
        },
      ]
      : []

    setHeader({ title, description, actions })
    return () => setHeader()
  }, [title, description, setHeader, canToggleArchive, isArchived, handleToggleArchive, t])

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
    <div className="p-voucher-edit">
      <div className="p-voucher-edit__hero">
        <span className={`c-voucher-status c-voucher-status--${statusKey}`}>{statusLabel}</span>
        <div className="p-voucher-edit__balance">
          <span className={`p-voucher-edit__balance-value${statusKey === 'active' ? '' : ' p-voucher-edit__balance-value--inactive'}`}>
            {amountDisplay}
          </span>
          <span className="p-voucher-edit__balance-currency">{'€'}</span>
        </div>
        <p className="p-voucher-edit__total">{availableLabel}</p>
      </div>

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
