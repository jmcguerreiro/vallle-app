import { useContext } from "react";

import { ConfettiContext } from "@/contexts/confetti";

/**
 * Hook: useConfetti
 * Provides access to the celebratory confetti burst.
 * Must be used within a ConfettiProvider.
 * @returns {{ burst: number|null, fire: Function, stop: Function }}
 */
export const useConfetti = () => {
  const context = useContext(ConfettiContext);
  if (!context) {
    throw new Error("useConfetti must be used within a ConfettiProvider");
  }
  return context;
};
