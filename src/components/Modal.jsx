import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { X as IconX } from 'lucide-react'
import { Drawer } from 'vaul'

import Button from '@/components/Button'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useModal } from '@/hooks/useModal'

const CLOSE_ANIMATION_MS = 350

/**
 * Component: Modal
 * URL-driven modal. Renders as a centered native <dialog> at 1024px+ and as a
 * drag-to-dismiss bottom drawer (Vaul) below. Opens on mount and navigates
 * back on close. Reads title and actions from ModalContext via useModal.
 * @component
 * @param {Object} props
 * @param {React.ReactNode} props.children - Modal content
 * @param {string} [props.className] - Additional CSS class
 * @param {'default'|'wide'} [props.size='default'] - Modal width variant (desktop only)
 * @returns {JSX.Element}
 */
const Modal = ({ children, className = '', size = 'default' }) => {
  // Hooks
  const navigate = useNavigate()
  const { header } = useModal()
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  // State
  const [isOpen, setIsOpen] = useState(true)

  // Refs
  const dialogRef = useRef(null)

  // Handlers
  const handleClose = useCallback(() => {
    navigate(-1)
  }, [navigate])

  const handleBackdropClick = useCallback(
    (event) => {
      if (event.target === dialogRef.current) handleClose()
    },
    [handleClose],
  )

  const handleOpenChange = useCallback((open) => {
    if (!open) setIsOpen(false)
  }, [])

  // Effects
  useEffect(() => {
    if (!isDesktop) return
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [isDesktop])

  useEffect(() => {
    if (isOpen) return
    const timer = setTimeout(() => navigate(-1), CLOSE_ANIMATION_MS)
    return () => clearTimeout(timer)
  }, [isOpen, navigate])

  // Render
  if (!isDesktop) {
    return (
      <Drawer.Root
        onOpenChange={handleOpenChange}
        open={isOpen}
        repositionInputs={false}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="s-drawer__overlay" />
          <Drawer.Content
            aria-describedby={undefined}
            className={`s-drawer${className ? ` ${className}` : ''}`}
            onOpenAutoFocus={(event) => event.preventDefault()}
          >
            <Drawer.Handle className="s-drawer__handle" />
            <div className="s-drawer__header">
              <div className="s-drawer__header-titles">
                <Drawer.Title
                  className={
                    header.title
                      ? 's-drawer__header-title'
                      : 's-drawer__header-title--hidden'
                  }
                >
                  {header.title || 'Dialog'}
                </Drawer.Title>
                {header.description && (
                  <Drawer.Description className="s-drawer__header-description">
                    {header.description}
                  </Drawer.Description>
                )}
              </div>
              {header.actions.length > 0 && (
                <div className="s-drawer__header-actions">
                  {header.actions.map(
                    ({ label, icon, onClick, variant = 'ghost' }) => (
                      <Button
                        key={label}
                        iconLeft={icon}
                        onClick={onClick}
                        variant={variant}
                      >
                        {label}
                      </Button>
                    ),
                  )}
                </div>
              )}
            </div>
            <div className="s-drawer__body">{children}</div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    )
  }

  return (
    <dialog
      ref={dialogRef}
      className={`s-modal${size === 'wide' ? ' s-modal--wide' : ''}${className ? ` ${className}` : ''}`}
      onClick={handleBackdropClick}
      onClose={handleClose}
    >
      <div className="s-modal__wrapper">
        <button
          aria-label="Close"
          className="s-modal__close"
          onClick={handleClose}
          type="button"
        >
          <IconX className="s-modal__close-icon" size={18} />
        </button>
        <div className="s-modal__header">
          {(header.title || header.description) && (
            <div className="s-modal__header-titles">
              {header.title && (
                <h2 className="s-modal__header-title">{header.title}</h2>
              )}
              {header.description && (
                <p className="s-modal__header-description">{header.description}</p>
              )}
            </div>
          )}
          {header.actions.length > 0 && (
            <div className="s-modal__header-actions">
              {header.actions.map(
                ({ label, icon, onClick, variant = 'ghost' }) => (
                  <Button
                    key={label}
                    iconLeft={icon}
                    onClick={onClick}
                    variant={variant}
                  >
                    {label}
                  </Button>
                ),
              )}
            </div>
          )}
        </div>
        <div className="s-modal__body">{children}</div>
      </div>
    </dialog>
  )
}

export default Modal
