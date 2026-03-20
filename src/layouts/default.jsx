import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'

import { ArrowLeftRight as IconSwitch } from 'lucide-react'

import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/hooks/useAuth'
import { useMain } from '@/hooks/useMain'

/**
 * Layout: Default
 * App shell with sidebar navigation and main content area.
 * Used by all authenticated routes. Renders child routes via <Outlet />.
 * @component
 * @returns {JSX.Element}
 */
const DefaultLayout = () => {
  // Hooks
  const { t } = useTranslation()
  const { user, logout, isSuperAdmin, activeStore, selectStore } = useAuth()
  const navigate = useNavigate()
  const { header } = useMain()

  // State
  const [switcherOpen, setSwitcherOpen] = useState(false)

  // Refs
  const dialogRef = useRef(null)

  // Derived State
  const hasMultipleStores = (user?.stores?.length ?? 0) > 1

  // Handlers
  const handleLogout = useCallback(async () => {
    await logout()
    navigate(ROUTES.LOGIN)
  }, [logout, navigate])

  const handleOpenSwitcher = useCallback(() => {
    setSwitcherOpen(true)
    // Show modal after state update triggers render
    setTimeout(() => dialogRef.current?.showModal(), 0)
  }, [])

  const handleCloseSwitcher = useCallback(() => {
    dialogRef.current?.close()
    setSwitcherOpen(false)
  }, [])

  const handleSelectStore = useCallback((store) => {
    selectStore(store)
    handleCloseSwitcher()
  }, [selectStore, handleCloseSwitcher])

  const handleBackdropClick = useCallback((event) => {
    if (event.target === dialogRef.current) {
      handleCloseSwitcher()
    }
  }, [handleCloseSwitcher])

  // Render
  return (
    <>
      <aside className="c-layout__sidebar">
        <div className="c-layout__brand">
          <h1 className="c-layout__logo">{t('common.appName')}</h1>
        </div>

        {activeStore && (
          <div className="c-layout__store">
            <span className="c-layout__store-name">
              {activeStore.store_name}
            </span>
            {hasMultipleStores && (
              <button
                aria-label={t('nav.switchStore')}
                className="c-layout__store-switch"
                onClick={handleOpenSwitcher}
                type="button"
              >
                <IconSwitch size={16} />
              </button>
            )}
          </div>
        )}

        <nav className="c-layout__nav">
          <NavLink className="c-layout__nav-link" to={ROUTES.HOME}>
            {t('nav.dashboard')}
          </NavLink>
          <NavLink className="c-layout__nav-link" to={ROUTES.VOUCHERS}>
            {t('nav.vouchers')}
          </NavLink>
          <NavLink className="c-layout__nav-link" to={ROUTES.STATS}>
            {t('nav.stats')}
          </NavLink>
          <NavLink className="c-layout__nav-link" to={ROUTES.PROFILE}>
            {t('nav.profile')}
          </NavLink>
          <NavLink className="c-layout__nav-link" to={ROUTES.COMPANY}>
            {t('nav.company')}
          </NavLink>
          {isSuperAdmin && (
            <NavLink className="c-layout__nav-link" to={ROUTES.COMMISSIONS}>
              {t('nav.commissions')}
            </NavLink>
          )}
        </nav>

        <div className="c-layout__user">
          <span className="c-layout__user-name">{user?.name}</span>
          <button
            className="c-layout__logout"
            onClick={handleLogout}
            type="button"
          >
            {t('nav.logout')}
          </button>
        </div>
      </aside>

      {switcherOpen && (
        <dialog
          ref={dialogRef}
          className="c-modal c-store-switcher"
          onClick={handleBackdropClick}
          onClose={handleCloseSwitcher}
        >
          <div className="c-modal__content">
            <div className="c-modal__header">
              <h2 className="c-modal__title">
                {t('nav.switchStoreModal.heading')}
              </h2>
              <button
                aria-label="Close"
                className="c-modal__close"
                onClick={handleCloseSwitcher}
                type="button"
              >
                &times;
              </button>
            </div>
            <div className="c-modal__body">
              <ul className="c-store-switcher__list">
                {user?.stores?.map((store) => {
                  const isCurrent = store.store_id === activeStore?.store_id
                  return (
                    <li key={store.store_id}>
                      <button
                        className={`c-store-switcher__option${isCurrent ? ' c-store-switcher__option--current' : ''}`}
                        disabled={isCurrent}
                        onClick={() => handleSelectStore(store)}
                        type="button"
                      >
                        <span className="c-store-switcher__option-name">
                          {store.store_name}
                        </span>
                        {isCurrent && (
                          <span className="c-store-switcher__option-badge">
                            {t('nav.switchStoreModal.current')}
                          </span>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </dialog>
      )}

      <main className="c-layout__main">
        {(header.title || header.actions.length > 0) && (
          <div className="c-layout__main-header">
            {header.title && <h1 className="c-layout__main-header-title">{header.title}</h1>}
            {header.actions.length > 0 && (
              <div className="c-layout__main-header-actions">
                {header.actions.map(({ label, icon: Icon, onClick, variant = 'secondary' }) => (
                  <button
                    className={`c-btn c-btn--${variant}`}
                    key={label}
                    onClick={onClick}
                    type="button"
                  >
                    {Icon && <Icon className="c-btn__icon" size={16} />}
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="c-layout__main-content">
          <Outlet />
        </div>
      </main>
    </>
  )
}

export default DefaultLayout
