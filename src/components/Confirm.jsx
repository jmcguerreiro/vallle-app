import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import Button from "@/components/Button";
import ButtonGroup from "@/components/ButtonGroup";
import { EVENTS } from "@/constants/events";
import { useConfirm } from "@/hooks/useConfirm";

/**
 * Component: Confirm
 * Layout-level confirmation dialog — the branded replacement for the native
 * window.confirm. Rendered once at the app root; the active prompt is driven by
 * ConfirmContext (open it from anywhere with `useConfirm().confirm(options)`).
 * Built on the native <dialog> element and styled to match the standalone Modal.
 *
 * Request options: `{ title, message, confirmLabel, cancelLabel, tone }`.
 * `tone` is "default" (primary confirm button) or "danger" (destructive).
 * @component
 * @returns {JSX.Element}
 */
const Confirm = () => {
  // Hooks
  const { t } = useTranslation();
  const { request, resolve } = useConfirm();

  // Refs
  const dialogRef = useRef(null);

  // Handlers
  const handleCancel = useCallback(() => resolve(false), [resolve]);
  const handleConfirm = useCallback(() => resolve(true), [resolve]);

  const handleBackdropClick = useCallback(
    (event) => {
      if (event.target === dialogRef.current) resolve(false);
    },
    [resolve],
  );

  // Effects
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (request && !dialog.open) {
      dialog.showModal();
      // The dialog just entered the top layer above any open popovers
      // (toasts, confetti) — tell them so they can re-promote themselves.
      globalThis.dispatchEvent(new Event(EVENTS.MODAL_OPENED));
    } else if (!request && dialog.open) {
      dialog.close();
    }
  }, [request]);

  // Render
  return (
    <dialog
      ref={dialogRef}
      className="c-confirm"
      onClick={handleBackdropClick}
      onClose={handleCancel}
    >
      {request && (
        <div className="c-confirm__wrapper">
          <div className="c-confirm__header">
            {request.title && (
              <h2 className="c-confirm__title">{request.title}</h2>
            )}
            {request.message && (
              <p className="c-confirm__message">{request.message}</p>
            )}
          </div>
          <div className="c-confirm__footer">
            <ButtonGroup direction="column">
              <Button
                onClick={handleConfirm}
                skin={request.tone === "danger" ? "danger" : "primary"}
              >
                {request.confirmLabel || t("common.confirm")}
              </Button>
              <Button onClick={handleCancel} skin="ghost">
                {request.cancelLabel || t("common.cancel")}
              </Button>
            </ButtonGroup>
          </div>
        </div>
      )}
    </dialog>
  );
};

export default Confirm;
