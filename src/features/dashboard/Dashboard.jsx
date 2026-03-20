import { useTranslation } from 'react-i18next'

import { useAuth } from '@/hooks/useAuth'

/**
 * Component: Dashboard
 * Main overview page showing key stats for the current store.
 * @component
 * @returns {JSX.Element}
 */
const Dashboard = () => {
  // Hooks
  const { t } = useTranslation()
  const { user } = useAuth()

  // Render
  return (
    <div className="c-dashboard">
      <h2 className="c-dashboard__heading">
        {t('features.dashboard.welcome', { name: user?.name })}
      </h2>
      <p>Dashboard content coming soon.</p>
    </div>
  )
}

export default Dashboard
