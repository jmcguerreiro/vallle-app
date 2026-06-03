import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Drawer from "@/components/Drawer";
import Modal from "@/components/Modal";
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
  const { header } = useModal();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  // State
  const [isOpen, setIsOpen] = useState(true);

  // Handlers
  const handleClose = useCallback(() => {
    // Desktop dialogs have no exit animation, so navigate straight back. On
    // mobile, close the drawer first and let it animate out before navigating.
    if (isDesktop) {
      navigate(-1);
    } else {
      setIsOpen(false);
    }
  }, [isDesktop, navigate]);

  // Effects
  useEffect(() => {
    if (isOpen) return;
    const timer = setTimeout(() => navigate(-1), CLOSE_ANIMATION_MS);
    return () => clearTimeout(timer);
  }, [isOpen, navigate]);

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
