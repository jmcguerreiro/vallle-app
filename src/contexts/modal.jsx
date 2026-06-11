import { createContext, useCallback, useMemo, useState } from "react";

export const ModalContext = createContext(null);

/**
 * Provides layout state for the modal content area.
 * Modal pages use the useModal hook to set the header title and actions,
 * which the Modal component reads and renders in its header bar.
 *
 * Actions shape: Array<{ label: string, icon: Component, onClick: Function, skin?: 'primary' | 'sand' | 'ghost' | 'danger', isProcessing?: boolean }>
 * Skin defaults to 'sand' (secondary action); the main CTA passes 'primary'.
 * @component
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @returns {JSX.Element}
 */
export const ModalProvider = ({ children }) => {
  // State
  const [header, setHeaderState] = useState({
    title: "",
    description: "",
    actions: [],
  });

  // Handlers
  const setHeader = useCallback(
    ({ title = "", description = "", actions = [] } = {}) => {
      setHeaderState((prev) => {
        if (
          prev.title === title &&
          prev.description === description &&
          prev.actions === actions
        )
          return prev;
        return { title, description, actions };
      });
    },
    [],
  );

  // Derived State
  const value = useMemo(
    () => ({
      header,
      setHeader,
    }),
    [header, setHeader],
  );

  // Render
  return (
    <ModalContext.Provider value={value}>{children}</ModalContext.Provider>
  );
};
