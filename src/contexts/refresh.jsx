import { createContext, useCallback, useMemo, useState } from 'react'

export const RefreshContext = createContext(null)

/**
 * Provides a shared refresh key that list pages can subscribe to.
 * Modal forms call triggerRefresh() after a successful mutation so
 * the underlying list re-fetches its data.
 * @component
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @returns {JSX.Element}
 */
export const RefreshProvider = ({ children }) => {
  // State
  const [refreshKey, setRefreshKey] = useState(0)

  // Handlers
  const triggerRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1)
  }, [])

  // Derived State
  const value = useMemo(() => ({
    refreshKey,
    triggerRefresh,
  }), [refreshKey, triggerRefresh])

  // Render
  return (
    <RefreshContext.Provider value={value}>
      {children}
    </RefreshContext.Provider>
  )
}
