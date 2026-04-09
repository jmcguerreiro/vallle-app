import { Controller } from 'react-hook-form'

/**
 * Component: ImagePicker
 * A scrollable grid of images for the user to pick one.
 * Integrates with react-hook-form via Controller.
 * @component
 * @param {Object} props
 * @param {string} props.name - Field name
 * @param {string} [props.label] - Label text
 * @param {Array} props.images - Array of { value, src, alt } objects
 * @param {Object} props.control - react-hook-form's control object
 * @param {boolean|string} [props.required] - Pass true for default message, or a string for custom
 * @param {Object} [props.error] - Field error object from react-hook-form
 * @returns {JSX.Element}
 */
const ImagePicker = ({
  name,
  label,
  images,
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
        <label className="c-form__field-label">{label}</label>
      )}
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, value } }) => (
          <div className="c-image-picker">
            {images.map((image) => (
              <button
                key={image.value}
                aria-label={image.alt}
                aria-pressed={value === image.value}
                className={`c-image-picker__item${value === image.value ? ' c-image-picker__item--selected' : ''}`}
                onClick={() => onChange(image.value)}
                type="button"
              >
                <img
                  alt={image.alt}
                  className="c-image-picker__img"
                  src={image.src}
                />
              </button>
            ))}
          </div>
        )}
        rules={rules}
      />
      {error && <p className="c-form__field-error">{error.message}</p>}
    </div>
  )
}

export default ImagePicker
