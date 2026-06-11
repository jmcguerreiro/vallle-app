import { useCallback, useEffect, useRef } from "react";

import Button from "@/components/Button";
import ButtonGroup from "@/components/ButtonGroup";
import { EVENTS } from "@/constants/events";
import { IconX } from "@/utils/icons";

/**
 * Component: Modal
 * A standalone, state-driven modal built on the native <dialog> element.
 * Identical on mobile and desktop. Controlled via the `open` prop and
 * dismissed through `onClose` (close button, backdrop click, or Escape).
 * Renders a header (title/description), a scrollable body, and an optional
 * actions footer.
 * @component
 * @param {Object} props
 * @param {boolean} props.open - Whether the modal is open
 * @param {Function} props.onClose - Called when the user dismisses the modal
 * @param {React.ReactNode} props.children - Modal body content
 * @param {string} [props.title] - Header title
 * @param {string} [props.description] - Header description
 * @param {Array<{label: string, icon?: React.ComponentType, onClick: Function, skin?: string, isProcessing?: boolean}>} [props.actions=[]] - Footer action buttons. Skin defaults to 'sand' (secondary); pass 'primary' for the main CTA.
 * @returns {JSX.Element}
 */
const Modal = ({
  open,
  onClose,
  children,
  title,
  description,
  actions = [],
}) => {
  // Refs
  const dialogRef = useRef(null);

  // Handlers
  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  const handleBackdropClick = useCallback(
    (event) => {
      if (event.target === dialogRef.current) onClose?.();
    },
    [onClose],
  );

  // Effects
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // The dialog just entered the top layer above any open popovers
      // (toasts, confetti) — tell them so they can re-promote themselves.
      globalThis.dispatchEvent(new Event(EVENTS.MODAL_OPENED));
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Render
  return (
    <dialog
      ref={dialogRef}
      className="c-modal"
      onClick={handleBackdropClick}
      onClose={handleClose}
    >
      <div className="c-modal__wrapper">
        <button
          aria-label="Close"
          className="c-modal__close"
          onClick={handleClose}
          type="button"
        >
          <IconX className="c-modal__close-icon" size={20} strokeWidth={1.5} />
        </button>
        {(title || description) && (
          <div className="c-modal__header">
            {title && <h2 className="c-modal__header-title">{title}</h2>}
            {description && (
              <p className="c-modal__header-description">{description}</p>
            )}
          </div>
        )}
        <div className="c-modal__body">{children}</div>
        {actions.length > 0 && (
          <div className="c-modal__footer">
            <ButtonGroup direction="column">
              {actions.map(
                ({ label, icon, onClick, skin = "sand", isProcessing }) => (
                  <Button
                    key={label}
                    icon={icon}
                    isProcessing={isProcessing}
                    onClick={onClick}
                    skin={skin}
                  >
                    {label}
                  </Button>
                ),
              )}
            </ButtonGroup>
          </div>
        )}
      </div>
    </dialog>
  );
};

export default Modal;
