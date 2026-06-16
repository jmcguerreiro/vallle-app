import { Link } from "react-router-dom";

/**
 * Component: List
 * Generic vertical list container. Wraps a set of `List.Item` children in a
 * `<ul>`. Keeps list markup consistent across features instead of each one
 * styling its own `<ul>`.
 * @component
 * @param {Object} props
 * @param {React.ReactNode} props.children - `List.Item` elements.
 * @param {string} [props.className] - Additional CSS class on the root element.
 * @returns {JSX.Element}
 */
const List = ({ children, className = "" }) => {
  // Render
  return (
    <ul className={`c-list${className ? ` ${className}` : ""}`}>{children}</ul>
  );
};

/**
 * Component: List.Item
 * A single row within a `List`. When `to` is passed the whole row becomes a
 * router `Link` (with optional `state`); otherwise it renders as static content.
 * @component
 * @param {Object} props
 * @param {React.ReactNode} props.children - Row content.
 * @param {string} [props.to] - Destination path; makes the row a link.
 * @param {Object} [props.state] - Router state passed to the link.
 * @param {string} [props.className] - Additional CSS class on the `<li>`.
 * @returns {JSX.Element}
 */
const ListItem = ({ children, to, state, className = "" }) => {
  // Render
  const content = to ? (
    <Link className="c-list__link" state={state} to={to}>
      {children}
    </Link>
  ) : (
    <div className="c-list__content">{children}</div>
  );

  return (
    <li className={`c-list__item${className ? ` ${className}` : ""}`}>
      {content}
    </li>
  );
};

List.Item = ListItem;

export default List;
