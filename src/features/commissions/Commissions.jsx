import { useTranslation } from 'react-i18next'

/**
 * Component: Commissions
 * Displays commission tracking for the super admin.
 * @component
 * @returns {JSX.Element}
 */
const Commissions = () => {
  // Hooks
  const { t } = useTranslation()

  // Render
  return (
    <div className="c-commissions">
      <h2 className="c-commissions__heading">{t('features.commissions.heading')}</h2>
      <p>Commissions view coming soon.</p>
    </div>
  )
}

export default Commissions
