import { useCallback } from "react";

import { Drawer as VaulDrawer } from "vaul";

import Button from "@/components/Button";
import ButtonGroup from "@/components/ButtonGroup";

/**
 * Component: Drawer
 * A standalone, state-driven bottom drawer (drag-to-dismiss, powered by Vaul).
 * Controlled via the `open` prop and dismissed through `onClose` (drag down,
 * backdrop, or Escape). Mirrors the Modal prop interface so the two are
 * interchangeable. Renders a header (title/description), a scrollable body,
 * and an optional actions footer.
 * @component
 * @param {Object} props
 * @param {boolean} props.open - Whether the drawer is open
 * @param {Function} props.onClose - Called when the user dismisses the drawer
 * @param {React.ReactNode} props.children - Drawer body content
 * @param {string} [props.title] - Header title
 * @param {string} [props.description] - Header description
 * @param {Array<{label: string, icon?: React.ComponentType, onClick: Function, skin?: string, isProcessing?: boolean}>} [props.actions=[]] - Footer action buttons. Skin defaults to 'sand' (secondary); pass 'primary' for the main CTA.
 * @param {Function} [props.onAnimationEnd] - Called by Vaul when the open/close animation finishes, with the resulting open state. Unmount only after this reports closed — earlier, and Vaul can't restore the body's pointer-events.
 * @returns {JSX.Element}
 */
const Drawer = ({
  open,
  onClose,
  children,
  title,
  description,
  actions = [],
  onAnimationEnd,
}) => {
  // Handlers
  const handleOpenChange = useCallback(
    (next) => {
      if (!next) onClose?.();
    },
    [onClose],
  );

  // A native <dialog> opened with showModal() (e.g. the Confirm prompt) sits in
  // the browser's top layer, outside the drawer's DOM — Vaul would treat any
  // interaction with it (clicks, Escape) as an outside interaction and dismiss
  // the drawer underneath. While such a dialog is open, veto the dismissal.
  const handleInteractOutside = useCallback((event) => {
    if (document.querySelector("dialog:modal")) event.preventDefault();
  }, []);

  const handleEscapeKeyDown = useCallback((event) => {
    const dialog = document.querySelector("dialog:modal");
    if (!dialog) return;
    // preventDefault stops the drawer's dismissal but also the dialog's own
    // Escape handling — close it ourselves so Escape still dismisses only the
    // topmost layer.
    event.preventDefault();
    dialog.close();
  }, []);

  // Render
  return (
    <VaulDrawer.Root
      onAnimationEnd={onAnimationEnd}
      onOpenChange={handleOpenChange}
      open={open}
    >
      <VaulDrawer.Portal>
        <VaulDrawer.Overlay className="c-drawer__overlay" />
        <VaulDrawer.Content
          aria-describedby={undefined}
          aria-label={title || "Dialog"}
          className="c-drawer"
          onEscapeKeyDown={handleEscapeKeyDown}
          onInteractOutside={handleInteractOutside}
        >
          <VaulDrawer.Handle className="c-drawer__handle" />
          {title || description ? (
            <div className="c-drawer__header">
              <VaulDrawer.Title
                className={title ? "c-drawer__header-title" : "u-sr-only"}
              >
                {title || "Dialog"}
              </VaulDrawer.Title>
              {description && (
                <VaulDrawer.Description className="c-drawer__header-description">
                  {description}
                </VaulDrawer.Description>
              )}
            </div>
          ) : (
            <VaulDrawer.Title className="u-sr-only">Dialog</VaulDrawer.Title>
          )}
          <div className="c-drawer__body">{children}</div>
          {actions.length > 0 && (
            <div className="c-drawer__footer">
              <ButtonGroup direction="column">
                {actions.map(
                  ({ label, icon, onClick, skin = "sand", isProcessing }) => (
                    <Button
                      key={label}
                      display="block"
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
        </VaulDrawer.Content>
      </VaulDrawer.Portal>
    </VaulDrawer.Root>
  );
};

export default Drawer;
