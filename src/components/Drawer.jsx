import { useCallback } from "react";

import { Drawer as VaulDrawer } from "vaul";

import Button from "@/components/Button";

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
 * @param {Array<{label: string, icon?: React.ComponentType, onClick: Function, variant?: string}>} [props.actions=[]] - Footer action buttons
 * @returns {JSX.Element}
 */
const Drawer = ({
  open,
  onClose,
  children,
  title,
  description,
  actions = [],
}) => {
  // Handlers
  const handleOpenChange = useCallback(
    (next) => {
      if (!next) onClose?.();
    },
    [onClose],
  );

  // Render
  return (
    <VaulDrawer.Root
      onOpenChange={handleOpenChange}
      open={open}
      repositionInputs={false}
    >
      <VaulDrawer.Portal>
        <VaulDrawer.Overlay className="c-drawer__overlay" />
        <VaulDrawer.Content
          aria-describedby={undefined}
          aria-label={title || "Dialog"}
          className="c-drawer"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <VaulDrawer.Handle className="c-drawer__handle" />
          {(title || description) && (
            <div className="c-drawer__header">
              {title && (
                <VaulDrawer.Title className="c-drawer__header-title">
                  {title}
                </VaulDrawer.Title>
              )}
              {description && (
                <VaulDrawer.Description className="c-drawer__header-description">
                  {description}
                </VaulDrawer.Description>
              )}
            </div>
          )}
          <div className="c-drawer__body">{children}</div>
          {actions.length > 0 && (
            <div className="c-drawer__footer">
              {actions.map(({ label, icon, onClick, variant = "ghost" }) => (
                <Button
                  key={label}
                  display="block"
                  icon={icon}
                  onClick={onClick}
                  variant={variant}
                >
                  {label}
                </Button>
              ))}
            </div>
          )}
        </VaulDrawer.Content>
      </VaulDrawer.Portal>
    </VaulDrawer.Root>
  );
};

export default Drawer;
