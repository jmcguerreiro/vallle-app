import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Component: ScrollToTop
 * Resets window scroll to the top on pathname change.
 * Skips the reset when a modal is opening over a background location, so the
 * underlying page keeps its scroll position while the modal is on top.
 * @component
 * @returns {null}
 */
const ScrollToTop = () => {
  // Hooks
  const location = useLocation();

  // Effects
  useEffect(() => {
    if (location.state?.backgroundLocation) return;
    window.scrollTo(0, 0);
  }, [location.pathname, location.state?.backgroundLocation]);

  // Render
  return null;
};

export default ScrollToTop;
