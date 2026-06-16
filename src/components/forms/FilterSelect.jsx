import { IconChevronDown } from "@/utils/icons";

/**
 * Component: FilterSelect
 * Native <select> wrapped with a lucide ChevronDown indicator.
 * Designed for the Datatable toolbar `filters` slot.
 * @component
 * @param {Object} props
 * @param {string} props.value - Current selected value
 * @param {Function} props.onChange - Native change handler, receives the change event
 * @param {Array<{value: string, label: string}>} props.options - Option list
 * @param {string} [props.ariaLabel] - Accessible label for the select
 * @returns {JSX.Element}
 */
const FilterSelect = ({ value, onChange, options, ariaLabel }) => {
  // Derived State
  const fieldId = `filter-${(ariaLabel || "select")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/(^-|-$)/g, "")}`;

  // Render
  return (
    <div className="c-datatable__filter">
      <select
        aria-label={ariaLabel}
        className="c-datatable__filter-select"
        id={fieldId}
        name={fieldId}
        onChange={onChange}
        value={value}
      >
        {options.map(({ value: optionValue, label }) => (
          <option key={optionValue} value={optionValue}>
            {label}
          </option>
        ))}
      </select>
      <IconChevronDown className="c-datatable__filter-icon" size={16} />
    </div>
  );
};

export default FilterSelect;
