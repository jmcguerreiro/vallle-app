import { CircleAlert as IconCircleAlert } from "lucide-react";

/**
 * Component: Form
 * Thin wrapper around <form> that connects to react-hook-form's handleSubmit.
 * Renders a server/global error when present.
 * @component
 * @param {Object} props
 * @param {React.ReactNode} props.children - Form fields
 * @param {Function} props.onSubmit - Called with form values on valid submission
 * @param {Function} props.handleSubmit - react-hook-form's handleSubmit
 * @param {string} [props.error] - Server/global error message
 * @param {string} [props.className] - Additional CSS class
 * @returns {JSX.Element}
 */
const Form = ({ children, onSubmit, handleSubmit, error, className = "" }) => (
  <form
    className={`c-form${className ? ` ${className}` : ""}`}
    noValidate
    onSubmit={handleSubmit(onSubmit)}
  >
    {error && <div className="c-form__error">{error}</div>}
    {children}
  </form>
);

export default Form;
