import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { USER_ROLES } from '@/constants/user-roles'
import { get, post, setApiStoreId } from '@/services/api'

export const AuthContext = createContext(null)

const STORE_KEY = 'vallle_active_store'

/**
 * Reads the persisted active store ID from localStorage for a given user.
 * @param {string} userId
 * @returns {string|null}
 */
function getSavedStoreId(userId) {
  if (!userId) return null
  try {
    const saved = localStorage.getItem(STORE_KEY)
    if (!saved) return null
    const parsed = JSON.parse(saved)
    return parsed.userId === userId ? parsed.storeId : null
  } catch {
    return null
  }
}

/**
 * Persists the active store ID to localStorage, scoped to a user.
 * @param {string} userId
 * @param {string} storeId
 */
function saveStoreId(userId, storeId) {
  localStorage.setItem(STORE_KEY, JSON.stringify({ userId, storeId }))
}

/**
 * Provides authentication state to the app.
 * On mount, checks for an existing session via /api/auth/me.
 * Exposes login, logout, current user, and active store via AuthContext.
 * @component
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @returns {JSX.Element}
 */
export const AuthProvider = ({ children }) => {
  // State
  const [user, setUser] = useState(null)
  const [activeStore, setActiveStoreState] = useState(null)
  const [loading, setLoading] = useState(true)

  // Refs
  const userIdRef = useRef(null)

  // Handlers
  const login = useCallback(async (email, password) => {
    const { data } = await post('/api/auth/login', { email, password })
    setUser(data.user)
    userIdRef.current = data.user.id

    // Auto-select store if user has exactly one.
    // For multi-store users, always show the picker after login.
    if (data.user.stores?.length === 1) {
      const store = data.user.stores[0]
      setActiveStoreState(store)
      setApiStoreId(store.store_id)
      saveStoreId(data.user.id, store.store_id)
    } else {
      setActiveStoreState(null)
      setApiStoreId(null)
    }

    return data.user
  }, [])

  const logout = useCallback(async () => {
    await post('/api/auth/logout')
    setUser(null)
    setActiveStoreState(null)
    setApiStoreId(null)
    userIdRef.current = null
  }, [])

  const selectStore = useCallback((store) => {
    setActiveStoreState(store)
    setApiStoreId(store?.store_id || null)
    if (userIdRef.current && store?.store_id) {
      saveStoreId(userIdRef.current, store.store_id)
    }
  }, [])

  // Effects
  useEffect(() => {
    get('/api/auth/me')
      .then(({ data }) => {
        setUser(data.user)
        userIdRef.current = data.user.id

        if (data.user.stores?.length === 1) {
          const store = data.user.stores[0]
          setActiveStoreState(store)
          setApiStoreId(store.store_id)
          saveStoreId(data.user.id, store.store_id)
        } else {
          const savedId = getSavedStoreId(data.user.id)
          const match = data.user.stores?.find((s) => s.store_id === savedId)
          if (match) {
            setActiveStoreState(match)
            setApiStoreId(match.store_id)
          }
        }
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  // Derived State
  const needsStoreSelection = !!user && (user.stores?.length ?? 0) > 1 && !activeStore

  const value = useMemo(() => ({
    user,
    setUser,
    loading,
    login,
    logout,
    activeStore,
    selectStore,
    needsStoreSelection,
    isAuthenticated: !!user,
    isSuperAdmin: user?.role === USER_ROLES.SUPER_ADMIN,
  }), [user, loading, login, logout, activeStore, selectStore, needsStoreSelection])

  // Render
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
