import { useCallback } from "react";
import { Link } from "react-router-dom";

import { IconLoader } from "@/utils/icons";

/**
 * Component: Button
 * Flexible button that renders as a <button>, <a>, or react-router <Link>
 * depending on the props provided. Each button type is its own BEM block
 * (c-button-fill, c-button-icon); colour treatments are skin modifiers on
 * the block (e.g. c-button-fill--skin-ghost) to keep modifier chains
 * flat and composable.
 * @component
 * @param {Object} props
 * @param {React.ReactNode} [props.children] - Button label / content
 * @param {'fill'|'icon'} [props.variant='fill'] - Button type block
 * @param {'primary'|'sand'|'ghost'|'danger'} [props.skin='primary'] - Colour skin modifier
 * @param {string} [props.href] - If provided, renders as an <a> tag
 * @param {string} [props.to] - If provided, renders as a react-router <Link>
 * @param {Object} [props.state] - State passed to react-router <Link> (e.g. backgroundLocation)
 * @param {string} [props.type='button'] - Button type attribute (ignored for links)
 * @param {boolean} [props.disabled=false] - Disables the button
 * @param {boolean} [props.isProcessing=false] - Shows a loading spinner and disables interaction
 * @param {React.ElementType} [props.icon] - Lucide icon component rendered before children
 * @param {'inline'|'block'} [props.display='inline'] - Display mode modifier
 * @param {Function} [props.onClick] - Click handler
 * @param {string} [props.ariaLabel] - Accessible label (required for icon-only buttons)
 * @param {string} [props.tooltip] - Tooltip text shown on hover/focus (icon variant only)
 * @returns {JSX.Element}
 */
const Button = ({
  children,
  variant = "fill",
  skin = "primary",
  href,
  to,
  state,
  type = "button",
  disabled = false,
  isProcessing = false,
  icon: Icon,
  display = "inline",
  onClick,
  ariaLabel,
  tooltip,
  ...rest
}) => {
  // Derived State
  const isDisabled = disabled || isProcessing;
  const block = `c-button-${variant}`;

  const classes = [
    block,
    `${block}--skin-${skin}`,
    display !== "inline" && `${block}--display-${display}`,
    isProcessing && `${block}--is-processing`,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {isProcessing ? (
        <IconLoader className={`${block}__icon`} size={20} strokeWidth={1.5} />
      ) : (
        Icon && (
          <Icon className={`${block}__icon`} size={20} strokeWidth={1.5} />
        )
      )}
      {variant !== "icon" && children && (
        <span className={`${block}__label`}>{children}</span>
      )}
      {variant === "icon" && tooltip && (
        <span className={`${block}__tooltip`} role="tooltip">
          {tooltip}
        </span>
      )}
    </>
  );

  // Handlers
  const handleClick = useCallback(
    (event) => {
      if (isDisabled) {
        event.preventDefault();
        return;
      }
      onClick?.(event);
    },
    [isDisabled, onClick],
  );

  // Shared props
  const sharedProps = {
    "aria-label": ariaLabel,
    className: classes,
    ...rest,
  };

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
    );
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
    );
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
  );
};

export default Button;
