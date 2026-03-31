import { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { useAuth } from '@/hooks/useAuth'
import { useMain } from '@/hooks/useMain'

import CompanyDetails from './CompanyDetails'
import CompanyUsers from './CompanyUsers'

const TAB_DETAILS = 'details'
const TAB_USERS = 'users'

/**
 * Component: Company
 * Company management page with side navigation tabs.
 * Shows "Details" for all roles. Shows "Users" tab only for admins.
 * @component
 * @returns {JSX.Element}
 */
const Company = () => {
  // Hooks
  const { t } = useTranslation()
  const { isAdmin } = useAuth()
  const { setHeader } = useMain()

  // State
  const [activeTab, setActiveTab] = useState(TAB_DETAILS)

  // Handlers
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab)
  }, [])

  // Effects
  useEffect(() => {
    setHeader({ title: t('features.company.heading') })
    return () => setHeader({ title: '' })
  }, [setHeader, t])

  // Render
  return (
    <div className="c-company">
      <nav className="c-company__tabs" role="tablist">
        <button
          aria-selected={activeTab === TAB_DETAILS}
          className={`c-company__tab${activeTab === TAB_DETAILS ? ' c-company__tab--active' : ''}`}
          onClick={() => handleTabChange(TAB_DETAILS)}
          role="tab"
          type="button"
        >
          {t('features.company.tabs.details')}
        </button>
        {isAdmin && (
          <button
            aria-selected={activeTab === TAB_USERS}
            className={`c-company__tab${activeTab === TAB_USERS ? ' c-company__tab--active' : ''}`}
            onClick={() => handleTabChange(TAB_USERS)}
            role="tab"
            type="button"
          >
            {t('features.company.tabs.users')}
          </button>
        )}
      </nav>
      <div className="c-company__content" role="tabpanel">
        {activeTab === TAB_DETAILS && <CompanyDetails />}
        {activeTab === TAB_USERS && isAdmin && <CompanyUsers />}
      </div>
    </div>
  )
}

export default Company
