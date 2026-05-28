/**
 * Component: Badge
 * Small pill-shaped label used to highlight a status or category.
 * Defaults to a neutral muted style; semantic variants colour the
 * background and text to convey success, warning, or danger.
 * @component
 * @param {Object} props
 * @param {React.ReactNode} props.children - The badge content.
 * @param {'success'|'warning'|'danger'} [props.variant] - Semantic variant.
 * @param {string} [props.className] - Additional CSS class.
 * @returns {JSX.Element}
 */
const Badge = ({ children, variant, className = '' }) => {
  // Derived State
  const classes = [
    'c-badge',
    variant ? `c-badge--${variant}` : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  // Render
  return <span className={classes}>{children}</span>
}

export default Badge
