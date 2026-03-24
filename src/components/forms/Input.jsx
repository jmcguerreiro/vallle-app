/**
 * Component: Input
 * Reusable form input that integrates with react-hook-form's register.
 * @component
 * @param {Object} props
 * @param {string} props.name - Field name (used for register + htmlFor)
 * @param {string} [props.label] - Visible label text. When hidden, pass hideLabel to visually hide it while keeping it accessible for screen readers.
 * @param {boolean} [props.hideLabel=false] - Visually hides the label (sr-only) while keeping it accessible
 * @param {string} [props.placeholder] - Input placeholder
 * @param {string} [props.type='text'] - Input type (text, email, password, etc.)
 * @param {Function} props.register - react-hook-form's register function
 * @param {boolean|string} [props.required] - Pass true for default message, or a string for custom
 * @param {Object} [props.validate] - Custom validate rules for react-hook-form
 * @param {Object} [props.error] - Field error object from react-hook-form
 * @param {string} [props.autoComplete] - HTML autocomplete attribute
 * @returns {JSX.Element}
 */
const Input = ({
  name,
  label,
  hideLabel = false,
  placeholder,
  type = 'text',
  register,
  required,
  validate,
  error,
  autoComplete,
}) => {
  // Derived State
  const rules = {}

  if (typeof required === 'string') {
    rules.required = required
  } else if (required === true) {
    rules.required = `${label || name} is required`
  }

  if (validate) {
    rules.validate = validate
  }

  // Render
  return (
    <div className="c-form__field">
      {label && (
        <label
          className={`c-form__field-label${hideLabel ? ' u-sr-only' : ''}`}
          htmlFor={name}
        >
          {label}
        </label>
      )}
      <input
        autoComplete={autoComplete}
        className={`c-form__field-input${error ? ' c-form__field-input--error' : ''}`}
        id={name}
        placeholder={placeholder}
        type={type}
        {...register(name, rules)}
      />
      {error && <p className="c-form__field-error">{error.message}</p>}
    </div>
  )
}

export default Input
