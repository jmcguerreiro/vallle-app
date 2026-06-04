import { useCallback, useEffect, useRef } from "react";

import { useToast } from "@/hooks/useToast";
import { IconAlertCircle, IconCheck, IconInfo, IconX } from "@/utils/icons";

const ICON_MAP = {
  success: IconCheck,
  error: IconAlertCircle,
  info: IconInfo,
};

/**
 * Component: Toast
 * Renders all active toast notifications in a fixed container at the top-right of
 * the viewport. The container is a manual popover so it lives in the browser's
 * top layer and paints above native <dialog> modals (z-index can't beat the top
 * layer). It re-promotes on every toast change so it stays above a modal that was
 * opened after the toast fired.
 * @component
 * @returns {JSX.Element}
 */
const Toast = () => {
  // Hooks
  const { toasts, removeToast } = useToast();

  // Refs
  const containerRef = useRef(null);

  // Handlers
  const handleClose = useCallback(
    (id) => {
      removeToast(id);
    },
    [removeToast],
  );

  // Effects
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (toasts.length > 0) {
      // Re-promote to the top of the top layer so we sit above any modal that
      // was opened after the toast fired (top-layer order, not z-index, wins).
      if (container.matches(":popover-open")) container.hidePopover();
      container.showPopover();
    } else if (container.matches(":popover-open")) {
      container.hidePopover();
    }
  }, [toasts]);

  // Render
  return (
    <div ref={containerRef} className="c-toast-container" popover="manual">
      {toasts.map((toast) => {
        const Icon = ICON_MAP[toast.type] || IconInfo;

        return (
          <div key={toast.id} className={`c-toast c-toast--${toast.type}`}>
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
        );
      })}
    </div>
  );
};

export default Toast;
