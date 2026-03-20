import { Navigate } from 'react-router-dom'

import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/hooks/useAuth'

/**
 * Component: RoleGuard
 * Checks the authenticated user's role against a list of allowed roles.
 * Redirects to the home page if the user's role is not permitted.
 * Must be used inside an already-authenticated route (after ProtectedRoute).
 * @component
 * @param {Object} props
 * @param {string[]} props.allowedRoles - Roles permitted to access the children
 * @param {React.ReactNode} props.children
 * @returns {JSX.Element}
 */
const RoleGuard = ({ allowedRoles, children }) => {
  // Hooks
  const { user } = useAuth()

  // Render
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate replace to={ROUTES.HOME} />
  }

  return children
}

export default RoleGuard
