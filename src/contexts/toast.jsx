import { createContext, useCallback, useMemo, useState } from 'react'

export const ToastContext = createContext(null)

const AUTO_DISMISS_MS = 4000

/**
 * Provides toast notification state to the app.
 * Manages an array of toasts with auto-dismiss and manual removal.
 * @component
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @returns {JSX.Element}
 */
export const ToastProvider = ({ children }) => {
  // State
  const [toasts, setToasts] = useState([])

  // Handlers
  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])

    setTimeout(() => {
      removeToast(id)
    }, AUTO_DISMISS_MS)
  }, [removeToast])

  // Derived State
  const value = useMemo(() => ({
    toasts,
    addToast,
    removeToast,
  }), [toasts, addToast, removeToast])

  // Render
  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  )
}
