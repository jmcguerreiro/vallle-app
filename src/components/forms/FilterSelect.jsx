import { ChevronDown } from 'lucide-react'

/**
 * Component: FilterSelect
 * Native <select> wrapped with a lucide ChevronDown indicator.
 * Designed for the Datatable toolbar `filters` slot, but reusable anywhere
 * a lightweight, dependency-free dropdown is needed.
 * @component
 * @param {Object} props
 * @param {string} props.value - Current selected value
 * @param {Function} props.onChange - Native change handler, receives the change event
 * @param {Array<{value: string, label: string}>} props.options - Option list
 * @param {string} [props.ariaLabel] - Accessible label for the select
 * @param {string} [props.className] - Additional CSS class on the wrapper
 * @returns {JSX.Element}
 */
const FilterSelect = ({ value, onChange, options, ariaLabel, className = '' }) => {
  // Render
  return (
    <div className={`c-filter-select${className ? ` ${className}` : ''}`}>
      <select
        aria-label={ariaLabel}
        className="c-filter-select__select"
        onChange={onChange}
        value={value}
      >
        {options.map(({ value: optionValue, label }) => (
          <option key={optionValue} value={optionValue}>
            {label}
          </option>
        ))}
      </select>
      <ChevronDown className="c-filter-select__icon" size={14} />
    </div>
  )
}

export default FilterSelect
