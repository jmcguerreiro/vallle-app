import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'

import Button from '@/components/Button'
import { voucherRedeemPath } from '@/constants/routes'
import VoucherCodeInput, { CODE_LENGTH } from '@/features/vouchers/components/VoucherCodeInput'
import { isVoucherExpired } from '@/features/vouchers/utils'
import { useMain } from '@/hooks/useMain'
import { useModal } from '@/hooks/useModal'
import { get } from '@/services/api'
import { formatCurrency } from '@/utils/currency'
import { formatDate } from '@/utils/dates'

/**
 * Component: QuickLookup
 * Modal for looking up a voucher by its code.
 * Auto-searches when the full code is entered, then displays
 * voucher details inline with an option to redeem.
 * @component
 * @returns {JSX.Element}
 */
const QuickLookup = () => {
  // Hooks
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { setHeader: setMainHeader } = useMain()
  const { setHeader: setModalHeader, isModal } = useModal()

  // State
  const [code, setCode] = useState('')
  const [voucher, setVoucher] = useState(null)
  const [lookupError, setLookupError] = useState(null)
  const [isLooking, setIsLooking] = useState(false)

  // Derived State
  const title = t('features.vouchers.view.heading')
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
  const handleCodeChange = useCallback((raw) => {
    setCode(raw)
    setVoucher(null)
    setLookupError(null)
  }, [])

  const handleRedeem = useCallback(() => {
    navigate(voucherRedeemPath(voucher.id), {
      state: { backgroundLocation: location.state?.backgroundLocation || location },
    })
  }, [navigate, voucher, location])

  const handleReset = useCallback(() => {
    setCode('')
    setVoucher(null)
    setLookupError(null)
  }, [])

  // Effects
  useEffect(() => {
    setHeader({ title })
    return () => setHeader()
  }, [title, setHeader])

  useEffect(() => {
    if (code.length !== CODE_LENGTH) return

    let cancelled = false
    const lookup = async () => {
      setIsLooking(true)
      setLookupError(null)

      try {
        const formatted = `${code.slice(0, 3)}-${code.slice(3, 6)}-${code.slice(6, 9)}`
        const { data } = await get(`/api/vouchers/lookup?code=${encodeURIComponent(formatted)}`)
        if (!cancelled) setVoucher(data)
      } catch (error) {
        if (!cancelled) {
          setLookupError(
            error.code === 'VOUCHER_NOT_FOUND'
              ? t('features.vouchers.redeem.error.notFound')
              : error.message || t('common.error'),
          )
        }
      } finally {
        if (!cancelled) setIsLooking(false)
      }
    }

    lookup()
    return () => { cancelled = true }
  }, [code, t])

  // Render
  const fields = voucher
    ? [
      { label: t('features.vouchers.view.code'), value: voucher.code },
      { label: t('features.vouchers.view.amount'), value: formatCurrency(voucher.amount) },
      { label: t('features.vouchers.view.balance'), value: formatCurrency(voucher.balance) },
      { label: t('features.vouchers.view.buyer'), value: voucher.buyer || '\u2014' },
      { label: t('features.vouchers.view.status'), value: statusLabel },
      { label: t('features.vouchers.view.createdAt'), value: formatDate(voucher.created_at) },
      { label: t('features.vouchers.view.expiresAt'), value: formatDate(voucher.expires_at) },
    ]
    : []

  return (
    <div className="c-voucher-lookup">
      <VoucherCodeInput
        error={lookupError}
        onChange={handleCodeChange}
        value={code}
      />

      {isLooking && (
        <p className="c-voucher-lookup__loading">{t('common.loading')}</p>
      )}

      {voucher && (
        <>
          <dl className="c-voucher-detail c-voucher-lookup__result">
            {fields.map(({ label, value }) => (
              <div key={label} className="c-voucher-detail__field">
                <dt className="c-voucher-detail__label">{label}</dt>
                <dd className="c-voucher-detail__value">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="c-voucher-lookup__actions">
            {canRedeem && (
              <Button onClick={handleRedeem} variant="outline">
                {t('features.vouchers.redeem.submit')}
              </Button>
            )}
            <Button onClick={handleReset} variant="ghost">
              {t('common.search')}
            </Button>
            <Button onClick={() => navigate(-1)} variant="ghost">
              {t('common.back')}
            </Button>
          </div>
        </>
      )}

      {!voucher && !isLooking && !lookupError && (
        <div className="c-voucher-lookup__actions">
          <Button onClick={() => navigate(-1)} variant="ghost">
            {t('common.cancel')}
          </Button>
        </div>
      )}
    </div>
  )
}

export default QuickLookup
