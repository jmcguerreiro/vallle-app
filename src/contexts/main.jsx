import { createContext, useCallback, useMemo, useState } from "react";

import { usePageTitle } from "@/hooks/usePageTitle";

export const MainContext = createContext(null);

/**
 * Provides layout state for the main content area.
 * Pages use the useMain hook to set the header title, description, and image,
 * which the DefaultLayout reads and renders in the layout header bar.
 * @component
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @returns {JSX.Element}
 */
export const MainProvider = ({ children }) => {
  // State
  const [header, setHeaderState] = useState({
    title: "",
    description: "",
    image: "",
    actions: [],
  });

  // Handlers
  const setHeader = useCallback(
    ({ title = "", description = "", image = "", actions = [] } = {}) => {
      setHeaderState((prev) => {
        if (
          prev.title === title &&
          prev.description === description &&
          prev.image === image &&
          prev.actions === actions
        )
          return prev;
        return { title, description, image, actions };
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

  // Effects
  // Drive the tab title from the active page's header title. Header-less pages
  // (auth screens, the user dashboard) leave this empty and set their own title
  // via usePageTitle, which is why the empty case here is a no-op.
  usePageTitle(header.title);

  // Render
  return <MainContext.Provider value={value}>{children}</MainContext.Provider>;
};
