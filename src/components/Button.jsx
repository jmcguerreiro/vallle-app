import { useCallback } from 'react'
import { Link } from 'react-router-dom'

import { Loader2 as IconLoader } from 'lucide-react'

/**
 * Component: Button
 * Flexible button that renders as a <button>, <a>, or react-router <Link>
 * depending on the props provided. Each visual style is its own BEM block
 * (c-button-fill, c-button-outline, c-button-ghost, c-button-icon) to keep
 * modifier chains flat and composable.
 * @component
 * @param {Object} props
 * @param {React.ReactNode} [props.children] - Button label / content
 * @param {'fill'|'outline'|'ghost'|'icon'} [props.variant='fill'] - Visual style block
 * @param {'primary'|'secondary'|'danger'} [props.skin='primary'] - Colour skin modifier
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Size modifier
 * @param {string} [props.href] - If provided, renders as an <a> tag
 * @param {string} [props.to] - If provided, renders as a react-router <Link>
 * @param {Object} [props.state] - State passed to react-router <Link> (e.g. backgroundLocation)
 * @param {string} [props.type='button'] - Button type attribute (ignored for links)
 * @param {boolean} [props.disabled=false] - Disables the button
 * @param {boolean} [props.isProcessing=false] - Shows a loading spinner and disables interaction
 * @param {React.ElementType} [props.iconLeft] - Lucide icon component rendered before children
 * @param {React.ElementType} [props.iconRight] - Lucide icon component rendered after children
 * @param {'inline'|'block'} [props.display='inline'] - Display mode modifier
 * @param {boolean} [props.fullWidth=false] - Stretches the button to fill its container
 * @param {string} [props.className] - Additional CSS classes
 * @param {Function} [props.onClick] - Click handler
 * @param {string} [props.ariaLabel] - Accessible label (required for icon-only buttons)
 * @returns {JSX.Element}
 */
const Button = ({
  children,
  variant = 'fill',
  skin = 'primary',
  size = 'md',
  href,
  to,
  state,
  type = 'button',
  disabled = false,
  isProcessing = false,
  iconLeft: IconLeft,
  iconRight: IconRight,
  display = 'inline',
  fullWidth = false,
  className = '',
  onClick,
  ariaLabel,
  ...rest
}) => {
  // Derived State
  const isDisabled = disabled || isProcessing
  const block = `c-button-${variant}`
  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 20 : 16

  const classes = [
    block,
    skin !== 'primary' && `${block}--skin-${skin}`,
    size !== 'md' && `${block}--size-${size}`,
    display !== 'inline' && `${block}--display-${display}`,
    fullWidth && `${block}--full-width`,
    isProcessing && `${block}--is-processing`,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const content = (
    <>
      {isProcessing ? (
        <IconLoader className={`${block}__icon`} size={iconSize} />
      ) : (
        IconLeft && <IconLeft className={`${block}__icon`} size={iconSize} />
      )}
      {variant !== 'icon' && children && (
        <span className={`${block}__label`}>{children}</span>
      )}
      {!isProcessing && IconRight && (
        <IconRight className={`${block}__icon`} size={iconSize} />
      )}
    </>
  )

  // Handlers
  const handleClick = useCallback(
    (event) => {
      if (isDisabled) {
        event.preventDefault()
        return
      }
      onClick?.(event)
    },
    [isDisabled, onClick],
  )

  // Shared props
  const sharedProps = {
    'aria-label': ariaLabel,
    className: classes,
    ...rest,
  }

  // Render
  if (to) {
    return (
      <Link
        aria-disabled={isDisabled || undefined}
        onClick={handleClick}
        state={state}
        tabIndex={isDisabled ? -1 : undefined}
        to={to}
        {...sharedProps}
      >
        {content}
      </Link>
    )
  }

  if (href) {
    return (
      <a
        aria-disabled={isDisabled || undefined}
        href={href}
        onClick={isDisabled ? (e) => e.preventDefault() : onClick}
        rel="noopener noreferrer"
        tabIndex={isDisabled ? -1 : undefined}
        target="_blank"
        {...sharedProps}
      >
        {content}
      </a>
    )
  }

  return (
    <button
      disabled={isDisabled}
      onClick={onClick}
      type={type}
      {...sharedProps}
    >
      {content}
    </button>
  )
}

export default Button
