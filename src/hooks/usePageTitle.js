import { useEffect } from "react";

const BASE_TITLE = "Vallle";

/**
 * Hook: usePageTitle
 * Sets the document title for the current page, suffixed with the app name
 * (e.g. "Vouchers · Vallle"). An empty/falsy title is a no-op — the title is
 * left untouched rather than reset — so a parent driving the title off a
 * page-supplied value (MainProvider reading the layout header) never clobbers
 * a title a header-less page set for itself. Call once at the top of a page
 * component's `// Hooks` section.
 * @param {string} [title] - The page-specific title segment.
 * @returns {void}
 */
export const usePageTitle = (title) => {
  // Effects
  useEffect(() => {
    if (title) document.title = `${title} · ${BASE_TITLE}`;
  }, [title]);
};
