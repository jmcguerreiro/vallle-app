import { IconChevronDown } from '@/utils/icons'

/**
 * Component: Accordion
 * Collapsible section with a labelled trigger and animated chevron.
 * @component
 * @param {Object} props
 * @param {string} props.title - Header label shown in the trigger row
 * @param {React.ReactNode} props.children - Content revealed when expanded
 * @param {boolean} [props.defaultOpen=false] - Whether the accordion starts open
 * @param {string} [props.className] - Additional CSS class on the root element
 * @returns {JSX.Element}
 */
const Accordion = ({ title, children, defaultOpen = false, className = '' }) => {
  return (
    <details className={`c-accordion${className ? ` ${className}` : ''}`} open={defaultOpen}>
      <summary className="c-accordion__trigger">
        <span className="c-accordion__title">{title}</span>
        <IconChevronDown className="c-accordion__icon" size={16} />
      </summary>
      <div className="c-accordion__body">{children}</div>
    </details>
  )
}

export default Accordion
