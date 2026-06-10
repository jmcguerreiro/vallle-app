import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import Drawer from "@/components/Drawer";
import Modal from "@/components/Modal";
import { ROUTES } from "@/constants/routes";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useModal } from "@/hooks/useModal";

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

  // Refs
  // Dismissal can be reported more than once (close button click plus the
  // dialog's native close event, rapid double-clicks); only the first may
  // navigate, otherwise we'd go back through history twice.
  const hasNavigatedRef = useRef(false);
  // Vaul's onAnimationEnd timer outlives the component — when a new modal is
  // opened while this one is animating out, the stale callback must not
  // navigate on behalf of an unmounted instance.
  const isUnmountedRef = useRef(false);

  // Derived State
  // Opened via in-app navigation (background page behind us) vs. opened
  // directly (no history to return to — fall back to the dashboard).
  // A modal opened while another was closing chains background locations
  // (its background is the previous modal's URL); the chain depth is how many
  // history entries to pop to land back on the original page.
  const backDelta = useMemo(() => {
    let depth = 0;
    let state = location.state;
    while (state?.backgroundLocation) {
      depth += 1;
      state = state.backgroundLocation.state;
    }
    return depth;
  }, [location.state]);

  // Handlers
  const goBack = useCallback(() => {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;
    if (backDelta > 0) {
      navigate(-backDelta);
    } else {
      navigate(ROUTES.HOME, { replace: true });
    }
  }, [backDelta, navigate]);

  const handleClose = useCallback(() => {
    if (isDesktop) {
      // The native <dialog> has no exit animation — navigate right away;
      // unmounting drops it from the top layer.
      goBack();
    } else {
      // Let Vaul play its exit animation; handleAnimationEnd navigates once
      // it finishes and Vaul has restored the body's scroll lock.
      // Unmounting mid-animation would leave the page unclickable.
      setIsOpen(false);
    }
  }, [isDesktop, goBack]);

  const handleAnimationEnd = useCallback(
    (open) => {
      if (!open && !isUnmountedRef.current) goBack();
    },
    [goBack],
  );

  // Effects
  useEffect(() => {
    isUnmountedRef.current = false;
    return () => {
      isUnmountedRef.current = true;
    };
  }, []);

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
      onAnimationEnd={handleAnimationEnd}
      onClose={handleClose}
      open={isOpen}
      title={header.title}
    >
      {children}
    </Drawer>
  );
};

export default RouteModal;
