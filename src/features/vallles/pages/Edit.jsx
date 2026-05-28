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
import { get, put } from '@/services/api'
import { formatCurrency } from '@/utils/currency'
import { IconArchive, IconRotateCcw } from '@/utils/icons'

const STATUS_VARIANTS = {
  active: 'success',
  expired: 'danger',
}

/**
 * Component: VallleEdit
 * Form for editing an existing vallle. Only buyer and expiry date
 * are editable; amount is shown read-only. Provides an archive/restore
 * action in the modal header to toggle the vallle's status.
 * @component
 * @returns {JSX.Element}
 */
const VallleEdit = () => {
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
  const [vallle, setVallle] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [serverError, setServerError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Derived State
  const title = t('features.vallles.edit.heading')
  const description = vallle?.code || ''
  const setHeader = isModal ? setModalHeader : setMainHeader

  const statusKey = useMemo(() => {
    if (!vallle) return 'active'
    if (vallle.status === 'archived') return 'archived'
    if (isVallleExpired(vallle.expires_at)) return 'expired'
    if (vallle.balance === 0) return 'used'
    return 'active'
  }, [vallle])

  const statusLabel = useMemo(() => {
    if (!vallle) return ''
    if (vallle.status === 'archived') return t('features.vallles.list.archived')
    if (isVallleExpired(vallle.expires_at)) return t('features.vallles.list.expired')
    if (vallle.balance === 0) return t('features.vallles.list.used')
    return t('features.vallles.list.active')
  }, [vallle, t])

  const amountDisplay = useMemo(() => {
    if (!vallle) return '0.00'
    return (vallle.amount / 100).toFixed(2)
  }, [vallle])

  const availableLabel = useMemo(() => {
    if (!vallle) return ''
    return t('features.vallles.view.available', { balance: formatCurrency(vallle.balance) })
  }, [vallle, t])

  const isArchived = vallle?.status === 'archived'
  const canToggleArchive = vallle?.status === 'active' || vallle?.status === 'archived'

  // Handlers
  const fetchVallle = useCallback(async () => {
    setIsLoading(true)
    setFetchError(null)

    try {
      const { data } = await get(`/api/vallles/${id}`)
      setVallle(data)
      reset({
        buyer: data.buyer || '',
        expires_at: data.expires_at ? data.expires_at.slice(0, 10) : '',
      })
    } catch (error) {
      setFetchError(error.message || t('features.vallles.edit.error.loadFailed'))
    } finally {
      setIsLoading(false)
    }
  }, [id, t, reset])

  const onSubmit = useCallback(async (values) => {
    setServerError(null)
    setIsSubmitting(true)

    try {
      await put(`/api/vallles/${id}`, {
        buyer: values.buyer || null,
        expires_at: new Date(values.expires_at).toISOString(),
      })
      queryClient.invalidateQueries({ queryKey: ['vallles'] })
      addToast(t('features.vallles.edit.success'), 'success')
      navigate(-1)
    } catch (error) {
      setServerError(error.message || t('features.vallles.edit.error.generic'))
    } finally {
      setIsSubmitting(false)
    }
  }, [addToast, id, navigate, t, queryClient])

  const handleToggleArchive = useCallback(async () => {
    const nextStatus = isArchived ? 'active' : 'archived'
    const confirmKey = isArchived ? 'restoreConfirm' : 'archiveConfirm'
    if (!window.confirm(t(`features.vallles.edit.${confirmKey}`))) return

    try {
      const { data } = await put(`/api/vallles/${id}`, { status: nextStatus })
      setVallle(data)
      queryClient.invalidateQueries({ queryKey: ['vallles'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      addToast(
        t(`features.vallles.edit.${isArchived ? 'restoreSuccess' : 'archiveSuccess'}`),
        'success',
      )
    } catch (error) {
      addToast(error.message || t('features.vallles.edit.error.generic'), 'error')
    }
  }, [addToast, id, isArchived, t, queryClient])

  // Effects
  useEffect(() => {
    const actions = canToggleArchive
      ? [
        {
          label: t(`features.vallles.edit.${isArchived ? 'restore' : 'archive'}`),
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
    fetchVallle()
  }, [fetchVallle])

  // Render
  if (isLoading) {
    return <p>{t('common.loading')}</p>
  }

  if (fetchError || !vallle) {
    return <p>{t('common.error')}</p>
  }

  return (
    <div className="p-vallle-edit">
      <div className="p-vallle-edit__hero">
        <Badge variant={STATUS_VARIANTS[statusKey]}>{statusLabel}</Badge>
        <div className="p-vallle-edit__balance">
          <span className={`p-vallle-edit__balance-value${statusKey === 'active' ? '' : ' p-vallle-edit__balance-value--inactive'}`}>
            {amountDisplay}
          </span>
          <span className="p-vallle-edit__balance-currency">{'€'}</span>
        </div>
        <p className="p-vallle-edit__total">{availableLabel}</p>
      </div>

      <Form
        error={serverError}
        handleSubmit={handleSubmit}
        onSubmit={onSubmit}
      >
        <FormFields>
          <Input
            error={errors.buyer}
            label={t('features.vallles.edit.buyer')}
            name="buyer"
            register={register}
          />
          <Input
            error={errors.expires_at}
            label={t('features.vallles.edit.expiresAt')}
            name="expires_at"
            register={register}
            required={t('features.vallles.create.error.expiresAtRequired')}
            type="date"
            validate={{
              future: (v) =>
                new Date(v) > new Date() || t('features.vallles.create.error.expiresAtFuture'),
            }}
          />
        </FormFields>
        <FormActions>
          <Button
            isProcessing={isSubmitting}
            type="submit"
          >
            {t('features.vallles.edit.submit')}
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

export default VallleEdit
