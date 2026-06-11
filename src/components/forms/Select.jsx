import { Controller } from "react-hook-form";
import ReactSelect, { components } from "react-select";

import { IconChevronDown } from "@/utils/icons";

/**
 * Component: DropdownIndicator
 * Replaces react-select's default SVG indicator with the Lucide chevron.
 * @component
 * @param {Object} props - react-select indicator props
 * @returns {JSX.Element}
 */
const DropdownIndicator = (props) => (
  <components.DropdownIndicator {...props}>
    <IconChevronDown size={16} />
  </components.DropdownIndicator>
);

/**
 * Component: Select
 * Reusable form select that integrates with react-hook-form via Controller.
 * Renders a react-select dropdown with consistent styling.
 * @component
 * @param {Object} props
 * @param {string} props.name - Field name
 * @param {string} [props.label] - Label text
 * @param {string} [props.placeholder] - Select placeholder
 * @param {Array} props.options - Array of { value, label } objects
 * @param {Object} props.control - react-hook-form's control object
 * @param {boolean|string} [props.required] - Pass true for default message, or a string for custom
 * @param {Object} [props.error] - Field error object from react-hook-form
 * @param {boolean} [props.isSearchable] - Whether the select is searchable. Defaults to false.
 * @param {Function} [props.formatOptionLabel] - Custom renderer for each option label.
 * @returns {JSX.Element}
 */
const Select = ({
  name,
  label,
  placeholder,
  options,
  control,
  required,
  error,
  isSearchable = false,
  formatOptionLabel,
}) => {
  // Derived State
  const rules = {};

  if (typeof required === "string") {
    rules.required = required;
  } else if (required === true) {
    rules.required = `${label || name} is required`;
  }

  // Render
  return (
    <div className="c-form__field">
      {label && (
        <label className="c-form__field-label" htmlFor={name}>
          {label}
        </label>
      )}
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, value, ref } }) => (
          <ReactSelect
            ref={ref}
            classNamePrefix="c-select"
            components={{ DropdownIndicator, IndicatorSeparator: null }}
            formatOptionLabel={formatOptionLabel}
            inputId={name}
            isSearchable={isSearchable}
            onChange={(option) => onChange(option?.value)}
            options={options}
            placeholder={placeholder}
            unstyled
            value={options.find((o) => o.value === value) || null}
          />
        )}
        rules={rules}
      />
      {error && <p className="c-form__field-error">{error.message}</p>}
    </div>
  );
};

export default Select;
