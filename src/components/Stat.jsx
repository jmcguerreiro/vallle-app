/**
 * Component: Stat
 * Displays a single stat card with a value and a label.
 * @component
 * @param {Object} props
 * @param {string|number} props.value - The stat value to display.
 * @param {string} props.label - The stat label.
 * @returns {JSX.Element}
 */
const Stat = ({ value, label }) => {
  // Render
  return (
    <div className="c-stat">
      <span className="c-stat__value">{value}</span>
      <span className="c-stat__label">{label}</span>
    </div>
  )
}

export default Stat
