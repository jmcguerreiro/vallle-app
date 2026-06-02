import { useContext } from "react";

import { ToastContext } from "@/contexts/toast";

/**
 * Hook: useToast
 * Provides access to toast notification state and actions.
 * Must be used within a ToastProvider.
 * @returns {{ toasts: Array<{id: number, message: string, type: string}>, addToast: Function, removeToast: Function }}
 */
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
