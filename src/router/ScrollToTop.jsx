import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * Component: ScrollToTop
 * Resets window scroll to the top when the user navigates to a different page.
 * Modal routes render on top of a background page, so the relevant pathname is
 * the background's when one is present — opening or closing a modal never
 * changes it and therefore never moves the page underneath. POP navigations
 * (browser back/forward, modal close) are also skipped so the browser's own
 * scroll restoration can do its job.
 * @component
 * @returns {null}
 */
const ScrollToTop = () => {
  // Hooks
  const location = useLocation();
  const navigationType = useNavigationType();

  // Refs
  const previousPagePathname = useRef(null);

  // Derived State
  // The page actually on screen: the background's pathname when a modal is
  // open, the location's own pathname otherwise.
  const pagePathname =
    location.state?.backgroundLocation?.pathname ?? location.pathname;

  // Effects
  useEffect(() => {
    if (pagePathname === previousPagePathname.current) return;
    previousPagePathname.current = pagePathname;
    if (navigationType === "POP") return;
    window.scrollTo(0, 0);
  }, [pagePathname, navigationType]);

  // Render
  return null;
};

export default ScrollToTop;
