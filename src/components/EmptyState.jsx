/**
 * Component: EmptyState
 * Displays a centred empty state with an illustration and a description.
 * @component
 * @param {Object} props
 * @param {string} props.image - Image filename without extension (resolved from /images/).
 * @param {string} props.description - Text describing the empty state.
 * @returns {JSX.Element}
 */
const EmptyState = ({ image, description }) => {
  // Render
  return (
    <div className="c-empty-state">
      <img
        alt=""
        aria-hidden="true"
        className="c-empty-state__image"
        src={`/images/${image}.png`}
      />
      <p className="c-empty-state__description">{description}</p>
    </div>
  )
}

export default EmptyState
