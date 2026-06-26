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
 * Component: MultiSelect
 * Reusable multi-value form select integrated with react-hook-form via
 * Controller. Stores the selection as an array of option values. Built on
 * react-select with the same styling hooks as the single Select.
 * @component
 * @param {Object} props
 * @param {string} props.name - Field name
 * @param {string} [props.label] - Label text
 * @param {string} [props.placeholder] - Select placeholder
 * @param {Array} props.options - Array of { value, label } objects
 * @param {Object} props.control - react-hook-form's control object
 * @param {boolean|string} [props.required] - Pass true for default message, or a string for custom
 * @param {Object} [props.error] - Field error object from react-hook-form
 * @param {boolean} [props.isSearchable=true] - Whether the select is searchable
 * @param {boolean} [props.disabled=false] - Whether the select is disabled
 * @param {string} [props.hint] - Optional helper text shown under the field
 * @returns {JSX.Element}
 */
const MultiSelect = ({
  name,
  label,
  placeholder,
  options,
  control,
  required,
  error,
  isSearchable = true,
  disabled = false,
  hint,
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
            closeMenuOnSelect={false}
            components={{ DropdownIndicator, IndicatorSeparator: null }}
            inputId={name}
            isDisabled={disabled}
            isMulti
            isSearchable={isSearchable}
            onChange={(selected) =>
              onChange((selected || []).map((o) => o.value))
            }
            options={options}
            placeholder={placeholder}
            unstyled
            value={options.filter((o) => (value || []).includes(o.value))}
          />
        )}
        rules={rules}
      />
      {hint && !error && <p className="c-form__field-hint">{hint}</p>}
      {error && <p className="c-form__field-error">{error.message}</p>}
    </div>
  );
};

export default MultiSelect;
