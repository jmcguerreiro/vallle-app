import { useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { X as IconX } from "lucide-react";

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
 * @param {'default'|'wide'} [props.size='default'] - Modal width variant
 * @returns {JSX.Element}
 */
const Modal = ({ children, className = "", size = "default" }) => {
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
      className={`s-modal${size === "wide" ? " s-modal--wide" : ""}${className ? ` ${className}` : ""}`}
      onClick={handleBackdropClick}
      onClose={handleClose}
    >
      <button
        aria-label="Close"
        className="s-modal__close"
        onClick={handleClose}
        type="button"
      >
        <IconX className="s-modal__close-icon" size={18} />
      </button>
      <div className="s-modal__wrapper">
        <div className="s-modal__header">
          {header.title && (
            <h2 className="s-modal__header-title">{header.title}</h2>
          )}
          {header.actions.length > 0 && (
            <div className="s-modal__header-actions">
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
        </div>
        <div className="s-modal__body">{children}</div>
      </div>
    </dialog>
  );
};

export default Modal;
