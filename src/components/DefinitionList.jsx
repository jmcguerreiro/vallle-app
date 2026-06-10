/**
 * Component: DefinitionList
 * Renders a list of label/value pairs as a semantic <dl>. Each item
 * becomes a field with a <dt> label and a <dd> value.
 * @component
 * @param {Object} props
 * @param {Array<{label: React.ReactNode, value: React.ReactNode}>} props.items - The label/value pairs to render.
 * @param {string} [props.className] - Additional CSS class.
 * @returns {JSX.Element}
 */
const DefinitionList = ({ items, className = "" }) => {
  // Derived State
  const classes = ["c-definition-list", className].filter(Boolean).join(" ");

  // Render
  return (
    <dl className={classes}>
      {items.map(({ label, value }) => (
        <div key={label} className="c-definition-list__field">
          <dt className="c-definition-list__label">{label}</dt>
          <dd className="c-definition-list__value">{value}</dd>
        </div>
      ))}
    </dl>
  );
};

export default DefinitionList;
