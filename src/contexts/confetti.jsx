import { createContext, useCallback, useMemo, useState } from "react";

export const ConfettiContext = createContext(null);

/**
 * Provides confetti state to the app.
 * Exposes `fire()` to trigger a one-off celebratory burst. A monotonic key is
 * used so repeated fires re-mount the canvas and replay the animation.
 * @component
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @returns {JSX.Element}
 */
export const ConfettiProvider = ({ children }) => {
  // State
  const [burst, setBurst] = useState(null);

  // Handlers
  const fire = useCallback(() => {
    setBurst(Date.now());
  }, []);

  const stop = useCallback(() => {
    setBurst(null);
  }, []);

  // Derived State
  const value = useMemo(
    () => ({
      burst,
      fire,
      stop,
    }),
    [burst, fire, stop],
  );

  // Render
  return (
    <ConfettiContext.Provider value={value}>
      {children}
    </ConfettiContext.Provider>
  );
};
