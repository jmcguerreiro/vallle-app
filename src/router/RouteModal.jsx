import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import Drawer from "@/components/Drawer";
import Modal from "@/components/Modal";
import { ROUTES } from "@/constants/routes";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useModal } from "@/hooks/useModal";

const CLOSE_ANIMATION_MS = 350;

/**
 * Component: RouteModal
 * URL-driven wrapper around the presentational Modal/Drawer. Renders a centered
 * <Modal> at 1024px+ and a drag-to-dismiss <Drawer> below — same prop interface,
 * so it just picks one. Opens on mount, reads its title/description/actions from
 * ModalContext via useModal, and navigates back on close.
 * @component
 * @param {Object} props
 * @param {React.ReactNode} props.children - Modal content
 * @returns {JSX.Element}
 */
const RouteModal = ({ children }) => {
  // Hooks
  const navigate = useNavigate();
  const location = useLocation();
  const { header } = useModal();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  // State
  const [isOpen, setIsOpen] = useState(true);

  // Derived State
  // Opened via in-app navigation (background page behind us) vs. opened
  // directly (no history to return to — fall back to the dashboard).
  const hasBackground = Boolean(location.state?.backgroundLocation);

  // Handlers
  const goBack = useCallback(() => {
    if (hasBackground) {
      navigate(-1);
    } else {
      navigate(ROUTES.HOME, { replace: true });
    }
  }, [hasBackground, navigate]);

  const handleClose = useCallback(() => {
    // Close first and let the modal/drawer animate out; the effect below
    // navigates back once the exit animation has finished.
    setIsOpen(false);
  }, []);

  // Effects
  useEffect(() => {
    if (isOpen) return;
    const timer = setTimeout(goBack, CLOSE_ANIMATION_MS);
    return () => clearTimeout(timer);
  }, [isOpen, goBack]);

  // Render
  return isDesktop ? (
    <Modal
      actions={header.actions}
      description={header.description}
      onClose={handleClose}
      open={isOpen}
      title={header.title}
    >
      {children}
    </Modal>
  ) : (
    <Drawer
      actions={header.actions}
      description={header.description}
      onClose={handleClose}
      open={isOpen}
      title={header.title}
    >
      {children}
    </Drawer>
  );
};

export default RouteModal;
