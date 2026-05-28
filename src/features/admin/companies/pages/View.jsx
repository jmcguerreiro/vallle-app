import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'

import Button from '@/components/Button'
import { adminCompanyEditPath, adminUserPath } from '@/constants/routes'
import { useMain } from '@/hooks/useMain'
import { useModal } from '@/hooks/useModal'
import { useToast } from '@/hooks/useToast'
import { get } from '@/services/api'
import { formatCurrency } from '@/utils/currency'
import { formatDate } from '@/utils/dates'

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
        <div className="c-admin-stat">
          <span className="c-admin-stat__label">{t('features.admin.companies.view.vallles')}</span>
          <span className="c-admin-stat__value">{stats.vallle_count}</span>
        </div>
        <div className="c-admin-stat">
          <span className="c-admin-stat__label">{t('features.admin.companies.view.totalSales')}</span>
          <span className="c-admin-stat__value">{formatCurrency(stats.total_vallle_amount)}</span>
        </div>
        <div className="c-admin-stat">
          <span className="c-admin-stat__label">{t('features.admin.companies.view.totalCommission')}</span>
          <span className="c-admin-stat__value">{formatCurrency(stats.total_commission)}</span>
        </div>
        <div className="c-admin-stat c-admin-stat--highlight">
          <span className="c-admin-stat__label">{t('features.admin.companies.view.unpaidCommission')}</span>
          <span className="c-admin-stat__value">{formatCurrency(stats.unpaid_commission)}</span>
        </div>
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
          <span className={`c-admin-badge c-admin-badge--${store.status}`}>
            {t(`features.admin.companies.list.${store.status}`)}
          </span>
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
                  to={adminUserPath(u.id)}
                  state={{ backgroundLocation: location.state?.backgroundLocation || location }}
                  className="c-admin-company-users__link"
                >
                  <span className="c-admin-company-users__name">{u.name}</span>
                  <span className="c-admin-company-users__email">{u.email}</span>
                  <span className={`c-admin-badge c-admin-badge--${u.status}`}>
                    {t(`features.admin.users.list.${u.status}`)}
                  </span>
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
