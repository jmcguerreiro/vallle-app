import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'

import { Plus, Receipt, Search } from 'lucide-react'

import { ROUTES, voucherCreatePath } from '@/constants/routes'
import { useAuth } from '@/hooks/useAuth'
import { useMain } from '@/hooks/useMain'
import { get } from '@/services/api'

/**
 * Component: Dashboard
 * Welcome screen with active voucher count and three quick-action buttons:
 * Create (Emitir), Redeem (Redimir), and Look up (Consultar).
 * @component
 * @returns {JSX.Element}
 */
const Dashboard = () => {
  // Hooks
  const { t } = useTranslation()
  const { user, isStoreSuspended } = useAuth()
  const { setHeader } = useMain()
  const navigate = useNavigate()
  const location = useLocation()

  // State
  const [activeCount, setActiveCount] = useState(null)

  // Handlers
  const handleCreate = useCallback(() => {
    navigate(voucherCreatePath(), { state: { backgroundLocation: location } })
  }, [navigate, location])

  const handleRedeem = useCallback(() => {
    navigate(ROUTES.VOUCHERS_MODAL_QUICK_REDEEM, { state: { backgroundLocation: location } })
  }, [navigate, location])

  const handleLookup = useCallback(() => {
    navigate(ROUTES.VOUCHERS_MODAL_QUICK_LOOKUP, { state: { backgroundLocation: location } })
  }, [navigate, location])

  // Effects
  useEffect(() => {
    setHeader({ title: t('features.dashboard.heading') })
    return () => setHeader()
  }, [setHeader, t])

  useEffect(() => {
    let cancelled = false

    const fetchCount = async () => {
      try {
        const { data } = await get('/api/stats')
        if (!cancelled) setActiveCount(data.activeVouchers)
      } catch {
        if (!cancelled) setActiveCount(0)
      }
    }

    fetchCount()
    return () => { cancelled = true }
  }, [])

  // Derived State
  const subtitle = activeCount > 0
    ? t('features.dashboard.subtitle', { count: activeCount })
    : t('features.dashboard.subtitleNone')

  // Render
  return (
    <div className="c-dashboard">
      <div className="c-dashboard__welcome">
        <h2 className="c-dashboard__heading">
          {t('features.dashboard.welcome', { name: user?.name })}
        </h2>
        {activeCount !== null && (
          <p className="c-dashboard__subtitle">{subtitle}</p>
        )}
      </div>

      <div className="c-dashboard__actions">
        {!isStoreSuspended && (
          <button className="c-dashboard__action" onClick={handleCreate} type="button">
            <Plus className="c-dashboard__action-icon" size={24} />
            <span className="c-dashboard__action-label">
              {t('features.dashboard.actions.create')}
            </span>
          </button>
        )}
        <button className="c-dashboard__action" onClick={handleRedeem} type="button">
          <Receipt className="c-dashboard__action-icon" size={24} />
          <span className="c-dashboard__action-label">
            {t('features.dashboard.actions.redeem')}
          </span>
        </button>
        <button className="c-dashboard__action" onClick={handleLookup} type="button">
          <Search className="c-dashboard__action-icon" size={24} />
          <span className="c-dashboard__action-label">
            {t('features.dashboard.actions.lookup')}
          </span>
        </button>
      </div>
    </div>
  )
}

export default Dashboard
