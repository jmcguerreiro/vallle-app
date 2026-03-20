import { createContext, useCallback, useMemo, useState } from 'react'

export const MainContext = createContext(null)

/**
 * Provides layout state for the main content area.
 * Pages use the useMain hook to set the header title and actions,
 * which the DefaultLayout reads and renders in the layout header bar.
 *
 * Actions shape: Array<{ label: string, icon: Component, onClick: Function, variant?: 'primary' | 'secondary' }>
 * @component
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @returns {JSX.Element}
 */
export const MainProvider = ({ children }) => {
  // State
  const [header, setHeaderState] = useState({ title: '', actions: [] })

  // Handlers
  const setHeader = useCallback(({ title = '', actions = [] } = {}) => {
    setHeaderState((prev) => {
      if (prev.title === title && prev.actions === actions) return prev
      return { title, actions }
    })
  }, [])

  // Derived State
  const value = useMemo(() => ({
    header,
    setHeader,
  }), [header, setHeader])

  // Render
  return (
    <MainContext.Provider value={value}>
      {children}
    </MainContext.Provider>
  )
}
