import { Controller } from 'react-hook-form'
import ReactSelect from 'react-select'

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
}) => {
  // Derived State
  const rules = {}

  if (typeof required === 'string') {
    rules.required = required
  } else if (required === true) {
    rules.required = `${label || name} is required`
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
            inputId={name}
            isSearchable={false}
            onChange={(option) => onChange(option?.value)}
            options={options}
            placeholder={placeholder}
            value={options.find((o) => o.value === value) || null}
          />
        )}
        rules={rules}
      />
      {error && <p className="c-form__field-error">{error.message}</p>}
    </div>
  )
}

export default Select
