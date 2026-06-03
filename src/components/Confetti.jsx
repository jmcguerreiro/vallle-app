import { useCallback, useEffect, useRef, useState } from "react";
import ReactConfetti from "react-confetti";

import { useConfetti } from "@/hooks/useConfetti";

/**
 * Vallle brand palette — fed into react-confetti's `colors` array so the burst
 * matches the app's design tokens (see CLAUDE.md §10).
 */
const CONFETTI_COLORS = ["#C4653A", "#2c2520", "#7A9B76", "#E8DDD3", "#D4A574"];

/**
 * Component: Confetti
 * Renders a one-off celebratory confetti burst in a fixed, full-window overlay
 * using the Vallle brand palette. Driven by the ConfettiProvider — fires when
 * `burst` changes and removes itself once the animation completes.
 *
 * The canvas is promoted into the browser top layer via the Popover API so it
 * paints above everything — including native `<dialog>` modals (which also live
 * in the top layer) and the Vaul drawer (a high-z-index portal). `showPopover()`
 * runs in a passive effect, which React flushes after the modal/drawer's own
 * mount effects, so the confetti is promoted last and always sits on top.
 * @component
 * @returns {JSX.Element|null}
 */
const Confetti = () => {
  // Hooks
  const { burst, stop } = useConfetti();

  // State
  const [size, setSize] = useState({
    width: globalThis.window === undefined ? 0 : window.innerWidth,
    height: globalThis.window === undefined ? 0 : window.innerHeight,
  });

  // Refs
  const canvasRef = useRef(null);

  // Handlers
  const handleComplete = useCallback(() => {
    stop();
  }, [stop]);

  // Effects
  useEffect(() => {
    const handleResize = () => {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!burst) return;
    const canvas = canvasRef.current;
    if (typeof canvas?.showPopover === "function") {
      try {
        canvas.showPopover();
      } catch {
        // Already shown, or the Popover API is unsupported — the confetti still
        // renders, just not promoted into the top layer.
      }
    }
  }, [burst]);

  // Render
  if (!burst) return null;

  return (
    <ReactConfetti
      key={burst}
      canvasRef={canvasRef}
      className="c-confetti"
      colors={CONFETTI_COLORS}
      height={size.height}
      onConfettiComplete={handleComplete}
      popover="manual"
      recycle={false}
      width={size.width}
    />
  );
};

export default Confetti;
