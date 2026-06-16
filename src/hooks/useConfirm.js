import { useContext } from "react";

import { ConfirmContext } from "@/contexts/confirm";

/**
 * Hook: useConfirm
 * Provides access to the confirmation prompt. Call `confirm(options)` to open a
 * branded dialog and await the user's choice — it resolves to `true` (confirmed)
 * or `false` (cancelled). Must be used within a ConfirmProvider.
 * @returns {{ request: Object|null, confirm: Function, resolve: Function }}
 */
export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context;
};
