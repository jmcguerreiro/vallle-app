/**
 * Component: FormFields
 * Groups form input fields together within a Form.
 * @component
 * @param {Object} props
 * @param {React.ReactNode} props.children - Input fields
 * @param {string} [props.className] - Additional CSS class
 * @returns {JSX.Element}
 */
const FormFields = ({ children, className = '' }) => (
  <div className={`c-form__fields${className ? ` ${className}` : ''}`}>
    {children}
  </div>
)

export default FormFields
