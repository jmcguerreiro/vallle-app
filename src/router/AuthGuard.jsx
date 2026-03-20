import { Navigate } from 'react-router-dom'

import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/hooks/useAuth'

/**
 * Component: AuthGuard
 * Redirects to /login if user is not authenticated.
 * Redirects to /select-store if user has multiple stores and none is selected.
 * Shows a loading state while auth is being checked.
 * @component
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @returns {JSX.Element}
 */
const AuthGuard = ({ children }) => {
  // Hooks
  const { isAuthenticated, needsStoreSelection, loading } = useAuth()

  // Render
  if (loading) {
    return <div className="c-loading">Loading...</div>
  }

  if (!isAuthenticated) {
    return <Navigate replace to={ROUTES.LOGIN} />
  }

  if (needsStoreSelection) {
    return <Navigate replace to={ROUTES.SELECT_STORE} />
  }

  return children
}

export default AuthGuard
