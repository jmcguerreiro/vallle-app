/**
 * Component: ButtonGroup
 * Lays out a set of buttons (or button-like elements) with consistent spacing.
 * Control the flow with `direction` (row/column) and the positioning along the
 * main axis with `align`.
 * @component
 * @param {Object} props
 * @param {React.ReactNode} props.children - The buttons to lay out
 * @param {'row'|'column'} [props.direction='row'] - Flow direction
 * @param {'start'|'center'|'end'|'between'} [props.align='start'] - Alignment along the main axis
 * @returns {JSX.Element}
 */
const ButtonGroup = ({ children, direction = "row", align = "start" }) => {
  // Derived State
  const classes = [
    "c-button-group",
    direction !== "row" && `c-button-group--direction-${direction}`,
    align !== "start" && `c-button-group--align-${align}`,
  ]
    .filter(Boolean)
    .join(" ");

  // Render
  return <div className={classes}>{children}</div>;
};

export default ButtonGroup;
