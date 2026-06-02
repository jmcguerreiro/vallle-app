import { NavLink } from "react-router-dom";

/**
 * Component: Tabs
 * Route-driven tabbed view. Renders a row of NavLink tabs and the panel
 * beneath them; the active tab is derived from the current route and its
 * content is passed in as children (typically a router <Outlet />).
 * @component
 * @param {Object} props
 * @param {Array<{ to: string, label: string, end?: boolean }>} props.tabs - Tab definitions
 * @param {React.ReactNode} props.children - Active tab panel content
 * @param {string} [props.className] - Additional CSS class on the root element
 * @returns {JSX.Element}
 */
const Tabs = ({ tabs, children, className = "" }) => {
  return (
    <div className={`c-tabs${className ? ` ${className}` : ""}`}>
      <nav className="c-tabs__list" role="tablist">
        {tabs.map(({ to, label, end = true }) => (
          <NavLink
            key={to}
            className={({ isActive }) =>
              `c-tabs__tab${isActive ? " is-active" : ""}`
            }
            end={end}
            role="tab"
            to={to}
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="c-tabs__panel" role="tabpanel">
        {children}
      </div>
    </div>
  );
};

export default Tabs;
