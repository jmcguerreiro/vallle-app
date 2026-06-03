import Background from "./components/Background";
import Main from "./components/Main";

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
    <div className="l-blank">
      <Main />
      <Background />
    </div>
  );
};

export default BlankLayout;
