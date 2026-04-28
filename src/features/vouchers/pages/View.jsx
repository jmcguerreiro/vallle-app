import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import { Pencil, Receipt } from 'lucide-react'

import { voucherEditPath, voucherRedeemPath } from '@/constants/routes'
import { isVoucherExpired } from '@/features/vouchers/utils'
import { useMain } from '@/hooks/useMain'
import { useModal } from '@/hooks/useModal'
import { get } from '@/services/api'
import { formatCurrency } from '@/utils/currency'
import { formatDate } from '@/utils/dates'

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

  const statusLabel = useMemo(() => {
    if (!voucher) return ''
    if (isVoucherExpired(voucher.expires_at)) return t('features.vouchers.list.expired')
    if (voucher.balance === 0) return t('features.vouchers.list.used')
    return t('features.vouchers.list.active')
  }, [voucher, t])

  const canRedeem = useMemo(() => {
    if (!voucher) return false
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
        icon: Pencil,
        onClick: handleEdit,
        variant: 'ghost',
      },
    ]

    if (canRedeem) {
      actions.unshift({
        label: t('features.vouchers.redeem.submit'),
        icon: Receipt,
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
    { label: t('features.vouchers.view.code'), value: voucher.code },
    { label: t('features.vouchers.view.amount'), value: formatCurrency(voucher.amount) },
    { label: t('features.vouchers.view.balance'), value: formatCurrency(voucher.balance) },
    { label: t('features.vouchers.view.buyer'), value: voucher.buyer || '\u2014' },
    { label: t('features.vouchers.view.status'), value: statusLabel },
    { label: t('features.vouchers.view.createdAt'), value: formatDate(voucher.created_at) },
    { label: t('features.vouchers.view.expiresAt'), value: formatDate(voucher.expires_at) },
  ]

  return (
    <div className="c-voucher-view">
      <dl className="c-voucher-detail">
        {fields.map(({ label, value }) => (
          <div key={label} className="c-voucher-detail__field">
            <dt className="c-voucher-detail__label">{label}</dt>
            <dd className="c-voucher-detail__value">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="c-voucher-redemptions">
        <h3 className="c-voucher-redemptions__heading">
          {t('features.vouchers.redemptions.heading')}
        </h3>
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
      </div>
    </div>
  )
}

export default VoucherView
