import { createContext, useCallback, useMemo, useRef, useState } from "react";

export const ConfirmContext = createContext(null);

/**
 * Provides a promise-based confirmation prompt to the app.
 * Calling `confirm(options)` opens the layout-level Confirm dialog and resolves
 * to `true` (confirmed) or `false` (cancelled/dismissed). The active request is
 * read by the Confirm component, which renders the prompt.
 * @component
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @returns {JSX.Element}
 */
export const ConfirmProvider = ({ children }) => {
  // State
  const [request, setRequest] = useState(null);

  // Refs
  // Holds the pending promise's resolve fn so the Confirm component can settle
  // it when the user picks an option.
  const resolverRef = useRef(null);

  // Handlers
  const confirm = useCallback((options = {}) => {
    // Settle any in-flight request as cancelled before replacing it.
    resolverRef.current?.(false);
    setRequest(options);
    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const resolve = useCallback((result) => {
    setRequest(null);
    resolverRef.current?.(result);
    resolverRef.current = null;
  }, []);

  // Derived State
  const value = useMemo(
    () => ({ request, confirm, resolve }),
    [request, confirm, resolve],
  );

  // Render
  return (
    <ConfirmContext.Provider value={value}>{children}</ConfirmContext.Provider>
  );
};
