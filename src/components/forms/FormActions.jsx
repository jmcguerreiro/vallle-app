/**
 * Component: FormActions
 * Groups form action buttons (submit, cancel, etc.) together within a Form.
 * @component
 * @param {Object} props
 * @param {React.ReactNode} props.children - Action buttons
 * @param {string} [props.className] - Additional CSS class
 * @returns {JSX.Element}
 */
const FormActions = ({ children, className = '' }) => (
  <div className={`c-form__actions${className ? ` ${className}` : ''}`}>
    {children}
  </div>
)

export default FormActions
