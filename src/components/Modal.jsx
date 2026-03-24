import { useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import Button from "@/components/Button";
import { useModal } from "@/hooks/useModal";

/**
 * Component: Modal
 * URL-driven modal using the native HTML <dialog> element.
 * Opens automatically on mount and navigates back on close.
 * Reads title and actions from ModalContext via the useModal hook.
 * @component
 * @param {Object} props
 * @param {React.ReactNode} props.children - Modal content
 * @param {string} [props.className] - Additional CSS class
 * @returns {JSX.Element}
 */
const Modal = ({ children, className = "" }) => {
  // Hooks
  const navigate = useNavigate();
  const { header } = useModal();

  // Refs
  const dialogRef = useRef(null);

  // Handlers
  const handleClose = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleBackdropClick = useCallback(
    (event) => {
      if (event.target === dialogRef.current) {
        handleClose();
      }
    },
    [handleClose],
  );

  // Effects
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  // Render
  return (
    <dialog
      ref={dialogRef}
      className={`c-modal${className ? ` ${className}` : ""}`}
      onClick={handleBackdropClick}
      onClose={handleClose}
    >
      <div className="c-modal__content">
        <div className="c-modal__header">
          {header.title && <h2 className="c-modal__title">{header.title}</h2>}
          {header.actions.length > 0 && (
            <div className="c-modal__actions">
              {header.actions.map(
                ({ label, icon, onClick, variant = "ghost" }) => (
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
          <button
            aria-label="Close"
            className="c-modal__close"
            onClick={handleClose}
            type="button"
          >
            ×
          </button>
        </div>
        <div className="c-modal__body">{children}</div>
      </div>
    </dialog>
  );
};

export default Modal;
