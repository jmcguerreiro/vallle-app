import { useTranslation } from 'react-i18next'

/**
 * Component: Stats
 * Statistics page showing performance metrics for the current store.
 * @component
 * @returns {JSX.Element}
 */
const Stats = () => {
  // Hooks
  const { t } = useTranslation()

  // Render
  return (
    <div className="c-stats">
      <p>{t('features.stats.comingSoon')}</p>
    </div>
  )
}

export default Stats
