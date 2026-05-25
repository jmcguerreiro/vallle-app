import { useCallback } from 'react'

import { useToast } from '@/hooks/useToast'
import { IconAlertCircle, IconCheck, IconInfo, IconX } from '@/utils/icons'

const ICON_MAP = {
  success: IconCheck,
  error: IconAlertCircle,
  info: IconInfo,
}

/**
 * Component: Toast
 * Renders all active toast notifications in a fixed container at the top-right of the viewport.
 * @component
 * @returns {JSX.Element}
 */
const Toast = () => {
  // Hooks
  const { toasts, removeToast } = useToast()

  // Handlers
  const handleClose = useCallback((id) => {
    removeToast(id)
  }, [removeToast])

  // Render
  if (toasts.length === 0) return null

  return (
    <div className="c-toast-container">
      {toasts.map((toast) => {
        const Icon = ICON_MAP[toast.type] || IconInfo

        return (
          <div
            key={toast.id}
            className={`c-toast c-toast--${toast.type}`}
          >
            <Icon className="c-toast__icon" size={18} />
            <span className="c-toast__message">{toast.message}</span>
            <button
              aria-label="Close"
              className="c-toast__close"
              onClick={() => handleClose(toast.id)}
            >
              <IconX size={16} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

export default Toast
