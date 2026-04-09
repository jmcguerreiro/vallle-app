import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router-dom'

import { useAuth } from '@/hooks/useAuth'
import { useMain } from '@/hooks/useMain'

/**
 * Layout: Main
 * Main content area with optional suspended banner, page-level header, and route outlet.
 * @component
 * @returns {JSX.Element}
 */
const Main = () => {
  // Hooks
  const { t } = useTranslation()
  const { isStoreSuspended } = useAuth()
  const { header } = useMain()

  // Render
  return (
    <main className="s-main">
      {isStoreSuspended && (
        <div className="s-main__banner" role="alert">
          {t('features.storeSuspended.banner')}
        </div>
      )}

      {(header.title || header.actions.length > 0) && (
        <div className="s-main__header">
          {header.title && (
            <div className="s-main__header-titles">
              <h1 className="s-main__header-title">{header.title}</h1>
              {header.subtitle && (
                <p className="s-main__header-subtitle">{header.subtitle}</p>
              )}
            </div>
          )}
          {header.actions.length > 0 && (
            <div className="s-main__header-actions">
              {header.actions.map(
                ({ label, icon: Icon, onClick, variant = 'secondary' }) => (
                  <button
                    key={label}
                    className={`c-btn c-btn--${variant}`}
                    onClick={onClick}
                    type="button"
                  >
                    {Icon && <Icon className="c-btn__icon" size={16} />}
                    {label}
                  </button>
                ),
              )}
            </div>
          )}
        </div>
      )}

      <div className="s-main__content">
        <Outlet />
      </div>
    </main>
  )
}

export default Main
