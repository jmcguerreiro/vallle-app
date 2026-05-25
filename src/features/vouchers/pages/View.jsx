import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import Accordion from '@/components/Accordion'
import { voucherEditPath, voucherRedeemPath } from '@/constants/routes'
import { isVoucherExpired } from '@/features/vouchers/utils'
import { useMain } from '@/hooks/useMain'
import { useModal } from '@/hooks/useModal'
import { get } from '@/services/api'
import { formatCurrency } from '@/utils/currency'
import { formatDate } from '@/utils/dates'
import { IconPencil, IconReceipt } from '@/utils/icons'

/**
 * Component: VoucherView
 * Displays a single voucher's details and its redemption history.
 * @component
 * @returns {JSX.Element}
 */
const VoucherView = () => {
  // Hooks
  const { t } = useTranslation()
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { setHeader: setMainHeader } = useMain()
  const { setHeader: setModalHeader, isModal } = useModal()

  // State
  const [voucher, setVoucher] = useState(null)
  const [redemptions, setRedemptions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Derived State
  const title = t('features.vouchers.view.heading')
  const description = t('features.vouchers.view.description')
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

  const heroSubtitle = useMemo(() => {
    if (!voucher) return ''
    return t('features.vouchers.view.balanceSummary', {
      total: formatCurrency(voucher.amount),
      balance: formatCurrency(voucher.balance),
    })
  }, [voucher, t])

  const canRedeem = useMemo(() => {
    if (!voucher) return false
    if (voucher.status !== 'active') return false
    if (voucher.balance === 0) return false
    return !isVoucherExpired(voucher.expires_at)
  }, [voucher])

  // Handlers
  const handleEdit = useCallback(() => {
    navigate(voucherEditPath(id), {
      state: { backgroundLocation: location.state?.backgroundLocation || location },
    })
  }, [navigate, id, location])

  const handleRedeem = useCallback(() => {
    navigate(voucherRedeemPath(id), {
      state: { backgroundLocation: location.state?.backgroundLocation || location },
    })
  }, [navigate, id, location])

  const fetchVoucher = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [voucherRes, redemptionsRes] = await Promise.all([
        get(`/api/vouchers/${id}`),
        get(`/api/vouchers/${id}/redemptions`),
      ])
      setVoucher(voucherRes.data)
      setRedemptions(redemptionsRes.data)
    } catch (error_) {
      setError(error_.message || t('common.error'))
    } finally {
      setIsLoading(false)
    }
  }, [id, t])

  // Effects
  useEffect(() => {
    const actions = [
      {
        label: t('features.vouchers.view.edit'),
        icon: IconPencil,
        onClick: handleEdit,
        variant: 'ghost',
      },
    ]

    if (canRedeem) {
      actions.unshift({
        label: t('features.vouchers.redeem.submit'),
        icon: IconReceipt,
        onClick: handleRedeem,
        variant: 'outline',
      })
    }

    setHeader({ title, description, actions })

    return () => setHeader()
  }, [title, description, setHeader, handleEdit, handleRedeem, canRedeem, t])

  useEffect(() => {
    fetchVoucher()
  }, [fetchVoucher])

  // Render
  if (isLoading) {
    return <p>{t('common.loading')}</p>
  }

  if (error || !voucher) {
    return <p>{t('common.error')}</p>
  }

  const fields = [
    { label: t('features.vouchers.view.buyer'), value: voucher.buyer || '—' },
    { label: t('features.vouchers.view.expiresAt'), value: formatDate(voucher.expires_at) },
    { label: t('features.vouchers.view.createdAt'), value: formatDate(voucher.created_at) },
  ]

  return (
    <div className="p-voucher-view">
      <div className="p-voucher-view__hero">
        <span className={`c-voucher-status c-voucher-status--${statusKey}`}>{statusLabel}</span>
        <h2 className={`p-voucher-view__code${statusKey === 'active' ? '' : ' p-voucher-view__code--inactive'}`}>
          {voucher.code}
        </h2>
        <p className="p-voucher-view__subtitle">{heroSubtitle}</p>
      </div>

      <dl className="c-voucher-detail">
        {fields.map(({ label, value }) => (
          <div key={label} className="c-voucher-detail__field">
            <dt className="c-voucher-detail__label">{label}</dt>
            <dd className="c-voucher-detail__value">{value}</dd>
          </div>
        ))}
      </dl>

      <Accordion className="c-voucher-redemptions" title={t('features.vouchers.redemptions.heading')}>
        {redemptions.length === 0 ? (
          <p className="c-voucher-redemptions__empty">
            {t('features.vouchers.redemptions.empty')}
          </p>
        ) : (
          <table className="c-voucher-redemptions__table">
            <thead>
              <tr>
                <th>{t('features.vouchers.redemptions.date')}</th>
                <th>{t('features.vouchers.redemptions.amount')}</th>
                <th>{t('features.vouchers.redemptions.description')}</th>
                <th>{t('features.vouchers.redemptions.redeemedBy')}</th>
              </tr>
            </thead>
            <tbody>
              {redemptions.map((r) => (
                <tr key={r.id}>
                  <td>{formatDate(r.created_at)}</td>
                  <td>{formatCurrency(r.amount)}</td>
                  <td>{r.description || '\u2014'}</td>
                  <td>{r.redeemed_by_name || '\u2014'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Accordion>
    </div>
  )
}

export default VoucherView
