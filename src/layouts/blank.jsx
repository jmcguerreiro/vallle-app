import { Outlet } from "react-router-dom";

import Background from "@/layouts/components/Background";

/**
 * Layout: Blank
 * Minimal wrapper with no chrome — used for unauthenticated routes
 * such as login. Renders child routes via <Outlet />.
 * @component
 * @returns {JSX.Element}
 */
const BlankLayout = () => {
  // Render
  return (
    <>
      <div className="s-back-to">Back to Website</div>
      <main className="s-main">
        <Outlet />
      </main>
      <Background />
    </>
  );
};

export default BlankLayout;
