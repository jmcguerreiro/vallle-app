import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet } from 'react-router-dom'

import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/hooks/useAuth'
import { useMain } from '@/hooks/useMain'

/**
 * Component: Settings
 * Settings shell with route-driven tabs (Company, Users).
 * Sets the page header once and renders the active tab via Outlet.
 * Users tab is admin-only.
 * @component
 * @returns {JSX.Element}
 */
const Settings = () => {
  // Hooks
  const { t } = useTranslation()
  const { isAdmin } = useAuth()
  const { setHeader } = useMain()

  // Effects
  useEffect(() => {
    setHeader({
      title: t('features.settings.heading'),
      description: t('features.settings.description'),
      image: 'settings',
    })
    return () => setHeader()
  }, [setHeader, t])

  // Render
  return (
    <div className="c-settings">
      <nav className="c-settings__tabs" role="tablist">
        <NavLink
          className={({ isActive }) =>
            `c-settings__tab${isActive ? ' c-settings__tab--active' : ''}`
          }
          end
          role="tab"
          to={ROUTES.SETTINGS_COMPANY}
        >
          {t('features.settings.tabs.company')}
        </NavLink>
        {isAdmin && (
          <NavLink
            className={({ isActive }) =>
              `c-settings__tab${isActive ? ' c-settings__tab--active' : ''}`
            }
            end
            role="tab"
            to={ROUTES.SETTINGS_USERS}
          >
            {t('features.settings.tabs.users')}
          </NavLink>
        )}
      </nav>
      <div className="c-settings__content" role="tabpanel">
        <Outlet />
      </div>
    </div>
  )
}

export default Settings
