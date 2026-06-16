/**
 * Component: Card
 * Generic card container with an optional title header and a body region.
 * @component
 * @param {Object} props
 * @param {string} [props.title] - Optional title rendered in the card header.
 * @param {string} [props.description] - Optional description rendered under the title.
 * @param {React.ElementType} [props.icon] - Optional icon component rendered next to the title.
 * @param {React.ReactNode} [props.action] - Optional content rendered at the end of the card header (e.g. a control).
 * @param {React.ReactNode} props.children - Content rendered inside the card body.
 * @returns {JSX.Element}
 */
const Card = ({ title, description, icon: Icon, action, children }) => {
  // Render
  const hasHeader = title || description || Icon || action;

  return (
    <div className="c-card">
      {hasHeader && (
        <div className="c-card__header">
          {Icon && <Icon className="c-card__header-icon" strokeWidth={1.5} />}
          {(title || description) && (
            <div className="c-card__header-text">
              {title && <h3 className="c-card__header-title">{title}</h3>}
              {description && (
                <p className="c-card__header-description">{description}</p>
              )}
            </div>
          )}
          {action && <div className="c-card__header-action">{action}</div>}
        </div>
      )}
      <div className="c-card__body">{children}</div>
    </div>
  );
};

export default Card;
