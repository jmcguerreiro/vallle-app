import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate } from 'react-router-dom'

import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/hooks/useAuth'

/**
 * Component: SelectStore
 * Intermediate page shown after login when a user has multiple stores.
 * Lets the user pick which store to work with.
 * @component
 * @returns {JSX.Element}
 */
const SelectStore = () => {
  // Hooks
  const { t } = useTranslation()
  const { user, isAuthenticated, loading, selectStore } = useAuth()
  const navigate = useNavigate()

  // Handlers
  const handleSelect = useCallback((store) => {
    selectStore(store)
    navigate(ROUTES.HOME)
  }, [selectStore, navigate])

  // Render
  if (loading) {
    return <div className="c-loading">{t('common.loading')}</div>
  }

  if (!isAuthenticated) {
    return <Navigate replace to={ROUTES.LOGIN} />
  }

  return (
    <div className="c-select-store">
      <div className="c-select-store__card">
        <h1 className="c-select-store__heading">
          {t('features.selectStore.heading')}
        </h1>
        <p className="c-select-store__description">
          {t('features.selectStore.description')}
        </p>
        <ul className="c-select-store__list">
          {user?.stores?.map((store) => (
            <li key={store.store_id}>
              <button
                className="c-select-store__option"
                onClick={() => handleSelect(store)}
                type="button"
              >
                <span className="c-select-store__option-name">
                  {store.store_name}
                </span>
                <span className="c-select-store__option-role">
                  {store.role}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default SelectStore
