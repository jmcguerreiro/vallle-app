import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'

import { adminCompanyPath, adminUserEditPath } from '@/constants/routes'
import { useAuth } from '@/hooks/useAuth'
import { useMain } from '@/hooks/useMain'
import { useModal } from '@/hooks/useModal'
import { useToast } from '@/hooks/useToast'
import { get, put } from '@/services/api'
import { formatDate } from '@/utils/dates'

/**
 * Component: AdminUserView
 * Displays all details for a single user, including role, status, and assigned companies.
 * @component
 * @returns {JSX.Element}
 */
const AdminUserView = () => {
  // Hooks
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user: currentUser } = useAuth()
  const { setHeader: setMainHeader } = useMain()
  const { setHeader: setModalHeader, isModal } = useModal()
  const { addToast } = useToast()

  // State
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // Derived State
  const setHeader = isModal ? setModalHeader : setMainHeader

  // Handlers
  const fetchUser = useCallback(async () => {
    try {
      const response = await get(`/api/admin/users/${id}`)
      setData(response.data)
    } catch {
      addToast(t('features.admin.users.error.loadFailed'), 'error')
    } finally {
      setIsLoading(false)
    }
  }, [id, addToast, t])

  const handleEdit = useCallback(() => {
    const backgroundLocation = location.state?.backgroundLocation || location
    navigate(adminUserEditPath(id), { state: { backgroundLocation } })
  }, [id, navigate, location])

  const handleToggleStatus = useCallback(async () => {
    if (!data?.user) return
    const newStatus = data.user.status === 'active' ? 'inactive' : 'active'
    try {
      await put(`/api/admin/users/${id}`, { ...data.user, status: newStatus })
      setData((prev) => ({ ...prev, user: { ...prev.user, status: newStatus } }))
      addToast(t('features.admin.users.view.statusUpdated'), 'success')
    } catch {
      addToast(t('features.admin.users.error.generic'), 'error')
    }
  }, [id, data, addToast, t])

  // Derived State
  const isSelf = currentUser?.id === id

  // Effects
  useEffect(() => {
    const actions = [{ label: t('features.admin.users.view.edit'), onClick: handleEdit }]
    if (data?.user && !isSelf) {
      const isActive = data.user.status === 'active'
      actions.push({
        label: isActive
          ? t('features.admin.users.view.disable')
          : t('features.admin.users.view.enable'),
        onClick: handleToggleStatus,
        variant: isActive ? 'danger' : 'primary',
      })
    }
    setHeader({
      title: t('features.admin.users.view.heading'),
      description: t('features.admin.users.view.description'),
      actions,
    })
    return () => setHeader()
  }, [setHeader, t, handleEdit, handleToggleStatus, data, isSelf])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  // Render
  if (isLoading) {
    return <div className="c-admin-user-view"><p>{t('common.loading')}</p></div>
  }

  if (!data) return null

  const { user } = data

  return (
    <div className="c-admin-user-view">
      <div className="c-admin-detail-grid">
        <div className="c-admin-detail__row">
          <span className="c-admin-detail__label">{t('features.admin.users.form.name')}</span>
          <span className="c-admin-detail__value">{user.name}</span>
        </div>
        <div className="c-admin-detail__row">
          <span className="c-admin-detail__label">{t('features.admin.users.form.email')}</span>
          <span className="c-admin-detail__value">{user.email}</span>
        </div>
        <div className="c-admin-detail__row">
          <span className="c-admin-detail__label">{t('features.admin.users.list.role')}</span>
          <span className={`c-admin-badge c-admin-badge--role-${user.role}`}>
            {t(`features.admin.users.list.role_${user.role}`)}
          </span>
        </div>
        <div className="c-admin-detail__row">
          <span className="c-admin-detail__label">{t('features.admin.users.list.status')}</span>
          <span className={`c-admin-badge c-admin-badge--${user.status}`}>
            {t(`features.admin.users.list.${user.status}`)}
          </span>
        </div>
        <div className="c-admin-detail__row">
          <span className="c-admin-detail__label">{t('features.admin.users.list.createdAt')}</span>
          <span className="c-admin-detail__value">{formatDate(user.created_at)}</span>
        </div>
      </div>

      {user.stores?.length > 0 && (
        <div className="c-admin-company-users">
          <h3 className="c-admin-company-users__heading">
            {t('features.admin.users.view.companies')}
          </h3>
          <ul className="c-admin-company-users__list">
            {user.stores.map((s) => (
              <li key={s.store_id} className="c-admin-company-users__item">
                <Link
                  to={adminCompanyPath(s.store_id)}
                  state={{ backgroundLocation: location.state?.backgroundLocation || location }}
                  className="c-admin-company-users__link"
                >
                  <span className="c-admin-company-users__name">{s.store_name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default AdminUserView
