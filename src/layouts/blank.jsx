import { Outlet, useLocation } from "react-router-dom";

import { ROUTES } from "@/constants/routes";
import Background from "@/layouts/components/Background";
import BackTo from "@/layouts/components/BackTo";

/**
 * Layout: Blank
 * Minimal wrapper with no chrome — used for unauthenticated routes
 * such as login. Renders child routes via <Outlet />.
 * @component
 * @returns {JSX.Element}
 */
const BlankLayout = () => {
  // Hooks
  const location = useLocation();

  // Derived State
  const showBackTo = location.pathname === ROUTES.LOGIN;

  // Render
  return (
    <>
      {showBackTo && <BackTo />}
      <main className="s-main">
        <Outlet />
      </main>
      <Background />
    </>
  );
};

export default BlankLayout;
