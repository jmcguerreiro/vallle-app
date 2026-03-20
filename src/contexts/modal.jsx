import { createContext, useCallback, useMemo, useState } from 'react'

export const ModalContext = createContext(null)

/**
 * Provides layout state for the modal content area.
 * Modal pages use the useModal hook to set the header title and actions,
 * which the Modal component reads and renders in its header bar.
 *
 * Actions shape: Array<{ label: string, icon: Component, onClick: Function, variant?: 'primary' | 'secondary' }>
 * @component
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @returns {JSX.Element}
 */
export const ModalProvider = ({ children }) => {
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
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  )
}
