/**
 * Component: Card
 * Generic card container with an optional title header and a body region.
 * @component
 * @param {Object} props
 * @param {string} [props.title] - Optional title rendered in the card header.
 * @param {React.ElementType} [props.icon] - Optional icon component rendered next to the title.
 * @param {React.ReactNode} [props.action] - Optional content rendered at the end of the card header (e.g. a control).
 * @param {React.ReactNode} props.children - Content rendered inside the card body.
 * @returns {JSX.Element}
 */
const Card = ({ title, icon: Icon, action, children }) => {
  // Render
  const hasHeader = title || Icon || action;

  return (
    <div className="c-card">
      {hasHeader && (
        <div className="c-card__header">
          {Icon && <Icon className="c-card__header-icon" strokeWidth={1.5} />}
          {title && <h3 className="c-card__header-title">{title}</h3>}
          {action && <div className="c-card__header-action">{action}</div>}
        </div>
      )}
      <div className="c-card__body">{children}</div>
    </div>
  );
};

export default Card;
