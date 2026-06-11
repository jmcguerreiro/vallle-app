import { useCallback, useEffect, useRef, useState } from "react";
import ReactConfetti from "react-confetti";

import { EVENTS } from "@/constants/events";
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
 * in the top layer) and the Vaul drawer (a high-z-index portal). Top-layer
 * order is insertion order, so the canvas re-promotes whenever a modal opens
 * (EVENTS.MODAL_OPENED) — e.g. router navigations commit in a transition after
 * the burst fired, and the freshly shown dialog would otherwise cover it.
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

    const promote = () => {
      const canvas = canvasRef.current;
      if (typeof canvas?.showPopover !== "function") return;
      try {
        if (canvas.matches(":popover-open")) canvas.hidePopover();
        canvas.showPopover();
      } catch {
        // Popover API unsupported or the canvas is gone — the confetti still
        // renders, just not promoted into the top layer.
      }
    };

    promote();
    // A modal opened mid-burst (e.g. create → success → navigate to view)
    // enters the top layer above the canvas — re-promote then too.
    globalThis.addEventListener(EVENTS.MODAL_OPENED, promote);
    return () => globalThis.removeEventListener(EVENTS.MODAL_OPENED, promote);
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
