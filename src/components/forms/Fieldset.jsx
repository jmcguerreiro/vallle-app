/**
 * Component: Fieldset
 * Groups related form fields under a legend within a Form.
 * @component
 * @param {Object} props
 * @param {string} props.legend - The fieldset legend text
 * @param {React.ReactNode} props.children - Form fields
 * @param {string} [props.className] - Additional CSS class
 * @returns {JSX.Element}
 */
const Fieldset = ({ legend, children, className = '' }) => (
  <fieldset className={`c-form__fieldset${className ? ` ${className}` : ''}`}>
    <legend className="c-form__fieldset-legend">{legend}</legend>
    {children}
  </fieldset>
)

export default Fieldset
