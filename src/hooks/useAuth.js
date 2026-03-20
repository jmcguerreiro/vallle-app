import { useContext } from 'react'

import { AuthContext } from '@/contexts/auth'

/**
 * Hook: useAuth
 * Provides access to authentication state and actions.
 * Must be used within an AuthProvider.
 * @returns {{ user: Object|null, setUser: Function, loading: boolean, login: Function, logout: Function, activeStore: Object|null, selectStore: Function, needsStoreSelection: boolean, isAuthenticated: boolean, isSuperAdmin: boolean }}
 */
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
