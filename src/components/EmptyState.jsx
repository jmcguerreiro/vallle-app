import Button from "@/components/Button";

/**
 * Component: EmptyState
 * Displays a centred empty state with an illustration, a description, and an optional action button.
 * @component
 * @param {Object} props
 * @param {string} props.image - Image filename without extension (resolved from /images/empty-states/).
 * @param {string} props.description - Text describing the empty state.
 * @param {Object} [props.action] - Optional action rendered as a full-width fill button.
 * @param {string} props.action.text - Button label.
 * @param {Function} [props.action.onClick] - Click handler.
 * @param {string} [props.action.to] - React-router target. Renders the button as a Link.
 * @param {Object} [props.action.state] - State passed to react-router Link (e.g. backgroundLocation).
 * @param {string} [props.action.href] - External href. Renders the button as an anchor.
 * @returns {JSX.Element}
 */
const EmptyState = ({ image, description, action }) => {
  // Render
  return (
    <div className="c-empty-state">
      <img
        alt=""
        aria-hidden="true"
        className="c-empty-state__image"
        src={`/images/empty-states/${image}.svg`}
      />
      <div className="c-empty-state__description">{description}</div>
      {action && (
        <div className="c-empty-state__action">
          <Button
            display="block"
            href={action.href}
            onClick={action.onClick}
            state={action.state}
            to={action.to}
            variant="fill"
          >
            {action.text}
          </Button>
        </div>
      )}
    </div>
  );
};

export default EmptyState;
