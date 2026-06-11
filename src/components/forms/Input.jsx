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
 * @param {string} [props.inputMode] - HTML inputmode attribute (e.g. 'decimal')
 * @param {boolean} [props.multiline=false] - Renders a <textarea> instead of an <input>
 * @param {number} [props.rows=3] - Visible rows when multiline
 * @param {Function} props.register - react-hook-form's register function
 * @param {boolean|string} [props.required] - Pass true for default message, or a string for custom
 * @param {Object} [props.validate] - Custom validate rules for react-hook-form
 * @param {Object} [props.error] - Field error object from react-hook-form
 * @param {string} [props.autoComplete] - HTML autocomplete attribute
 * @param {string} [props.hint] - Help text displayed below the input
 * @param {boolean} [props.readOnly=false] - Makes the input read-only
 * @returns {JSX.Element}
 */
const Input = ({
  name,
  label,
  hideLabel = false,
  placeholder,
  type = "text",
  inputMode,
  multiline = false,
  rows = 3,
  register,
  required,
  validate,
  error,
  autoComplete,
  hint,
  readOnly = false,
}) => {
  // Derived State
  const rules = {};

  if (typeof required === "string") {
    rules.required = required;
  } else if (required === true) {
    rules.required = `${label || name} is required`;
  }

  if (validate) {
    rules.validate = validate;
  }

  // Render
  return (
    <div className="c-form__field">
      {label && (
        <label
          className={`c-form__field-label${hideLabel ? " u-sr-only" : ""}`}
          htmlFor={name}
        >
          {label}
        </label>
      )}
      {multiline ? (
        <textarea
          autoComplete={autoComplete}
          className={`c-form__field-input c-form__field-input--textarea${error ? " c-form__field-input--error" : ""}${readOnly ? " c-form__field-input--readonly" : ""}`}
          id={name}
          placeholder={placeholder}
          readOnly={readOnly}
          rows={rows}
          {...register(name, rules)}
        />
      ) : (
        <input
          autoComplete={autoComplete}
          className={`c-form__field-input${error ? " c-form__field-input--error" : ""}${readOnly ? " c-form__field-input--readonly" : ""}`}
          id={name}
          inputMode={inputMode}
          placeholder={placeholder}
          readOnly={readOnly}
          type={type}
          {...register(name, rules)}
        />
      )}
      {hint && !error && <p className="c-form__field-hint">{hint}</p>}
      {error && <p className="c-form__field-error">{error.message}</p>}
    </div>
  );
};

export default Input;
