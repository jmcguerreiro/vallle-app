import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'

import Badge from '@/components/Badge'
import Stat from '@/components/Stat'
import { adminCompanyEditPath, adminUserPath } from '@/constants/routes'
import { useMain } from '@/hooks/useMain'
import { useModal } from '@/hooks/useModal'
import { useToast } from '@/hooks/useToast'
import { get } from '@/services/api'
import { formatCurrency } from '@/utils/currency'
import { formatDate } from '@/utils/dates'

/**
 * Maps company status values to Badge variants. Statuses without a
 * mapping render with the neutral base style.
 */
const STATUS_VARIANTS = {
  active: 'success',
  suspended: 'warning',
}

/**
 * Maps user status values to Badge variants (used in the company's user list).
 */
const USER_STATUS_VARIANTS = {
  active: 'success',
}

/**
 * Component: AdminCompanyView
 * Displays all details for a single company, including commission stats and users.
 * @component
 * @returns {JSX.Element}
 */
const AdminCompanyView = () => {
  // Hooks
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { setHeader: setMainHeader } = useMain()
  const { setHeader: setModalHeader, isModal } = useModal()
  const { addToast } = useToast()

  // State
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // Derived State
  const setHeader = isModal ? setModalHeader : setMainHeader

  // Handlers
  const fetchCompany = useCallback(async () => {
    try {
      const response = await get(`/api/admin/companies/${id}`)
      setData(response.data)
    } catch {
      addToast(t('features.admin.companies.error.loadFailed'), 'error')
    } finally {
      setIsLoading(false)
    }
  }, [id, addToast, t])

  const handleEdit = useCallback(() => {
    const backgroundLocation = location.state?.backgroundLocation || location
    navigate(adminCompanyEditPath(id), { state: { backgroundLocation } })
  }, [id, navigate, location])

  // Effects
  useEffect(() => {
    setHeader({
      title: t('features.admin.companies.view.heading'),
      description: t('features.admin.companies.view.description'),
      actions: [{ label: t('features.admin.companies.view.edit'), onClick: handleEdit }],
    })
    return () => setHeader()
  }, [setHeader, t, handleEdit])

  useEffect(() => {
    fetchCompany()
  }, [fetchCompany])

  // Render
  if (isLoading) {
    return <div className="c-admin-company-view"><p>{t('common.loading')}</p></div>
  }

  if (!data) return null

  const { store, stats, users } = data

  return (
    <div className="c-admin-company-view">
      <div className="c-admin-stats-grid">
        <Stat
          label={t('features.admin.companies.view.vallles')}
          value={stats.vallle_count}
        />
        <Stat
          label={t('features.admin.companies.view.totalSales')}
          value={formatCurrency(stats.total_vallle_amount)}
        />
        <Stat
          label={t('features.admin.companies.view.totalCommission')}
          value={formatCurrency(stats.total_commission)}
        />
        <Stat
          label={t('features.admin.companies.view.unpaidCommission')}
          value={formatCurrency(stats.unpaid_commission)}
        />
      </div>

      <div className="c-admin-detail-grid">
        <div className="c-admin-detail__row">
          <span className="c-admin-detail__label">{t('features.admin.companies.form.category')}</span>
          <span className="c-admin-detail__value">{store.category || '—'}</span>
        </div>
        <div className="c-admin-detail__row">
          <span className="c-admin-detail__label">{t('features.admin.companies.form.email')}</span>
          <span className="c-admin-detail__value">{store.email || '—'}</span>
        </div>
        <div className="c-admin-detail__row">
          <span className="c-admin-detail__label">{t('features.admin.companies.form.phone')}</span>
          <span className="c-admin-detail__value">{store.phone || '—'}</span>
        </div>
        <div className="c-admin-detail__row">
          <span className="c-admin-detail__label">{t('features.admin.companies.form.vatId')}</span>
          <span className="c-admin-detail__value">{store.vat_id || '—'}</span>
        </div>
        <div className="c-admin-detail__row">
          <span className="c-admin-detail__label">{t('features.admin.companies.list.status')}</span>
          <Badge variant={STATUS_VARIANTS[store.status]}>
            {t(`features.admin.companies.list.${store.status}`)}
          </Badge>
        </div>
        <div className="c-admin-detail__row">
          <span className="c-admin-detail__label">{t('features.admin.companies.list.createdAt')}</span>
          <span className="c-admin-detail__value">{formatDate(store.created_at)}</span>
        </div>
      </div>

      {users.length > 0 && (
        <div className="c-admin-company-users">
          <h3 className="c-admin-company-users__heading">
            {t('features.admin.companies.view.users')}
          </h3>
          <ul className="c-admin-company-users__list">
            {users.map((u) => (
              <li key={u.id} className="c-admin-company-users__item">
                <Link
                  className="c-admin-company-users__link"
                  state={{ backgroundLocation: location.state?.backgroundLocation || location }}
                  to={adminUserPath(u.id)}
                >
                  <span className="c-admin-company-users__name">{u.name}</span>
                  <span className="c-admin-company-users__email">{u.email}</span>
                  <Badge variant={USER_STATUS_VARIANTS[u.status]}>
                    {t(`features.admin.users.list.${u.status}`)}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default AdminCompanyView
